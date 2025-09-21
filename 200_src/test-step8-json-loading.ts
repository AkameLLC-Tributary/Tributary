import { PublicKey, Keypair } from '@solana/web3.js';
import { promises as fs } from 'fs';
import path from 'path';

// 実際のTributary DistributionServiceを直接使用
import { DistributionService } from './src/application/services/DistributionService';

// Tributaryの型定義を使用
import { DistributionRequest, TokenHolder } from './src/domain/types';

// T031テストと同じwallets.jsonファイルを作成してテスト
async function createTestData() {
  const testDir = path.join(__dirname, 'test-json-loading');

  // ディレクトリ作成
  await fs.mkdir(testDir, { recursive: true });

  // T031テストと同じような wallets.json を作成
  const rawHolders = [
    {
      address: '22XkWSj5b7MT47ubmmFWjWr8jMDCgE5szc8wiVL79xv1',
      balance: 1000,
      percentage: 100
    }
  ];

  const walletsJsonPath = path.join(testDir, 'wallets.json');
  await fs.writeFile(walletsJsonPath, JSON.stringify(rawHolders, null, 2));

  return { testDir, walletsJsonPath };
}

// T031テストと同じloadTokenHolders関数を模倣
async function loadTokenHoldersFromJson(walletsJsonPath: string): Promise<TokenHolder[]> {
  try {
    interface RawTokenHolder {
      address: string;
      balance: number;
      percentage: number;
    }

    const jsonData = await fs.readFile(walletsJsonPath, 'utf-8');
    const rawHolders = JSON.parse(jsonData) as RawTokenHolder[];

    console.log('🔍 Raw holders from JSON:');
    console.log(rawHolders);

    // 文字列アドレスをPublicKeyオブジェクトに変換（T031と同じ）
    const holders = rawHolders.map(holder => {
      console.log(`🔍 Converting address: ${holder.address}`);
      const publicKey = new PublicKey(holder.address);
      console.log(`   PublicKey type: ${typeof publicKey}`);
      console.log(`   PublicKey instanceof PublicKey: ${publicKey instanceof PublicKey}`);
      console.log(`   PublicKey has toBuffer: ${typeof publicKey.toBuffer}`);
      console.log(`   PublicKey toString: ${publicKey.toString()}`);

      return {
        address: publicKey,
        balance: holder.balance,
        percentage: holder.percentage
      };
    });

    console.log('✅ Converted token holders:');
    holders.forEach((holder, index) => {
      console.log(`${index + 1}. Address: ${holder.address.toString()}`);
      console.log(`   Type: ${typeof holder.address}`);
      console.log(`   instanceof PublicKey: ${holder.address instanceof PublicKey}`);
      console.log(`   has toBuffer: ${typeof holder.address.toBuffer}`);
    });

    return holders;
  } catch (error) {
    console.log('❌ Error loading token holders:', error);
    return [];
  }
}

// テスト実行
async function main() {
  try {
    console.log('🚀 Step 8: Testing JSON Loading (T031 Style)');
    console.log('============================================');

    // 1. テストデータ作成
    const { testDir, walletsJsonPath } = await createTestData();
    console.log('✅ Test data created');
    console.log('Test directory:', testDir);

    // 2. キーペア作成
    const privateKeyArray = [150,246,237,252,156,214,60,223,98,126,155,100,109,247,100,224,243,44,239,204,5,25,218,224,48,55,64,22,103,62,60,201,180,88,17,191,20,144,160,45,223,50,74,128,194,98,67,174,100,192,92,255,61,156,47,177,30,244,17,75,206,29,195,159];
    const adminKeypair = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
    console.log('✅ Admin wallet:', adminKeypair.publicKey.toString());

    // 3. JSONからトークンホルダーを読み込み（T031と同じ方法）
    console.log('\n🔍 Loading token holders from JSON...');
    const holders = await loadTokenHoldersFromJson(walletsJsonPath);

    if (holders.length === 0) {
      console.log('❌ No token holders loaded');
      return;
    }

    // 4. 実際のTributary DistributionServiceを作成
    const service = new DistributionService('testnet', adminKeypair);
    console.log('✅ DistributionService created');

    // 5. T031テストと同じリクエスト作成
    const tokenAddress = new PublicKey('9Rnhbcw63WchEesvNP1KR5BBtRBSMdZNmjDCdgbKTKEa');

    const request: DistributionRequest = {
      amount: 0.03, // 0.03トークン
      tokenAddress,
      holders, // JSONから読み込んだホルダー
      mode: 'proportional',
      batchSize: 10
    };

    console.log('\n✅ Test data prepared');
    console.log('Token:', tokenAddress.toString());
    console.log('Recipients:', holders.length);
    console.log('Amount:', request.amount);

    // 6. ホルダーの詳細情報を表示
    console.log('\n🔍 Final holder details before distribution:');
    holders.forEach((holder, index) => {
      console.log(`${index + 1}. ${holder.address.toString()}`);
      console.log(`   Type: ${typeof holder.address}`);
      console.log(`   instanceof PublicKey: ${holder.address instanceof PublicKey}`);
      console.log(`   Constructor: ${holder.address.constructor.name}`);
      console.log(`   has toBuffer: ${typeof holder.address.toBuffer}`);

      // より詳細な検査
      try {
        const buffer = holder.address.toBuffer();
        console.log(`   toBuffer() works: true, result type: ${typeof buffer}`);
      } catch (e) {
        console.log(`   toBuffer() ERROR: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    });

    // 7. 実際のTributary executeDistributionを実行
    console.log('\n🚀 Starting distribution with JSON-loaded holders...');

    const result = await service.executeDistribution(request);

    console.log('\n📊 Final Result:');
    console.log('Distribution ID:', result.id);
    console.log('Created at:', result.createdAt);

    const results = result.getResults();
    if (results && results.length > 0) {
      console.log('Results count:', results.length);

      results.forEach((res: any, index: number) => {
        console.log(`\n${index + 1}. ${res.recipient.toString()}`);
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

      const successful = result.getSuccessfulCount();
      const failed = result.getFailedCount();
      const totalAmount = result.getTotalAmount();

      console.log(`\n📈 Summary:`);
      console.log(`   Successful: ${successful}`);
      console.log(`   Failed: ${failed}`);
      console.log(`   Total: ${results.length}`);
      console.log(`   Total Amount: ${totalAmount}`);
    } else {
      console.log('No results returned');
    }

    if (results.length > 0 && result.getSuccessfulCount() > 0) {
      console.log('\n🎉 JSON LOADING METHOD WORKING CORRECTLY!');
    } else {
      console.log('\n❌ JSON loading method failed');
    }

    // 8. クリーンアップ
    await fs.rmdir(testDir, { recursive: true });
    console.log('✅ Test directory cleaned up');

  } catch (error) {
    console.log('\n❌ Test failed with error:', error instanceof Error ? error.message : 'Unknown error');
    console.log('Error details:', error);

    // エラーの詳細分析
    if (error instanceof Error) {
      console.log('\nError Analysis:');
      console.log('Name:', error.name);
      console.log('Message:', error.message);
      console.log('Stack:', error.stack);

      if (error.message.includes('owner.toBuffer')) {
        console.log('\n🔍 FOUND THE ISSUE!');
        console.log('The error occurs when using JSON-loaded token holders!');
        console.log('This matches the T031 test error pattern.');
      }
    }
  }
}

main().catch(console.error);