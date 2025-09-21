import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// T031テストと完全に同じ条件でテスト（data ディレクトリを含む）
async function testCLIExecutionWithDataDir() {
  const timestamp = Date.now();
  const testDir = path.join(__dirname, '..', '400_test', '200_automation', 'temp', `cli-data-test-${timestamp}`);

  try {
    console.log('🚀 Step 10: CLI with Data Directory Test');
    console.log('========================================');
    console.log('Test directory:', testDir);

    // 1. テストディレクトリ作成
    await fs.mkdir(testDir, { recursive: true });
    console.log('✅ Test directory created');

    // 2. dataディレクトリ作成
    const dataDir = path.join(testDir, 'data');
    await fs.mkdir(dataDir, { recursive: true });
    console.log('✅ Data directory created');

    // 3. tributary.toml作成（T031と同じ内容）
    const tomlContent = `[project]
name = "CLIDataTestProject"
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

    const tomlPath = path.join(testDir, 'tributary.toml');
    await fs.writeFile(tomlPath, tomlContent);
    console.log('✅ tributary.toml created');

    // 4. data/wallets.json作成（T031と同じ内容）
    const wallets = [
      {
        address: '22XkWSj5b7MT47ubmmFWjWr8jMDCgE5szc8wiVL79xv1',
        balance: 1000,
        percentage: 100
      }
    ];

    const walletsPath = path.join(dataDir, 'wallets.json');
    await fs.writeFile(walletsPath, JSON.stringify(wallets, null, 2));
    console.log('✅ data/wallets.json created');

    // 5. admin-wallet.json作成（T031と同じ内容）
    const privateKeyArray = [150,246,237,252,156,214,60,223,98,126,155,100,109,247,100,224,243,44,239,204,5,25,218,224,48,55,64,22,103,62,60,201,180,88,17,191,20,144,160,45,223,50,74,128,194,98,67,174,100,192,92,255,61,156,47,177,30,244,17,75,206,29,195,159];
    const walletPath = path.join(testDir, 'admin-wallet.json');
    await fs.writeFile(walletPath, JSON.stringify(privateKeyArray, null, 2));
    console.log('✅ admin-wallet.json created');

    // 6. ファイル構成確認
    console.log('\n📂 File structure:');
    console.log('testDir/', testDir);
    console.log('├── tributary.toml');
    console.log('├── admin-wallet.json');
    console.log('└── data/');
    console.log('    └── wallets.json');

    // 7. ファイル内容確認
    const walletsContent = await fs.readFile(walletsPath, 'utf-8');
    console.log('\n📄 wallets.json content:');
    console.log(walletsContent);

    // 8. 実際のCLI実行（T031と完全同一）
    console.log('\n🚀 Executing CLI command...');
    console.log('Command: npx tributary distribute execute --amount 0.02 --wallet-file "admin-wallet.json" --batch-size 5 --confirm');

    const command = `npx tributary distribute execute --amount 0.02 --wallet-file "${walletPath}" --batch-size 5 --confirm`;

    try {
      const startTime = Date.now();
      const output = execSync(command, {
        cwd: testDir,
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 60000
      });
      const endTime = Date.now();

      console.log('\n📊 CLI Execution Result:');
      console.log('✅ SUCCESS: CLI execution completed');
      console.log('Duration:', endTime - startTime, 'ms');
      console.log('\n📝 Output:');
      console.log(output);

      // 成功パターンの分析
      if (output.includes('Distribution completed') || output.includes('successful')) {
        console.log('\n🎉 CLI EXECUTION SUCCESSFUL!');
        console.log('This means the T031 error does not occur in this test setup.');

        // トランザクションIDを抽出
        const txMatch = output.match(/([A-Za-z0-9]{87,88})/g);
        if (txMatch) {
          console.log('\n🔗 Transaction found:');
          txMatch.forEach(tx => {
            console.log(`   TX: ${tx}`);
            console.log(`   Explorer: https://explorer.solana.com/tx/${tx}?cluster=testnet`);
          });
        }
      } else {
        console.log('\n⚠️ CLI execution completed but output unclear');
      }

    } catch (error: any) {
      console.log('\n❌ CLI Execution Failed:');
      console.log('Error code:', error.status);
      console.log('Signal:', error.signal);

      if (error.stdout) {
        console.log('\n📝 STDOUT:');
        console.log(error.stdout);
      }

      if (error.stderr) {
        console.log('\n📝 STDERR:');
        console.log(error.stderr);

        // "owner.toBuffer" エラーをチェック
        if (error.stderr.includes('owner.toBuffer')) {
          console.log('\n🔍 FOUND THE T031 ERROR!');
          console.log('The "owner.toBuffer is not a function" error occurred during CLI execution.');
          console.log('This reproduces the exact T031 test error.');
          console.log('\n🎯 Next step: Investigate the difference between:');
          console.log('   - Direct DistributionService usage (working)');
          console.log('   - CLI execution via TribuaryCLI (failing)');
        }
      }

      console.log('\nFull error details:', error);
    }

    console.log('\n🧹 Cleaning up test directory...');
    await fs.rm(testDir, { recursive: true });
    console.log('✅ Test directory cleaned up');

  } catch (error) {
    console.log('\n❌ Test setup failed:', error instanceof Error ? error.message : 'Unknown error');
    console.log('Error details:', error);

    // クリーンアップ
    try {
      await fs.rm(testDir, { recursive: true });
    } catch (cleanupError) {
      console.log('Warning: Could not clean up test directory:', cleanupError);
    }
  }
}

// 実行
testCLIExecutionWithDataDir().catch(console.error);