import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// 安定した解決策のテスト
async function testStableSolution() {
  console.log('🔧 Testing Stable Solution for Intermittent PublicKey Error');
  console.log('=========================================================');

  const testRuns = 5;
  const results = [];

  for (let i = 1; i <= testRuns; i++) {
    console.log('\\n🔄 Test Run ' + i + ' of ' + testRuns);
    console.log('----------------------------------------');

    const timestamp = Date.now();
    const testDir = path.join(__dirname, '..', '400_test', '200_automation', 'temp', 'stable-test-' + timestamp);

    try {
      // テスト環境作成
      await fs.mkdir(testDir, { recursive: true });
      const dataDir = path.join(testDir, 'data');
      await fs.mkdir(dataDir, { recursive: true });

      // 設定ファイル作成
      const tomlContent = `[project]
name = "StableTest${i}"
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

      // T031と同じwallets.json
      const wallets = [
        { address: "D8zGvbM3w6bcAsnfWcZnWEz2GLeK7LPVftqwsMDCkcHk", balance: 2374.123485, percentage: 99.96 },
        { address: "22XkWSj5b7MT47ubmmFWjWr8jMDCgE5szc8wiVL79xv1", balance: 0.5, percentage: 0.02 },
        { address: "AKEWE7Bgh87GPvQHFhXi4bbpTC8GfrzFj1gqx9E2NM3A", balance: 0.25, percentage: 0.01 },
        { address: "9jyQm4cH8xgzBJGFJiWHDBLTqvGXNnDCPi4wXMo8LGDd", balance: 0.125, percentage: 0.01 }
      ];

      await fs.writeFile(path.join(dataDir, 'wallets.json'), JSON.stringify(wallets, null, 2));

      const privateKeyArray = [150,246,237,252,156,214,60,223,98,126,155,100,109,247,100,224,243,44,239,204,5,25,218,224,48,55,64,22,103,62,60,201,180,88,17,191,20,144,160,45,223,50,74,128,194,98,67,174,100,192,92,255,61,156,47,177,30,244,17,75,206,29,195,159];
      const walletPath = path.join(testDir, 'admin-wallet.json');
      await fs.writeFile(walletPath, JSON.stringify(privateKeyArray, null, 2));

      // CLI実行
      const command = 'npx tributary distribute execute --amount 0.001 --wallet-file "' + walletPath + '" --batch-size 10 --confirm';

      const startTime = Date.now();

      try {
        const output = execSync(command, {
          cwd: testDir,
          encoding: 'utf8',
          stdio: 'pipe',
          timeout: 60000
        });

        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log('✅ Run ' + i + ': SUCCESS (' + duration + 'ms)');

        // 成功の場合、トランザクションIDを確認
        const txMatch = output.match(/([A-Za-z0-9]{87,88})/g);
        const transactionCount = txMatch ? txMatch.length : 0;

        results.push({
          run: i,
          status: 'SUCCESS',
          duration: duration,
          transactionCount: transactionCount,
          error: null
        });

      } catch (error: any) {
        const endTime = Date.now();
        const duration = endTime - startTime;

        let errorType = 'UNKNOWN';
        let failedRecipient = null;

        if (error.stdout && error.stdout.includes('owner.toBuffer')) {
          errorType = 'OWNER_TOBUFFER';

          const recipientMatch = error.stdout.match(/recipient":"([^"]+)"/);
          if (recipientMatch) {
            failedRecipient = recipientMatch[1];
          }
        } else if (error.stderr) {
          errorType = 'STDERR_ERROR';
        }

        console.log('❌ Run ' + i + ': FAILED (' + duration + 'ms) - ' + errorType);
        if (failedRecipient) {
          console.log('   Failed on: ' + failedRecipient);
        }

        results.push({
          run: i,
          status: 'FAILED',
          duration: duration,
          transactionCount: 0,
          error: errorType,
          failedRecipient: failedRecipient
        });
      }

      // クリーンアップ
      await fs.rm(testDir, { recursive: true });

      // 実行間の遅延（メモリ状態をリセット）
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (setupError) {
      console.log('❌ Run ' + i + ': SETUP FAILED');
      results.push({
        run: i,
        status: 'SETUP_FAILED',
        duration: 0,
        transactionCount: 0,
        error: 'SETUP_ERROR'
      });

      try {
        await fs.rm(testDir, { recursive: true });
      } catch (cleanupError) {
        // Ignore
      }
    }
  }

  // 結果分析
  console.log('\\n📊 Stability Test Results Analysis');
  console.log('=====================================');

  const successCount = results.filter(r => r.status === 'SUCCESS').length;
  const failureCount = results.filter(r => r.status === 'FAILED').length;
  const setupFailures = results.filter(r => r.status === 'SETUP_FAILED').length;

  console.log('Total runs: ' + testRuns);
  console.log('Successful: ' + successCount + ' (' + ((successCount / testRuns) * 100).toFixed(1) + '%)');
  console.log('Failed: ' + failureCount + ' (' + ((failureCount / testRuns) * 100).toFixed(1) + '%)');
  console.log('Setup errors: ' + setupFailures);

  if (results.length > 0) {
    console.log('\\n📋 Detailed Results:');
    results.forEach(result => {
      const statusIcon = result.status === 'SUCCESS' ? '✅' : '❌';
      let line = statusIcon + ' Run ' + result.run + ': ' + result.status + ' (' + result.duration + 'ms)';

      if (result.status === 'SUCCESS' && result.transactionCount > 0) {
        line += ' - ' + result.transactionCount + ' transactions';
      } else if (result.status === 'FAILED') {
        line += ' - ' + result.error;
        if (result.failedRecipient) {
          line += ' (' + result.failedRecipient.substring(0, 8) + '...)';
        }
      }

      console.log(line);
    });
  }

  // エラーパターン分析
  const ownerToBufferErrors = results.filter(r => r.error === 'OWNER_TOBUFFER');
  if (ownerToBufferErrors.length > 0) {
    console.log('\\n🎯 owner.toBuffer Error Analysis:');
    console.log('Frequency: ' + ownerToBufferErrors.length + '/' + testRuns + ' runs');

    const recipients = ownerToBufferErrors.map(r => r.failedRecipient).filter(r => r);
    if (recipients.length > 0) {
      console.log('Failed recipients:');
      recipients.forEach((recipient, index) => {
        console.log('  ' + (index + 1) + '. ' + recipient);
      });
    }
  }

  console.log('\\n💡 Stability Assessment:');
  if (successCount === testRuns) {
    console.log('🎉 EXCELLENT: All tests passed - issue appears to be resolved');
  } else if (successCount >= testRuns * 0.8) {
    console.log('✅ GOOD: Most tests passed (' + successCount + '/' + testRuns + ') - significant improvement');
  } else if (successCount >= testRuns * 0.5) {
    console.log('⚠️ MODERATE: About half passed (' + successCount + '/' + testRuns + ') - partial improvement');
  } else {
    console.log('❌ POOR: Most tests failed (' + failureCount + '/' + testRuns + ') - issue persists');
  }

  console.log('\\n🔄 Next steps based on results:');
  if (ownerToBufferErrors.length > 0) {
    console.log('1. The owner.toBuffer error still occurs intermittently');
    console.log('2. Current safeCreatePublicKey implementation needs enhancement');
    console.log('3. Consider additional robustness measures');
  } else {
    console.log('1. No owner.toBuffer errors detected in this test set');
    console.log('2. Current implementation appears effective');
    console.log('3. Monitor production usage for stability');
  }
}

// 実行
testStableSolution().catch(console.error);