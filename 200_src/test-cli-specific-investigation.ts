import { PublicKey, Keypair } from '@solana/web3.js';
import { promises as fs } from 'fs';
import path from 'path';

// Import the exact same components used by CLI
import { FileStorage } from './src/infrastructure/storage/FileStorage';
import { DistributionService } from './src/application/services/DistributionService';
import { TokenHolder, DistributionRequest } from './src/domain/types';

// CLIからのloadTokenHolders()関数と全く同じ処理を模倣
async function loadTokenHoldersLikeCLI(storage: FileStorage): Promise<TokenHolder[]> {
  try {
    interface RawTokenHolder {
      address: string;
      balance: number;
      percentage: number;
    }

    console.log('🔍 Step 1: Reading JSON with FileStorage.readJson()');
    const rawHolders = await storage.readJson<RawTokenHolder[]>('wallets.json');
    console.log('✅ FileStorage.readJson() successful');
    console.log('Raw holders data:', rawHolders);

    console.log('\n🔍 Step 2: Converting string addresses to PublicKey (CLI method)');
    const holders = rawHolders.map((holder, index) => {
      console.log(`\nConverting holder ${index + 1}:`);
      console.log(`  Original address: ${holder.address}`);
      console.log(`  Address type: ${typeof holder.address}`);

      const publicKey = new PublicKey(holder.address);
      console.log(`  PublicKey created: ${publicKey.toString()}`);
      console.log(`  PublicKey type: ${typeof publicKey}`);
      console.log(`  PublicKey instanceof PublicKey: ${publicKey instanceof PublicKey}`);
      console.log(`  PublicKey constructor: ${publicKey.constructor.name}`);
      console.log(`  PublicKey has toBuffer: ${typeof publicKey.toBuffer}`);

      // 即座にtoBuffer()テスト
      try {
        const buffer = publicKey.toBuffer();
        console.log(`  ✅ toBuffer() works: true, result type: ${typeof buffer}`);
      } catch (e) {
        console.log(`  ❌ toBuffer() ERROR: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }

      const convertedHolder = {
        address: publicKey,
        balance: holder.balance,
        percentage: holder.percentage
      };

      console.log(`  Final holder address type: ${typeof convertedHolder.address}`);
      console.log(`  Final holder instanceof PublicKey: ${convertedHolder.address instanceof PublicKey}`);

      // 変換後にもう一度toBuffer()テスト
      try {
        const buffer2 = convertedHolder.address.toBuffer();
        console.log(`  ✅ Final toBuffer() works: true`);
      } catch (e) {
        console.log(`  ❌ Final toBuffer() ERROR: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }

      return convertedHolder;
    });

    console.log('\n✅ CLI-style conversion completed');
    console.log(`Converted ${holders.length} holders`);

    return holders;
  } catch (error) {
    console.log('❌ Error in loadTokenHoldersLikeCLI:', error);
    return [];
  }
}

// CLI特有の問題を調査
async function investigateCLISpecificIssue() {
  const timestamp = Date.now();
  const testDir = path.join(__dirname, 'cli-investigation-test');

  try {
    console.log('🔍 CLI-Specific Investigation: Finding PublicKey toBuffer Issue');
    console.log('================================================================');

    // 1. テスト環境作成
    await fs.mkdir(testDir, { recursive: true });
    console.log('✅ Test directory created:', testDir);

    // 2. wallets.json作成（CLI用）
    const wallets = [
      {
        address: '22XkWSj5b7MT47ubmmFWjWr8jMDCgE5szc8wiVL79xv1',
        balance: 1000,
        percentage: 100
      }
    ];

    const walletsPath = path.join(testDir, 'wallets.json');
    await fs.writeFile(walletsPath, JSON.stringify(wallets, null, 2));
    console.log('✅ wallets.json created');

    // 3. FileStorageを初期化（CLI と同じように）
    const storage = new FileStorage({ baseDir: testDir });
    console.log('✅ FileStorage initialized with baseDir:', testDir);

    // 4. CLI風にTokenHoldersを読み込み
    console.log('\n🔍 Testing CLI loadTokenHolders() method...');
    const holders = await loadTokenHoldersLikeCLI(storage);

    if (holders.length === 0) {
      console.log('❌ No token holders loaded');
      return;
    }

    // 5. 管理者ウォレット作成（CLI と同じように）
    const privateKeyArray = [150,246,237,252,156,214,60,223,98,126,155,100,109,247,100,224,243,44,239,204,5,25,218,224,48,55,64,22,103,62,60,201,180,88,17,191,20,144,160,45,223,50,74,128,194,98,67,174,100,192,92,255,61,156,47,177,30,244,17,75,206,29,195,159];
    const adminKeypair = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
    console.log('✅ Admin wallet created:', adminKeypair.publicKey.toString());

    // 6. DistributionService作成（CLI と同じように）
    const service = new DistributionService('testnet', adminKeypair);
    console.log('✅ DistributionService created');

    // 7. DistributionRequest作成（CLI と同じように）
    const tokenAddress = new PublicKey('9Rnhbcw63WchEesvNP1KR5BBtRBSMdZNmjDCdgbKTKEa');

    const request: DistributionRequest = {
      amount: 0.01,
      tokenAddress,
      holders,
      batchSize: 5
    };

    console.log('\n🔍 Final validation before DistributionService execution:');
    holders.forEach((holder, index) => {
      console.log(`\nHolder ${index + 1}:`);
      console.log(`  Address: ${holder.address.toString()}`);
      console.log(`  Type: ${typeof holder.address}`);
      console.log(`  instanceof PublicKey: ${holder.address instanceof PublicKey}`);
      console.log(`  Constructor: ${holder.address.constructor.name}`);
      console.log(`  has toBuffer: ${typeof holder.address.toBuffer}`);

      // Critical test: toBuffer() just before passing to service
      try {
        const buffer = holder.address.toBuffer();
        console.log(`  ✅ toBuffer() works: true, buffer length: ${buffer.length}`);
      } catch (e) {
        console.log(`  ❌ toBuffer() ERROR FOUND: ${e instanceof Error ? e.message : 'Unknown error'}`);
        console.log(`  ⚠️ This is where the CLI fails!`);
      }
    });

    // 8. 実際のDistribution実行（CLI と同じフロー）
    console.log('\n🚀 Executing DistributionService (CLI-style)...');

    try {
      const result = await service.executeDistribution(request);

      console.log('\n📊 SUCCESS: CLI-style execution completed!');
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
      }

      console.log('\n🎉 CLI-STYLE EXECUTION SUCCESSFUL!');
      console.log('This means the issue is NOT in the basic CLI data flow.');
      console.log('The problem must be elsewhere - likely in CLI execution context.');

    } catch (error: any) {
      console.log('\n❌ CLI-style execution FAILED:');
      console.log('Error:', error instanceof Error ? error.message : 'Unknown error');

      if (error.message?.includes('owner.toBuffer')) {
        console.log('\n🎯 FOUND THE ISSUE!');
        console.log('The "owner.toBuffer is not a function" error occurred during CLI-style execution.');
        console.log('This confirms the issue happens in the DistributionService execution phase.');
      }

      console.log('\nFull error details:', error);
    }

    // 9. クリーンアップ
    await fs.rm(testDir, { recursive: true });
    console.log('\n✅ Test directory cleaned up');

  } catch (error) {
    console.log('\n❌ Investigation failed:', error instanceof Error ? error.message : 'Unknown error');
    console.log('Error details:', error);

    try {
      await fs.rm(testDir, { recursive: true });
    } catch (cleanupError) {
      console.log('Warning: Could not clean up test directory:', cleanupError);
    }
  }
}

// 実行
investigateCLISpecificIssue().catch(console.error);