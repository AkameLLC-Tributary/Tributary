import {
  Connection,
  PublicKey,
  GetProgramAccountsFilter
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, AccountLayout } from '@solana/spl-token';
import { NetworkError, TimeoutError } from '../../domain/errors';
import { TokenHolder, NetworkType } from '../../domain/models';

export interface SolanaRpcClientOptions {
  network: NetworkType;
  rpcUrl?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export class SolanaRpcClient {
  private connection: Connection;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  constructor(options: SolanaRpcClientOptions) {
    const rpcUrl = options.rpcUrl || this.getDefaultRpcUrl(options.network);
    this.connection = new Connection(rpcUrl, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: options.timeout || 60000
    });
    this.timeout = options.timeout || 30000;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
  }

  private getDefaultRpcUrl(network: NetworkType): string {
    switch (network) {
      case 'devnet':
        return 'https://api.devnet.solana.com';
      case 'testnet':
        return 'https://api.testnet.solana.com';
      case 'mainnet-beta':
        return 'https://api.mainnet-beta.solana.com';
      default:
        throw new NetworkError(`Unknown network: ${network}`);
    }
  }

  public async getTokenHolders(
    tokenMintAddress: PublicKey,
    threshold = 0
  ): Promise<TokenHolder[]> {
    try {
      return await this.withTimeout(
        this.fetchTokenHolders(tokenMintAddress, threshold),
        this.timeout
      );
    } catch (error) {
      if (error instanceof Error) {
        throw new NetworkError(
          `Failed to fetch token holders: ${error.message}`,
          { tokenMint: tokenMintAddress.toString(), threshold }
        );
      }
      throw error;
    }
  }

  private async fetchTokenHolders(
    tokenMintAddress: PublicKey,
    threshold: number
  ): Promise<TokenHolder[]> {
    const filters: GetProgramAccountsFilter[] = [
      {
        dataSize: AccountLayout.span
      },
      {
        memcmp: {
          offset: AccountLayout.offsetOf('mint') || 0,
          bytes: tokenMintAddress.toBase58()
        }
      }
    ];

    const accounts = await this.connection.getProgramAccounts(
      TOKEN_PROGRAM_ID,
      { filters }
    );

    const holders: TokenHolder[] = [];

    for (const account of accounts) {
      try {
        const accountData = AccountLayout.decode(account.account.data);
        const balance = Number(accountData.amount) / Math.pow(10, 9); // Assuming 9 decimals

        if (balance >= threshold) {
          holders.push({
            address: new PublicKey(accountData.owner),
            balance,
            percentage: 0 // Will be calculated later with total supply
          });
        }
      } catch (error) {
        console.warn(`Failed to decode account ${account.pubkey.toString()}: ${error}`);
      }
    }

    // Calculate percentages
    const totalSupply = holders.reduce((sum, holder) => sum + holder.balance, 0);
    holders.forEach(holder => {
      holder.percentage = (holder.balance / totalSupply) * 100;
    });

    return holders.sort((a, b) => b.balance - a.balance);
  }

  public async getTokenSupply(tokenMintAddress: PublicKey): Promise<number> {
    try {
      const supply = await this.withTimeout(
        this.connection.getTokenSupply(tokenMintAddress),
        this.timeout
      );
      return Number(supply.value.amount) / Math.pow(10, supply.value.decimals);
    } catch (error) {
      if (error instanceof Error) {
        throw new NetworkError(
          `Failed to fetch token supply: ${error.message}`,
          { tokenMint: tokenMintAddress.toString() }
        );
      }
      throw error;
    }
  }

  public async getTokenDecimals(tokenMintAddress: PublicKey): Promise<number> {
    try {
      const supply = await this.withTimeout(
        this.connection.getTokenSupply(tokenMintAddress),
        this.timeout
      );
      return supply.value.decimals;
    } catch (error) {
      if (error instanceof Error) {
        throw new NetworkError(
          `Failed to fetch token decimals: ${error.message}`,
          { tokenMint: tokenMintAddress.toString() }
        );
      }
      throw error;
    }
  }

  public async validateTokenAddress(tokenAddress: PublicKey): Promise<boolean> {
    try {
      const accountInfo = await this.withTimeout(
        this.connection.getAccountInfo(tokenAddress),
        this.timeout
      );
      return accountInfo !== null && accountInfo.owner.equals(TOKEN_PROGRAM_ID);
    } catch {
      return false;
    }
  }

  public async validateWalletAddress(walletAddress: PublicKey): Promise<boolean> {
    try {
      const accountInfo = await this.withTimeout(
        this.connection.getAccountInfo(walletAddress),
        this.timeout
      );
      return accountInfo !== null;
    } catch {
      return false;
    }
  }

  public getConnection(): Connection {
    return this.connection;
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new TimeoutError(`Operation timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      })
    ]);
  }

  public async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries = this.maxRetries
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === maxRetries) {
          throw new NetworkError(
            `Operation failed after ${maxRetries + 1} attempts: ${lastError.message}`,
            { attempts: attempt + 1, lastError: lastError.message }
          );
        }

        await this.delay(this.retryDelay * Math.pow(2, attempt));
      }
    }

    throw lastError!;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}