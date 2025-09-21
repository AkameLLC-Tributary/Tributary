import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// 実際のCLI実行環境での問題を再現
async function testRealCLIExecution() {
  const timestamp = Date.now();
  const testDir = path.join(__dirname, '..', '400_test', '200_automation', 'temp', `real-cli-debug-${timestamp}`);

  try {
    console.log('🔍 Real CLI Execution Debug Test');
    console.log('=================================');
    console.log('Test directory:', testDir);

    // 1. テストディレクトリ作成
    await fs.mkdir(testDir, { recursive: true });
    console.log('✅ Test directory created');

    // 2. dataディレクトリ作成（重要：CLIはdata/wallets.jsonを参照）
    const dataDir = path.join(testDir, 'data');
    await fs.mkdir(dataDir, { recursive: true });
    console.log('✅ Data directory created');

    // 3. tributary.toml作成
    const tomlContent = `[project]
name = "RealCLIDebugTest"
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
level = "debug"
log_dir = "./logs"
enable_console = true
enable_file = true
max_files = 14
max_size = "20m"
`;

    const tomlPath = path.join(testDir, 'tributary.toml');
    await fs.writeFile(tomlPath, tomlContent);
    console.log('✅ tributary.toml created');

    // 4. data/wallets.json作成（CLIがこのパスを使用）
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

    // 5. admin-wallet.json作成
    const privateKeyArray = [150,246,237,252,156,214,60,223,98,126,155,100,109,247,100,224,243,44,239,204,5,25,218,224,48,55,64,22,103,62,60,201,180,88,17,191,20,144,160,45,223,50,74,128,194,98,67,174,100,192,92,255,61,156,47,177,30,244,17,75,206,29,195,159];
    const walletPath = path.join(testDir, 'admin-wallet.json');
    await fs.writeFile(walletPath, JSON.stringify(privateKeyArray, null, 2));
    console.log('✅ admin-wallet.json created');

    // 6. DistributionServiceにデバッグログを一時的に追加
    console.log('\\n🔧 Adding temporary debug logs to DistributionService...');

    const servicePath = path.join(__dirname, 'src', 'application', 'services', 'DistributionService.ts');
    const backupPath = servicePath + '.backup-debug';

    // バックアップ作成
    await fs.copyFile(servicePath, backupPath);
    console.log('✅ DistributionService backup created');

    // sendToken2022関数の直前にデバッグログを追加
    let serviceContent = await fs.readFile(servicePath, 'utf-8');

    // sendToken2022関数呼び出し前の詳細ログを追加
    const oldSendPattern = /(\s+const transactionId = await this\.sendToken2022\()/;
    const newSendPattern = `
      // === DEBUG: Detailed PublicKey inspection before sendToken2022 ===
      console.log('=== BEFORE sendToken2022 CALL ===');
      console.log('recipient:', recipient);
      console.log('recipient type:', typeof recipient);
      console.log('recipient instanceof PublicKey:', recipient instanceof PublicKey);
      console.log('recipient constructor:', recipient.constructor.name);
      console.log('recipient has toBuffer:', typeof recipient.toBuffer);
      console.log('tokenAddress:', tokenAddress);
      console.log('tokenAddress type:', typeof tokenAddress);
      console.log('tokenAddress instanceof PublicKey:', tokenAddress instanceof PublicKey);

      // Test toBuffer methods
      try {
        const recipientBuffer = recipient.toBuffer();
        console.log('✅ recipient.toBuffer() works, length:', recipientBuffer.length);
      } catch (e) {
        console.log('❌ recipient.toBuffer() ERROR:', e instanceof Error ? e.message : 'Unknown error');
      }

      try {
        const tokenBuffer = tokenAddress.toBuffer();
        console.log('✅ tokenAddress.toBuffer() works, length:', tokenBuffer.length);
      } catch (e) {
        console.log('❌ tokenAddress.toBuffer() ERROR:', e instanceof Error ? e.message : 'Unknown error');
      }
      console.log('=== CALLING sendToken2022 ===');

$1`;

    serviceContent = serviceContent.replace(oldSendPattern, newSendPattern);

    // sendToken2022関数内部の最初にもデバッグログを追加
    const sendFunctionPattern = /(private async sendToken2022\([^{]+\{)/;
    const sendFunctionDebug = `$1
    console.log('=== sendToken2022 FUNCTION CALLED ===');
    console.log('recipient:', recipient);
    console.log('recipient type:', typeof recipient);
    console.log('recipient instanceof PublicKey:', recipient instanceof PublicKey);
    console.log('amount:', amount);
    console.log('tokenAddress:', tokenAddress);
    console.log('tokenAddress type:', typeof tokenAddress);
    console.log('tokenAddress instanceof PublicKey:', tokenAddress instanceof PublicKey);
`;

    serviceContent = serviceContent.replace(sendFunctionPattern, sendFunctionDebug);

    await fs.writeFile(servicePath, serviceContent);
    console.log('✅ Debug logs added to DistributionService');

    // 7. 実際のCLI実行
    console.log('\\n🚀 Executing real CLI command...');
    const command = `npx tributary distribute execute --amount 0.01 --wallet-file "${walletPath}" --batch-size 5 --confirm`;
    console.log('Command:', command);

    try {
      const startTime = Date.now();
      const output = execSync(command, {
        cwd: testDir,
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 60000
      });
      const endTime = Date.now();

      console.log('\\n📊 CLI Execution Result:');
      console.log('✅ SUCCESS: CLI execution completed');
      console.log('Duration:', endTime - startTime, 'ms');
      console.log('\\n📝 Output:');
      console.log(output);

      console.log('\\n🎉 REAL CLI EXECUTION SUCCESSFUL!');
      console.log('The debug logs should show where PublicKey objects are valid.');

    } catch (error: any) {
      console.log('\\n❌ Real CLI Execution Failed:');
      console.log('Error code:', error.status);
      console.log('Signal:', error.signal);

      if (error.stdout) {
        console.log('\\n📝 STDOUT (contains debug info):');
        console.log(error.stdout);
      }

      if (error.stderr) {
        console.log('\\n📝 STDERR:');
        console.log(error.stderr);
      }

      // 特にowner.toBufferエラーの詳細分析
      if (error.stderr?.includes('owner.toBuffer') || error.stdout?.includes('owner.toBuffer')) {
        console.log('\\n🎯 ANALYSIS: owner.toBuffer error detected in real CLI');

        const debugOutput = (error.stdout || '') + (error.stderr || '');

        // デバッグ出力から詳細な情報を抽出
        if (debugOutput.includes('recipient.toBuffer() ERROR')) {
          console.log('\\n🔍 Found recipient.toBuffer() error in debug output');
          const recipientErrors = debugOutput.match(/recipient\.toBuffer\(\) ERROR:.+/g);
          if (recipientErrors) {
            recipientErrors.forEach(err => console.log('   ', err));
          }
        }

        if (debugOutput.includes('tokenAddress.toBuffer() ERROR')) {
          console.log('\\n🔍 Found tokenAddress.toBuffer() error in debug output');
          const tokenErrors = debugOutput.match(/tokenAddress\.toBuffer\(\) ERROR:.+/g);
          if (tokenErrors) {
            tokenErrors.forEach(err => console.log('   ', err));
          }
        }
      }

      console.log('\\n🔍 Error Analysis:');
      console.log('Real CLI execution failed where programmatic CLI-style succeeded.');
      console.log('This indicates an environment-specific issue in actual CLI execution.');
    }

    // 8. DistributionService復元
    console.log('\\n🔧 Restoring DistributionService...');
    await fs.copyFile(backupPath, servicePath);
    await fs.unlink(backupPath);
    console.log('✅ DistributionService restored');

    // 9. クリーンアップ
    await fs.rm(testDir, { recursive: true });
    console.log('✅ Test directory cleaned up');

  } catch (error) {
    console.log('\\n❌ Test setup failed:', error instanceof Error ? error.message : 'Unknown error');
    console.log('Error details:', error);

    // 復元を試行
    try {
      const servicePath = path.join(__dirname, 'src', 'application', 'services', 'DistributionService.ts');
      const backupPath = servicePath + '.backup-debug';

      if (await fs.access(backupPath).then(() => true, () => false)) {
        await fs.copyFile(backupPath, servicePath);
        await fs.unlink(backupPath);
        console.log('✅ DistributionService restored from backup');
      }
    } catch (restoreError) {
      console.log('⚠️ Warning: Could not restore DistributionService:', restoreError);
    }

    try {
      await fs.rm(testDir, { recursive: true });
    } catch (cleanupError) {
      console.log('Warning: Could not clean up test directory:', cleanupError);
    }
  }
}

// 実行
testRealCLIExecution().catch(console.error);