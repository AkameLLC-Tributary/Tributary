import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';

class SimpleTokenTransfer {
  private connection: Connection;
  private adminPrivateKey: string;
  private tokenMint: string;
  private recipient: string;
  private amount: number;

  constructor() {
    this.connection = new Connection('https://api.testnet.solana.com', 'confirmed');

    // テストデータ
    this.adminPrivateKey = '424SmoRFNJ1gujRTAgdVa5yWAZvgzFS21uYDXWrsMkpDULfpBAgkcQwMsBrNQp8NjMWJkXfe2xeJRtLs7ftwHyeW';
    this.tokenMint = '9Rnhbcw63WchEesvNP1KR5BBtRBSMdZNmjDCdgbKTKEa'; // 配布対象トークン
    this.recipient = '22XkWSj5b7MT47ubmmFWjWr8jMDCgE5szc8wiVL79xv1'; // 実際のトークンホルダー
    this.amount = 0.001; // 0.001トークン
  }

  private async detectTokenProgram(tokenAddress: PublicKey): Promise<PublicKey> {
    try {
      const mintInfo = await this.connection.getAccountInfo(tokenAddress);
      if (!mintInfo) {
        throw new Error(`Token mint ${tokenAddress.toString()} not found`);
      }

      console.log('🔍 Token mint owner:', mintInfo.owner.toString());

      // mintInfo.ownerをPublicKeyとして扱う（Tributaryと同じ方法）
      const ownerPubkey = new PublicKey(mintInfo.owner);
      console.log('🔍 Owner as PublicKey:', ownerPubkey.toString());
      console.log('🔍 TOKEN_2022_PROGRAM_ID:', TOKEN_2022_PROGRAM_ID.toString());
      console.log('🔍 Equals check:', ownerPubkey.equals(TOKEN_2022_PROGRAM_ID));

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
      return 9; // デフォルト
    } catch (error) {
      console.log('⚠️ Error getting decimals:', error instanceof Error ? error.message : 'Unknown error');
      return 9;
    }
  }

  async transfer(): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      console.log('🚀 Simple Token Transfer Test (Tributary Dependencies)');
      console.log('===================================================');

      // 1. キーペア作成（Tributaryと同じ方法でBase58から）
      console.log('1️⃣ Creating keypair...');

      // Base58デコードの処理（Tributaryと同じ）
      const bs58 = require('bs58');
      const privateKeyArray = JSON.parse(`[150,246,237,252,156,214,60,223,98,126,155,100,109,247,100,224,243,44,239,204,5,25,218,224,48,55,64,22,103,62,60,201,180,88,17,191,20,144,160,45,223,50,74,128,194,98,67,174,100,192,92,255,61,156,47,177,30,244,17,75,206,29,195,159]`);
      const adminKeypair = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
      console.log('✅ Admin wallet:', adminKeypair.publicKey.toString());

      // 2. PublicKey作成
      console.log('2️⃣ Creating PublicKeys...');
      const tokenAddress = new PublicKey(this.tokenMint);
      const recipientAddress = new PublicKey(this.recipient);
      console.log('✅ Token:', tokenAddress.toString());
      console.log('✅ Recipient:', recipientAddress.toString());

      // 3. トークンプログラム検出
      console.log('3️⃣ Detecting token program...');
      const tokenProgram = await this.detectTokenProgram(tokenAddress);

      // 4. トークン小数点取得
      console.log('4️⃣ Getting token decimals...');
      const decimals = await this.getTokenDecimals(tokenAddress);
      console.log('✅ Decimals:', decimals);

      // 5. 関連トークンアカウント計算
      console.log('5️⃣ Calculating associated token accounts...');
      const adminTokenAccount = await getAssociatedTokenAddress(
        tokenAddress,
        adminKeypair.publicKey,
        false,
        tokenProgram
      );

      const recipientTokenAccount = await getAssociatedTokenAddress(
        tokenAddress,
        recipientAddress,
        false,
        tokenProgram
      );

      console.log('✅ Admin token account:', adminTokenAccount.toString());
      console.log('✅ Recipient token account:', recipientTokenAccount.toString());

      // 6. PublicKeyオブジェクトの詳細確認
      console.log('6️⃣ Checking PublicKey objects...');
      console.log('adminKeypair.publicKey type:', typeof adminKeypair.publicKey);
      console.log('adminKeypair.publicKey instanceof PublicKey:', adminKeypair.publicKey instanceof PublicKey);
      console.log('adminKeypair.publicKey has toBuffer:', typeof adminKeypair.publicKey.toBuffer);
      console.log('adminKeypair.publicKey constructor:', adminKeypair.publicKey.constructor.name);

      // 7. 新しいPublicKeyオブジェクト作成（Tributaryと同じ方法）
      console.log('7️⃣ Creating fresh PublicKey objects...');
      const cleanOwner = new PublicKey(adminKeypair.publicKey.toString());
      const cleanTokenAddress = new PublicKey(tokenAddress.toString());
      const cleanRecipient = new PublicKey(recipientAddress.toString());

      console.log('cleanOwner type:', typeof cleanOwner);
      console.log('cleanOwner instanceof PublicKey:', cleanOwner instanceof PublicKey);
      console.log('cleanOwner has toBuffer:', typeof cleanOwner.toBuffer);
      console.log('cleanOwner constructor:', cleanOwner.constructor.name);

      // 8. トランザクション作成
      console.log('8️⃣ Creating transaction...');
      const transaction = new Transaction();
      const instructions: any[] = [];

      // 9. 受信者トークンアカウント存在確認
      console.log('9️⃣ Checking recipient token account...');
      const recipientAccountInfo = await this.connection.getAccountInfo(recipientTokenAccount);
      if (!recipientAccountInfo) {
        console.log('⚠️ Creating recipient token account...');
        instructions.push(
          createAssociatedTokenAccountInstruction(
            cleanOwner,
            recipientTokenAccount,
            cleanRecipient,
            cleanTokenAddress,
            tokenProgram
          )
        );
      } else {
        console.log('✅ Recipient token account exists');
      }

      // 10. 転送インストラクション作成
      console.log('🔟 Creating transfer instruction...');
      const adjustedAmount = Math.floor(this.amount * Math.pow(10, decimals));
      console.log('Adjusted amount:', adjustedAmount);

      if (tokenProgram.equals(TOKEN_2022_PROGRAM_ID)) {
        console.log('📦 Creating Token 2022 transfer instruction...');
        console.log('Parameters before createTransferCheckedInstruction:');
        console.log('- adminTokenAccount:', adminTokenAccount.toString());
        console.log('- cleanTokenAddress:', cleanTokenAddress.toString());
        console.log('- recipientTokenAccount:', recipientTokenAccount.toString());
        console.log('- cleanOwner:', cleanOwner.toString());
        console.log('- cleanOwner type details:', {
          type: typeof cleanOwner,
          isPublicKey: cleanOwner instanceof PublicKey,
          hasToBuffer: typeof cleanOwner.toBuffer,
          constructor: cleanOwner.constructor.name
        });

        const transferInstruction = createTransferCheckedInstruction(
          adminTokenAccount,     // source
          cleanTokenAddress,     // mint
          recipientTokenAccount, // destination
          cleanOwner,           // owner
          adjustedAmount,       // amount
          decimals,            // decimals
          [],                  // multiSigners
          TOKEN_2022_PROGRAM_ID // programId
        );
        instructions.push(transferInstruction);
      } else {
        console.log('📦 Creating standard transfer instruction...');
        const { createTransferInstruction } = require('@solana/spl-token');
        const transferInstruction = createTransferInstruction(
          adminTokenAccount,
          recipientTokenAccount,
          cleanOwner,
          adjustedAmount,
          [],
          TOKEN_PROGRAM_ID
        );
        instructions.push(transferInstruction);
      }

      console.log('✅ Transfer instruction created successfully');

      // 11. トランザクション組み立て
      console.log('1️⃣1️⃣ Assembling transaction...');
      transaction.add(...instructions);

      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = cleanOwner;

      console.log('✅ Transaction assembled');

      // 12. トランザクション送信（実際は送信しない、組み立てテストのみ）
      console.log('1️⃣2️⃣ Transaction ready for sending');
      console.log('🎉 SUCCESS: All steps completed without errors!');

      return {
        success: true,
        message: 'Token transfer preparation completed successfully'
      };

    } catch (error) {
      console.log('❌ ERROR:', error instanceof Error ? error.message : 'Unknown error');
      console.log('Error details:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// 実行
async function main() {
  const transfer = new SimpleTokenTransfer();
  const result = await transfer.transfer();

  console.log('\n📊 Final Result:');
  console.log('Success:', result.success);
  if (result.error) {
    console.log('Error:', result.error);
  } else {
    console.log('Message:', result.message);
  }
}

main().catch(console.error);