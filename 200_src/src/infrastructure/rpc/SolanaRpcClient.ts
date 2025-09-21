import {
  Connection,
  PublicKey,
  GetProgramAccountsFilter
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, AccountLayout } from '@solana/spl-token';
import { NetworkError, TimeoutError } from '../../domain/errors';
import { TokenHolder, NetworkType } from '../../domain/models';
import { getParameters } from '../../config/parameters';

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
    const params = getParameters();
    const rpcUrl = options.rpcUrl || this.getDefaultRpcUrl(options.network);

    this.connection = new Connection(rpcUrl, {
      commitment: params.network.commitment,
      confirmTransactionInitialTimeout: options.timeout || params.network.confirmationTimeout
    });
    this.timeout = options.timeout || params.network.timeout;
    this.maxRetries = options.maxRetries || params.network.maxRetries;
    this.retryDelay = options.retryDelay || params.network.retryDelay;
  }

  private getDefaultRpcUrl(network: NetworkType): string {
    const params = getParameters();

    switch (network) {
      case 'devnet':
        return params.rpc.endpoints.devnet;
      case 'testnet':
        return params.rpc.endpoints.testnet;
      case 'mainnet-beta':
        return params.rpc.endpoints['mainnet-beta'];
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
    // Try to detect which token program this token uses
    const tokenProgram = await this.detectTokenProgram(tokenMintAddress);

    if (tokenProgram.equals(TOKEN_2022_PROGRAM_ID)) {
      // Use alternative method for Token 2022
      return this.fetchToken2022Holders(tokenMintAddress, threshold);
    }

    // Standard SPL Token method
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

    // Get actual token decimals instead of assuming 9
    const decimals = await this.getTokenDecimals(tokenMintAddress);

    for (const account of accounts) {
      try {
        const accountData = AccountLayout.decode(account.account.data);
        const balance = Number(accountData.amount) / Math.pow(10, decimals);

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
      return accountInfo !== null && (
        accountInfo.owner.equals(TOKEN_PROGRAM_ID) ||
        accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)
      );
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

  private async detectTokenProgram(tokenMintAddress: PublicKey): Promise<PublicKey> {
    try {
      const accountInfo = await this.withTimeout(
        this.connection.getAccountInfo(tokenMintAddress),
        this.timeout
      );

      if (accountInfo?.owner.equals(TOKEN_2022_PROGRAM_ID)) {
        return TOKEN_2022_PROGRAM_ID;
      }

      return TOKEN_PROGRAM_ID;
    } catch {
      return TOKEN_PROGRAM_ID;
    }
  }

  private async fetchToken2022Holders(
    tokenMintAddress: PublicKey,
    threshold: number
  ): Promise<TokenHolder[]> {
    try {
      // Use getTokenLargestAccounts for Token 2022 since getProgramAccounts is excluded from secondary indexes
      const largestAccounts = await this.withTimeout(
        this.connection.getTokenLargestAccounts(tokenMintAddress),
        this.timeout
      );

      const holders: TokenHolder[] = [];
      const decimals = await this.getTokenDecimals(tokenMintAddress);

      for (const account of largestAccounts.value) {
        const balance = Number(account.amount) / Math.pow(10, decimals);

        if (balance >= threshold) {
          // Get account info to find the owner
          const accountInfo = await this.withTimeout(
            this.connection.getAccountInfo(account.address),
            this.timeout
          );

          if (accountInfo) {
            try {
              const accountData = AccountLayout.decode(accountInfo.data);
              holders.push({
                address: new PublicKey(accountData.owner),
                balance,
                percentage: 0 // Will be calculated later
              });
            } catch (error) {
              console.warn(`Failed to decode Token 2022 account ${account.address.toString()}: ${error}`);
            }
          }
        }
      }

      // Calculate percentages
      const totalSupply = holders.reduce((sum, holder) => sum + holder.balance, 0);
      holders.forEach(holder => {
        holder.percentage = totalSupply > 0 ? (holder.balance / totalSupply) * 100 : 0;
      });

      return holders.sort((a, b) => b.balance - a.balance);
    } catch (error) {
      console.warn(`Token 2022 holder fetch failed, falling back to transaction history method: ${error}`);
      return this.fetchToken2022HoldersByTransactions(tokenMintAddress, threshold);
    }
  }

  private async fetchToken2022HoldersByTransactions(
    tokenMintAddress: PublicKey,
    threshold: number
  ): Promise<TokenHolder[]> {
    try {
      // Get recent signatures for the token mint
      const signatures = await this.withTimeout(
        this.connection.getSignaturesForAddress(tokenMintAddress, { limit: 1000 }),
        this.timeout
      );

      const holderMap = new Map<string, number>();
      const decimals = await this.getTokenDecimals(tokenMintAddress);

      // Process transactions to find token transfers
      for (const sigInfo of signatures) {
        try {
          const transaction = await this.withTimeout(
            this.connection.getTransaction(sigInfo.signature, {
              maxSupportedTransactionVersion: 0
            }),
            this.timeout
          );

          if (transaction?.meta?.postTokenBalances) {
            for (const balance of transaction.meta.postTokenBalances) {
              if (balance.mint === tokenMintAddress.toString() && balance.owner) {
                const amount = Number(balance.uiTokenAmount.amount) / Math.pow(10, decimals);
                if (amount > 0) {
                  holderMap.set(balance.owner, Math.max(holderMap.get(balance.owner) || 0, amount));
                }
              }
            }
          }
        } catch (error) {
          console.warn(`Failed to process transaction ${sigInfo.signature}: ${error}`);
        }
      }

      // Convert to TokenHolder array
      const holders: TokenHolder[] = [];
      for (const [ownerAddress, balance] of holderMap.entries()) {
        if (balance >= threshold) {
          holders.push({
            address: new PublicKey(ownerAddress),
            balance,
            percentage: 0 // Will be calculated later
          });
        }
      }

      // Calculate percentages
      const totalSupply = holders.reduce((sum, holder) => sum + holder.balance, 0);
      holders.forEach(holder => {
        holder.percentage = totalSupply > 0 ? (holder.balance / totalSupply) * 100 : 0;
      });

      return holders.sort((a, b) => b.balance - a.balance);
    } catch (error) {
      console.warn(`Token 2022 transaction-based holder fetch failed: ${error}`);
      return [];
    }
  }
}