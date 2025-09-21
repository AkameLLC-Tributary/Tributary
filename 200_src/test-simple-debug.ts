import { PublicKey, Keypair } from '@solana/web3.js';
import { promises as fs } from 'fs';
import path from 'path';

// TribuiaryCLI経由でのPublicKey処理を模倣
import { TribuiaryCLI } from './src/presentation/cli/index';
import { FileStorage } from './src/infrastructure/storage/FileStorage';

// 段階的デバッグ: CLI処理の各ステップをテスト
async function simpleDebugTest() {
  const timestamp = Date.now();
  const testDir = path.join(__dirname, 'simple-debug-test');

  try {
    console.log('🔍 Simple Debug Test: CLI vs Direct Processing');
    console.log('==============================================');

    // 1. テスト環境作成
    await fs.mkdir(testDir, { recursive: true });
    const dataDir = path.join(testDir, 'data');
    await fs.mkdir(dataDir, { recursive: true });

    // 2. テストデータ準備
    const wallets = [
      {
        address: '22XkWSj5b7MT47ubmmFWjWr8jMDCgE5szc8wiVL79xv1',
        balance: 1000,
        percentage: 100
      }
    ];

    await fs.writeFile(path.join(dataDir, 'wallets.json'), JSON.stringify(wallets, null, 2));

    const tomlContent = `[project]
name = "SimpleDebugTest"
created = "${new Date().toISOString()}"
network = "testnet"

[token]
base_token = "9Rnhbcw63WchEesvNP1KR5BBtRBSMdZNmjDCdgbKTKEa"
admin_wallet = "D8zGvbM3w6bcAsnfWcZnWEz2GLeK7LPVftqwsMDCkcHk"

[distribution]
auto_distribute = false
minimum_balance = 0
batch_size = 10

[security]
key_encryption = true
backup_enabled = true
audit_log = true

[network]
timeout = 30000
max_retries = 3
retry_delay = 1000
[network.rpc_urls]
devnet = "https://api.devnet.solana.com"
testnet = "https://api.testnet.solana.com"
mainnet-beta = "https://api.mainnet-beta.solana.com"

[logging]
level = "info"
log_dir = "./logs"
enable_console = true
enable_file = true
max_files = 14
max_size = "20m"
`;

    await fs.writeFile(path.join(testDir, 'tributary.toml'), tomlContent);

    const privateKeyArray = [150,246,237,252,156,214,60,223,98,126,155,100,109,247,100,224,243,44,239,204,5,25,218,224,48,55,64,22,103,62,60,201,180,88,17,191,20,144,160,45,223,50,74,128,194,98,67,174,100,192,92,255,61,156,47,177,30,244,17,75,206,29,195,159];
    await fs.writeFile(path.join(testDir, 'admin-wallet.json'), JSON.stringify(privateKeyArray, null, 2));

    console.log('✅ Test environment created');

    // 3. 段階1: FileStorageから直接読み込みテスト
    console.log('\n📂 Step 1: Testing FileStorage.readJson()');
    const storage = new FileStorage({ baseDir: testDir });

    try {
      interface RawTokenHolder {
        address: string;
        balance: number;
        percentage: number;
      }

      const rawHolders = await storage.readJson<RawTokenHolder[]>('data/wallets.json');
      console.log('✅ FileStorage.readJson() successful');
      console.log('Raw holders:', rawHolders);

      // 4. 段階2: PublicKey変換テスト（直接）
      console.log('\n🔄 Step 2: Testing direct PublicKey conversion');
      const directConvertedHolders = rawHolders.map((holder, index) => {
        console.log(`Converting holder ${index + 1}: ${holder.address}`);
        const publicKey = new PublicKey(holder.address);
        console.log(`  Type: ${typeof publicKey}`);
        console.log(`  instanceof PublicKey: ${publicKey instanceof PublicKey}`);
        console.log(`  Constructor: ${publicKey.constructor.name}`);
        console.log(`  has toBuffer: ${typeof publicKey.toBuffer}`);

        // toBufferテスト
        try {
          const buffer = publicKey.toBuffer();
          console.log(`  toBuffer() works: true`);
        } catch (e) {
          console.log(`  toBuffer() ERROR: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }

        return {
          address: publicKey,
          balance: holder.balance,
          percentage: holder.percentage
        };
      });

      console.log('✅ Direct PublicKey conversion successful');

      // 5. 段階3: TribuiaryCLI経由での処理テスト
      console.log('\n🎯 Step 3: Testing CLI processing (without execution)');

      // プロセスのカレントディレクトリを変更
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const cli = new TribuiaryCLI();

        // CLIのloadTokenHolders()メソッドを直接呼び出し
        // NOTE: これはprivateメソッドなので、テスト用にpublicにするか別の方法を検討する必要があります
        console.log('⚠️ Cannot directly test CLI.loadTokenHolders() - it is private');
        console.log('Instead, we need to examine the actual CLI execution path');

      } finally {
        process.chdir(originalCwd);
      }

      // 6. 段階4: 違いの特定
      console.log('\n🔍 Step 4: Analyzing differences');
      console.log('Direct conversion works correctly');
      console.log('CLI execution fails with owner.toBuffer error');
      console.log('');
      console.log('Possible causes:');
      console.log('1. CLI argument parsing affects PublicKey objects');
      console.log('2. Different code path in CLI vs direct usage');
      console.log('3. Timing/async issues in CLI execution');
      console.log('4. Different TypeScript compilation/bundling');
      console.log('5. CLI environment variables or context');

      // 7. 段階5: 具体的な調査ポイント
      console.log('\n🎯 Next investigation points:');
      console.log('1. Compare CLI loadTokenHolders() vs our direct test');
      console.log('2. Check if CLI uses different PublicKey import');
      console.log('3. Check if CLI has different dependency versions');
      console.log('4. Check CLI execution context and environment');

    } catch (error) {
      console.log('❌ FileStorage test failed:', error);
    }

    // クリーンアップ
    await fs.rm(testDir, { recursive: true });
    console.log('\n✅ Test directory cleaned up');

  } catch (error) {
    console.log('❌ Test failed:', error instanceof Error ? error.message : 'Unknown error');

    try {
      await fs.rm(testDir, { recursive: true });
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  }
}

// 実行
simpleDebugTest().catch(console.error);