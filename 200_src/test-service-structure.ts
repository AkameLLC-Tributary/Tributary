import { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';

// Tributaryのインターフェースを模倣
interface TokenHolder {
  address: PublicKey;
  balance: number;
  percentage: number;
}

interface DistributionRequest {
  amount: number;
  tokenAddress: PublicKey;
  holders: TokenHolder[];
  batchSize?: number;
}

class TestDistributionService {
  private connection: Connection;
  private adminKeypair: Keypair;

  constructor(network: string, adminKeypair: Keypair) {
    this.connection = new Connection('https://api.testnet.solana.com', 'confirmed');
    this.adminKeypair = adminKeypair;

    // Tributaryと同じようにコンストラクタでPublicKeyの状態をチェック
    console.log('🔍 Constructor - adminKeypair.publicKey type:', typeof this.adminKeypair.publicKey);
    console.log('🔍 Constructor - adminKeypair.publicKey instanceof PublicKey:', this.adminKeypair.publicKey instanceof PublicKey);
    console.log('🔍 Constructor - adminKeypair.publicKey has toBuffer:', typeof this.adminKeypair.publicKey.toBuffer);
  }

  private async detectTokenProgram(tokenAddress: PublicKey): Promise<PublicKey> {
    try {
      const mintInfo = await this.connection.getAccountInfo(tokenAddress);
      if (!mintInfo) {
        throw new Error(`Token mint ${tokenAddress.toString()} not found`);
      }

      // Tributaryと同じ方法
      const ownerPubkey = new PublicKey(mintInfo.owner);
      if (ownerPubkey.equals(TOKEN_2022_PROGRAM_ID)) {
        console.log('✅ Detected Token 2022');
        return TOKEN_2022_PROGRAM_ID;
      }

      console.log('✅ Detected Standard Token');
      return TOKEN_PROGRAM_ID;
    } catch (error) {
      console.log('⚠️ Error detecting token program:', error instanceof Error ? error.message : 'Unknown error');
      return TOKEN_PROGRAM_ID;
    }
  }

  private async getTokenDecimals(tokenAddress: PublicKey): Promise<number> {
    try {
      const mintInfo = await this.connection.getParsedAccountInfo(tokenAddress);
      if (mintInfo.value && mintInfo.value.data && 'parsed' in mintInfo.value.data) {
        return mintInfo.value.data.parsed.info.decimals;
      }
      return 9;
    } catch (error) {
      console.log('⚠️ Error getting decimals:', error instanceof Error ? error.message : 'Unknown error');
      return 9;
    }
  }

  // Tributaryと同じようなsendToken2022関数
  private async sendToken2022(
    recipient: PublicKey,
    amount: number,
    tokenAddress: PublicKey,
    _distributionId: string
  ): Promise<string> {
    console.log('🚀 sendToken2022 called');
    console.log('recipient:', recipient.toString());
    console.log('amount:', amount);
    console.log('tokenAddress:', tokenAddress.toString());

    // Tributaryと同じような各パラメータの検証
    let cleanRecipient: PublicKey;
    let cleanTokenAddress: PublicKey;
    let cleanOwner: PublicKey;

    try {
      // Tributaryと同じ変換ロジック
      cleanRecipient = recipient instanceof PublicKey ? recipient : new PublicKey(String(recipient));
      cleanTokenAddress = tokenAddress instanceof PublicKey ? tokenAddress : new PublicKey(String(tokenAddress));
      cleanOwner = new PublicKey(this.adminKeypair.publicKey.toString());

      console.log('✅ PublicKey objects validated', {
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

      console.log('✅ Token accounts calculated', {
        adminTokenAccount: adminTokenAccount.toString(),
        recipientTokenAccount: recipientTokenAccount.toString()
      });

      const transaction = new Transaction();
      const instructions: any[] = [];

      // 受信者のトークンアカウントが存在しない場合は作成
      const recipientAccountInfo = await this.connection.getAccountInfo(recipientTokenAccount);
      if (!recipientAccountInfo) {
        console.log('⚠️ Creating recipient token account');
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

      console.log('🔍 Creating transfer instruction', {
        adminTokenAccount: adminTokenAccount.toString(),
        cleanTokenAddress: cleanTokenAddress.toString(),
        recipientTokenAccount: recipientTokenAccount.toString(),
        cleanOwner: cleanOwner.toString(),
        adjustedAmount,
        decimals
      });

      // 最も詳細なデバッグ
      console.log('🔍 Final cleanOwner inspection before createTransferCheckedInstruction:');
      console.log('cleanOwner:', cleanOwner);
      console.log('cleanOwner type:', typeof cleanOwner);
      console.log('cleanOwner instanceof PublicKey:', cleanOwner instanceof PublicKey);
      console.log('cleanOwner constructor:', cleanOwner.constructor.name);
      console.log('cleanOwner has toBuffer:', typeof cleanOwner.toBuffer);
      if (cleanOwner.toBuffer) {
        console.log('cleanOwner.toBuffer() result type:', typeof cleanOwner.toBuffer());
      }

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

      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = cleanOwner;

      console.log('✅ Transaction prepared, ready to send');

      // 実際にはトランザクションを送信しない（テスト用）
      return 'test_transaction_id_' + Date.now();

    } catch (error) {
      console.log('❌ Error in sendToken2022:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  // Tributaryと同じようなsendTokens関数
  private async sendTokens(
    recipient: PublicKey,
    amount: number,
    tokenAddress: PublicKey,
    distributionId: string
  ): Promise<string> {
    console.log('🚀 sendTokens called');

    // Token 2022の場合は専用関数を使用
    const tokenProgram = await this.detectTokenProgram(tokenAddress);
    if (tokenProgram.equals(TOKEN_2022_PROGRAM_ID)) {
      return this.sendToken2022(recipient, amount, tokenAddress, distributionId);
    }

    throw new Error('Standard token transfer not implemented in this test');
  }

  // Tributaryと同じようなprocessBatch関数を模倣
  private async processBatch(
    batch: TokenHolder[],
    tokenAddress: PublicKey,
    totalAmount: number,
    distributionId: string
  ): Promise<any[]> {
    console.log('🚀 processBatch called');
    console.log('batch:', batch);
    console.log('batch.length:', batch.length);

    const results: any[] = [];

    for (const holder of batch) {
      const amount = totalAmount / batch.length; // 簡単な均等配布

      console.log(`🔄 Processing holder: ${holder.address.toString()}`);

      try {
        const transactionId = await this.sendTokens(
          holder.address,
          amount,
          tokenAddress,
          distributionId
        );

        results.push({
          transactionId,
          status: 'confirmed',
          recipient: holder.address,
          amount,
          timestamp: new Date()
        });
      } catch (error) {
        console.log(`❌ Transfer failed for ${holder.address.toString()}:`, error instanceof Error ? error.message : 'Unknown error');
        results.push({
          transactionId: '',
          status: 'failed',
          recipient: holder.address,
          amount,
          timestamp: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  // Tributaryと同じようなexecuteDistribution関数
  async executeDistribution(request: DistributionRequest): Promise<any> {
    console.log('🚀 executeDistribution called');

    const distributionId = 'test_dist_' + Date.now();
    const batches = [request.holders]; // 1つのバッチとして処理

    console.log('✅ Starting token distribution', {
      distributionId,
      totalRecipients: request.holders.length,
      totalAmount: request.amount,
      batchCount: batches.length
    });

    for (const [batchIndex, batch] of batches.entries()) {
      console.log(`🔄 Processing batch ${batchIndex + 1}/${batches.length}`);

      const batchResults = await this.processBatch(
        batch,
        request.tokenAddress,
        request.amount,
        distributionId
      );

      console.log('Batch results:', batchResults);
    }

    console.log('✅ Distribution completed');
    return { success: true, distributionId };
  }
}

// テスト実行
async function main() {
  try {
    console.log('🚀 Service Structure Test');
    console.log('=========================');

    // 1. キーペア作成
    const privateKeyArray = [150,246,237,252,156,214,60,223,98,126,155,100,109,247,100,224,243,44,239,204,5,25,218,224,48,55,64,22,103,62,60,201,180,88,17,191,20,144,160,45,223,50,74,128,194,98,67,174,100,192,92,255,61,156,47,177,30,244,17,75,206,29,195,159];
    const adminKeypair = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));

    // 2. サービス作成
    const service = new TestDistributionService('testnet', adminKeypair);

    // 3. テストデータ作成
    const tokenAddress = new PublicKey('9Rnhbcw63WchEesvNP1KR5BBtRBSMdZNmjDCdgbKTKEa');
    const recipients = [new PublicKey('22XkWSj5b7MT47ubmmFWjWr8jMDCgE5szc8wiVL79xv1')];

    const holders: TokenHolder[] = recipients.map(addr => ({
      address: addr,
      balance: 1000,
      percentage: 100 / recipients.length
    }));

    const request: DistributionRequest = {
      amount: 0.001,
      tokenAddress,
      holders,
      batchSize: 10
    };

    // 4. 配布実行
    const result = await service.executeDistribution(request);

    console.log('\n📊 Final Result:');
    console.log('Success:', result.success);
    console.log('Distribution ID:', result.distributionId);

  } catch (error) {
    console.log('❌ Test failed:', error instanceof Error ? error.message : 'Unknown error');
    console.log('Error details:', error);
  }
}

main().catch(console.error);