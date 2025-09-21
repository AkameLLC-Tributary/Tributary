import { PublicKey, Keypair, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';

// Tributaryの実際のクラスを使用
import { SolanaRpcClient } from './src/infrastructure/rpc/SolanaRpcClient';
import { Logger } from './src/infrastructure/logging/Logger';

// Tributaryの型定義を使用
interface TokenHolder {
  address: PublicKey;
  balance: number;
  percentage: number;
}

type DistributionMode = 'equal' | 'proportional';

interface DistributionRequest {
  amount: number;
  tokenAddress: PublicKey;
  holders: TokenHolder[];
  mode?: DistributionMode;
  excludeAddresses?: PublicKey[];
  batchSize?: number;
  minimumAmount?: number;
}

interface DistributionResult {
  transactionId: string;
  status: 'pending' | 'confirmed' | 'failed';
  recipient: PublicKey;
  amount: number;
  timestamp: Date;
  error?: string;
}

class TestDistributionServiceWithRpcClient {
  private rpcClient: SolanaRpcClient;
  private adminKeypair: Keypair;
  private logger: Logger;

  constructor(network: 'testnet' | 'devnet' | 'mainnet-beta', adminKeypair: Keypair) {
    this.adminKeypair = adminKeypair;

    // TributaryのSolanaRpcClientを初期化
    this.rpcClient = new SolanaRpcClient({
      network,
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000
    });

    // Tributaryのloggerを初期化
    this.logger = new Logger('DistributionService', {
      level: 'info',
      enableConsole: true,
      enableFile: false // テスト用でファイル出力は無効
    });

    this.logger.info('DistributionService initialized', {
      adminWallet: this.adminKeypair.publicKey.toString(),
      network,
      keypairType: typeof this.adminKeypair,
      publicKeyType: typeof this.adminKeypair.publicKey,
      hasToBuffer: typeof this.adminKeypair.publicKey.toBuffer
    });
  }

  private async detectTokenProgram(tokenAddress: PublicKey): Promise<PublicKey> {
    try {
      this.logger.debug('Detecting token program', { tokenAddress: tokenAddress.toString() });

      const connection = this.rpcClient.getConnection();
      const mintInfo = await connection.getAccountInfo(tokenAddress);
      if (!mintInfo) {
        throw new Error(`Token mint ${tokenAddress.toString()} not found`);
      }

      // Tributaryと同じ方法
      const ownerPubkey = new PublicKey(mintInfo.owner);
      if (ownerPubkey.equals(TOKEN_2022_PROGRAM_ID)) {
        this.logger.info('Detected Token 2022', { tokenAddress: tokenAddress.toString() });
        return TOKEN_2022_PROGRAM_ID;
      }

      this.logger.info('Detected Standard Token', { tokenAddress: tokenAddress.toString() });
      return TOKEN_PROGRAM_ID;
    } catch (error) {
      this.logger.warn('Failed to detect token program, defaulting to standard token', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tokenAddress: tokenAddress.toString()
      });
      return TOKEN_PROGRAM_ID;
    }
  }

  private async getTokenDecimals(tokenAddress: PublicKey): Promise<number> {
    try {
      const decimals = await this.rpcClient.getTokenDecimals(tokenAddress);
      this.logger.debug('Token decimals retrieved', { tokenAddress: tokenAddress.toString(), decimals });
      return decimals;
    } catch (error) {
      this.logger.warn('Error getting token decimals', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tokenAddress: tokenAddress.toString()
      });
      return 9;
    }
  }

  private calculateDistributionAmounts(
    holders: TokenHolder[],
    totalAmount: number,
    mode: DistributionMode = 'proportional',
    minimumAmount: number = 0
  ): Map<string, number> {
    this.logger.debug('Calculating distribution amounts', {
      holdersCount: holders.length,
      totalAmount,
      mode,
      minimumAmount
    });

    const amounts = new Map<string, number>();

    if (mode === 'equal') {
      const amountPerHolder = totalAmount / holders.length;
      holders.forEach(holder => {
        if (amountPerHolder >= minimumAmount) {
          amounts.set(holder.address.toString(), amountPerHolder);
        }
      });
    } else {
      // proportional
      const totalPercentage = holders.reduce((sum, holder) => sum + holder.percentage, 0);
      holders.forEach(holder => {
        const amount = (holder.percentage / totalPercentage) * totalAmount;
        if (amount >= minimumAmount) {
          amounts.set(holder.address.toString(), amount);
        }
      });
    }

    this.logger.debug('Distribution amounts calculated', {
      recipientsCount: amounts.size,
      totalAllocated: Array.from(amounts.values()).reduce((sum, amount) => sum + amount, 0)
    });

    return amounts;
  }

  private async sendToken2022(
    recipient: PublicKey,
    amount: number,
    tokenAddress: PublicKey,
    distributionId: string
  ): Promise<string> {
    this.logger.debug('sendToken2022 called', {
      recipient: recipient.toString(),
      amount,
      tokenAddress: tokenAddress.toString(),
      distributionId
    });

    const connection = this.rpcClient.getConnection();

    // 各パラメータが正確にPublicKeyであることを保証
    let cleanRecipient: PublicKey;
    let cleanTokenAddress: PublicKey;
    let cleanOwner: PublicKey;

    try {
      // 型チェックとPublicKey変換を安全に実行
      cleanRecipient = recipient instanceof PublicKey ? recipient : new PublicKey(String(recipient));
      cleanTokenAddress = tokenAddress instanceof PublicKey ? tokenAddress : new PublicKey(String(tokenAddress));
      // Always create a fresh PublicKey object from string to avoid any conversion issues
      cleanOwner = new PublicKey(this.adminKeypair.publicKey.toString());

      this.logger.debug('PublicKey objects validated', {
        cleanRecipient: cleanRecipient.toString(),
        cleanTokenAddress: cleanTokenAddress.toString(),
        cleanOwner: cleanOwner.toString()
      });

      // Token 2022用のアカウントアドレスを取得
      const adminTokenAccount = await getAssociatedTokenAddress(
        cleanTokenAddress,
        cleanOwner,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      const recipientTokenAccount = await getAssociatedTokenAddress(
        cleanTokenAddress,
        cleanRecipient,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      this.logger.debug('Token accounts calculated', {
        adminTokenAccount: adminTokenAccount.toString(),
        recipientTokenAccount: recipientTokenAccount.toString()
      });

      const transaction = new Transaction();
      const instructions: any[] = [];

      // 受信者のトークンアカウントが存在しない場合は作成
      const recipientAccountInfo = await connection.getAccountInfo(recipientTokenAccount);
      if (!recipientAccountInfo) {
        this.logger.debug('Creating recipient token account');
        instructions.push(
          createAssociatedTokenAccountInstruction(
            cleanOwner,
            recipientTokenAccount,
            cleanRecipient,
            cleanTokenAddress,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }

      // トークンの小数点を取得
      const decimals = await this.getTokenDecimals(cleanTokenAddress);
      const adjustedAmount = Math.floor(amount * Math.pow(10, decimals));

      this.logger.debug('Creating transfer instruction', {
        adminTokenAccount: adminTokenAccount.toString(),
        cleanTokenAddress: cleanTokenAddress.toString(),
        recipientTokenAccount: recipientTokenAccount.toString(),
        cleanOwner: cleanOwner.toString(),
        adjustedAmount,
        decimals
      });

      // Token 2022転送インストラクションを作成
      const transferInstruction = createTransferCheckedInstruction(
        adminTokenAccount,          // source
        cleanTokenAddress,          // mint
        recipientTokenAccount,      // destination
        cleanOwner,                 // owner (必ずPublicKey)
        adjustedAmount,             // amount
        decimals,                   // decimals
        [],                         // multiSigners
        TOKEN_2022_PROGRAM_ID       // programId
      );

      instructions.push(transferInstruction);
      transaction.add(...instructions);

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = cleanOwner;

      this.logger.debug('Sending Token 2022 transaction');

      // TributaryのwithRetryを使用してトランザクション送信
      const signature = await this.rpcClient.withRetry(async () => {
        return await sendAndConfirmTransaction(
          connection,
          transaction,
          [this.adminKeypair],
          { commitment: 'confirmed' }
        );
      });

      this.logger.info('Token 2022 transfer successful', {
        recipient: recipient.toString(),
        amount,
        signature
      });

      return signature;

    } catch (error) {
      this.logger.warn('Token transfer failed', {
        recipient: recipient.toString(),
        amount,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async sendTokens(
    recipient: PublicKey,
    amount: number,
    tokenAddress: PublicKey,
    distributionId: string
  ): Promise<string> {
    this.logger.debug('sendTokens called', {
      recipient: recipient.toString(),
      amount,
      tokenAddress: tokenAddress.toString()
    });

    // Token 2022の場合は専用関数を使用
    const tokenProgram = await this.detectTokenProgram(tokenAddress);
    if (tokenProgram.equals(TOKEN_2022_PROGRAM_ID)) {
      return this.sendToken2022(recipient, amount, tokenAddress, distributionId);
    }

    throw new Error('Standard token transfer not implemented in this test');
  }

  private async processBatch(
    batch: TokenHolder[],
    tokenAddress: PublicKey,
    totalAmount: number,
    distributionId: string,
    mode: DistributionMode = 'proportional'
  ): Promise<DistributionResult[]> {
    this.logger.debug(`Processing batch ${distributionId}`, {
      batchSize: batch.length,
      totalAmount,
      mode
    });

    const results: DistributionResult[] = [];
    const distributionAmounts = this.calculateDistributionAmounts(
      batch,
      totalAmount,
      mode,
      0
    );

    for (const holder of batch) {
      const amount = distributionAmounts.get(holder.address.toString()) || 0;

      if (amount === 0) {
        continue;
      }

      const result: DistributionResult = {
        transactionId: '',
        status: 'pending',
        recipient: holder.address,
        amount,
        timestamp: new Date()
      };

      try {
        this.logger.debug(`Processing holder ${holder.address.toString()}`, { amount });

        result.transactionId = await this.sendTokens(
          holder.address,
          amount,
          tokenAddress,
          distributionId
        );
        result.status = 'confirmed';

        this.logger.info('Token transfer successful', {
          recipient: holder.address.toString(),
          amount,
          transactionId: result.transactionId
        });
      } catch (error) {
        this.logger.warn('Token transfer failed', {
          recipient: holder.address.toString(),
          amount,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        result.status = 'failed';
        result.error = error instanceof Error ? error.message : 'Unknown error';
      }

      results.push(result);
    }

    return results;
  }

  async executeDistribution(request: DistributionRequest): Promise<any> {
    const distributionId = 'test_dist_' + Date.now();

    this.logger.info('Starting token distribution', {
      distributionId,
      totalRecipients: request.holders.length,
      totalAmount: request.amount,
      mode: request.mode || 'proportional'
    });

    const batches = [request.holders]; // 1つのバッチとして処理
    let allResults: DistributionResult[] = [];

    for (const [batchIndex, batch] of batches.entries()) {
      this.logger.debug(`Processing batch ${batchIndex + 1}/${batches.length}`, {
        batchSize: batch.length
      });

      const batchResults = await this.processBatch(
        batch,
        request.tokenAddress,
        request.amount,
        distributionId,
        request.mode
      );

      allResults = [...allResults, ...batchResults];
    }

    const successful = allResults.filter(r => r.status === 'confirmed').length;
    const failed = allResults.filter(r => r.status === 'failed').length;

    this.logger.info('Distribution completed', {
      distributionId,
      successful,
      failed,
      totalAmount: allResults.reduce((sum, r) => sum + (r.status === 'confirmed' ? r.amount : 0), 0)
    });

    return {
      success: true,
      distributionId,
      results: allResults,
      successful,
      failed
    };
  }
}

// テスト実行
async function main() {
  try {
    console.log('🚀 Step 6: Service with Tributary RpcClient');
    console.log('===========================================');

    // 1. キーペア作成
    const privateKeyArray = [150,246,237,252,156,214,60,223,98,126,155,100,109,247,100,224,243,44,239,204,5,25,218,224,48,55,64,22,103,62,60,201,180,88,17,191,20,144,160,45,223,50,74,128,194,98,67,174,100,192,92,255,61,156,47,177,30,244,17,75,206,29,195,159];
    const adminKeypair = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));

    // 2. サービス作成
    const service = new TestDistributionServiceWithRpcClient('testnet', adminKeypair);

    // 3. テストデータ作成
    const tokenAddress = new PublicKey('9Rnhbcw63WchEesvNP1KR5BBtRBSMdZNmjDCdgbKTKEa');
    const recipients = [new PublicKey('22XkWSj5b7MT47ubmmFWjWr8jMDCgE5szc8wiVL79xv1')];

    const holders: TokenHolder[] = recipients.map(addr => ({
      address: addr,
      balance: 1000,
      percentage: 100 / recipients.length
    }));

    const request: DistributionRequest = {
      amount: 0.1, // 0.1トークン
      tokenAddress,
      holders,
      mode: 'proportional',
      batchSize: 10
    };

    // 4. 配布実行
    const result = await service.executeDistribution(request);

    console.log('\n📊 Final Result:');
    console.log('Success:', result.success);
    console.log('Distribution ID:', result.distributionId);
    console.log('Successful transfers:', result.successful);
    console.log('Failed transfers:', result.failed);

    if (result.results.length > 0) {
      console.log('\nTransaction Details:');
      result.results.forEach((res: DistributionResult, index: number) => {
        console.log(`${index + 1}. ${res.recipient.toString()}`);
        console.log(`   Status: ${res.status}`);
        console.log(`   Amount: ${res.amount}`);
        if (res.transactionId) {
          console.log(`   TX: ${res.transactionId}`);
          console.log(`   Explorer: https://explorer.solana.com/tx/${res.transactionId}?cluster=testnet`);
        }
        if (res.error) {
          console.log(`   Error: ${res.error}`);
        }
      });
    }

  } catch (error) {
    console.log('❌ Test failed:', error instanceof Error ? error.message : 'Unknown error');
    console.log('Error details:', error);
  }
}

main().catch(console.error);