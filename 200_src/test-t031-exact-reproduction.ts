import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// T031テストと全く同じ条件でのエラー再現テスト
async function exactT031Reproduction() {
  const timestamp = Date.now();
  const testDir = path.join(__dirname, '..', '400_test', '200_automation', 'temp', `t031-exact-repro-${timestamp}`);

  try {
    console.log('🔍 T031 Exact Reproduction Test');
    console.log('================================');

    // 1. T031テストと同じディレクトリ構造作成
    await fs.mkdir(testDir, { recursive: true });
    const dataDir = path.join(testDir, 'data');
    await fs.mkdir(dataDir, { recursive: true });
    console.log('✅ Test directory structure created');

    // 2. T031と同じtributary.toml
    const tomlContent = `[project]
name = "T031SmallDistTest"
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
    console.log('✅ T031-style tributary.toml created');

    // 3. T031と同じwallets.json（4人の受信者）
    const wallets = [
      { address: "D8zGvbM3w6bcAsnfWcZnWEz2GLeK7LPVftqwsMDCkcHk", balance: 2374.123485, percentage: 99.96 },
      { address: "22XkWSj5b7MT47ubmmFWjWr8jMDCgE5szc8wiVL79xv1", balance: 0.5, percentage: 0.02 },
      { address: "AKEWE7Bgh87GPvQHFhXi4bbpTC8GfrzFj1gqx9E2NM3A", balance: 0.25, percentage: 0.01 },
      { address: "9jyQm4cH8xgzBJGFJiWHDBLTqvGXNnDCPi4wXMo8LGDd", balance: 0.125, percentage: 0.01 }
    ];

    await fs.writeFile(path.join(dataDir, 'wallets.json'), JSON.stringify(wallets, null, 2));
    console.log('✅ T031-style wallets.json created with 4 recipients');

    // 4. T031と同じadmin-wallet.json
    const privateKeyArray = [150,246,237,252,156,214,60,223,98,126,155,100,109,247,100,224,243,44,239,204,5,25,218,224,48,55,64,22,103,62,60,201,180,88,17,191,20,144,160,45,223,50,74,128,194,98,67,174,100,192,92,255,61,156,47,177,30,244,17,75,206,29,195,159];
    const walletPath = path.join(testDir, 'admin-wallet.json');
    await fs.writeFile(walletPath, JSON.stringify(privateKeyArray, null, 2));
    console.log('✅ T031-style admin-wallet.json created');

    // 5. T031と同じ条件でCLI実行（0.001 amount）
    console.log('\\n🚀 Executing T031-exact CLI command...');
    const command = 'npx tributary distribute execute --amount 0.001 --wallet-file "' + walletPath + '" --batch-size 10 --confirm';
    console.log('Command:', command);

    try {
      const output = execSync(command, {
        cwd: testDir,
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 60000
      });

      console.log('\\n📊 UNEXPECTED SUCCESS:');
      console.log('T031-exact reproduction succeeded. This suggests the error is intermittent or context-dependent.');
      console.log('Output length:', output.length);
      console.log('\\nFirst 1000 chars:');
      console.log(output.substring(0, 1000));

    } catch (error: any) {
      console.log('\\n📊 EXPECTED FAILURE - T031 Error Reproduced:');
      console.log('Error status:', error.status);

      if (error.stdout) {
        console.log('\\n🔍 STDOUT Analysis:');
        console.log('Length:', error.stdout.length);

        // owner.toBufferエラーを探す
        if (error.stdout.includes('owner.toBuffer')) {
          console.log('✅ SUCCESS: Reproduced the exact T031 "owner.toBuffer" error');

          // エラー前後のコンテキストを詳細分析
          const lines = error.stdout.split('\\n');
          const errorLineIndex = lines.findIndex(line => line.includes('owner.toBuffer'));

          if (errorLineIndex >= 0) {
            console.log('\\n🎯 ERROR CONTEXT ANALYSIS:');
            console.log('Error at line:', errorLineIndex + 1);

            console.log('\\nBefore error (last 10 lines):');
            for (let i = Math.max(0, errorLineIndex - 10); i < errorLineIndex; i++) {
              console.log((i + 1) + ': ' + lines[i]);
            }

            console.log('\\n>>> ERROR LINE:');
            console.log((errorLineIndex + 1) + ': ' + lines[errorLineIndex]);

            console.log('\\nAfter error (next 5 lines):');
            for (let i = errorLineIndex + 1; i < Math.min(lines.length, errorLineIndex + 6); i++) {
              console.log((i + 1) + ': ' + lines[i]);
            }
          }

          // どの受信者で失敗したかチェック
          const recipientMatch = error.stdout.match(/recipient":"([^"]+)"/);
          if (recipientMatch) {
            const failedRecipient = recipientMatch[1];
            console.log('\\n👤 Failed recipient:', failedRecipient);

            // この受信者がwallets.json内の何番目かチェック
            const recipientIndex = wallets.findIndex(w => w.address === failedRecipient);
            if (recipientIndex >= 0) {
              console.log('Recipient index in wallets.json:', recipientIndex);
              console.log('Recipient details:', wallets[recipientIndex]);
            }
          }

        } else {
          console.log('❌ Different error - owner.toBuffer not found in output');
        }

        console.log('\\nFirst 2000 chars of STDOUT:');
        console.log(error.stdout.substring(0, 2000));
      }

      if (error.stderr) {
        console.log('\\n🔍 STDERR:');
        console.log(error.stderr);
      }
    }

    // 6. 次に、受信者を1人ずつ減らしてテスト
    console.log('\\n🧪 Progressive Recipient Testing...');

    for (let recipientCount = 4; recipientCount >= 1; recipientCount--) {
      console.log('\\n--- Testing with ' + recipientCount + ' recipients ---');

      const testWallets = wallets.slice(0, recipientCount);
      await fs.writeFile(path.join(dataDir, 'wallets.json'), JSON.stringify(testWallets, null, 2));

      try {
        const testOutput = execSync(command, {
          cwd: testDir,
          encoding: 'utf8',
          stdio: 'pipe',
          timeout: 30000
        });

        console.log('✅ SUCCESS with ' + recipientCount + ' recipients');

      } catch (testError: any) {
        console.log('❌ FAILED with ' + recipientCount + ' recipients');

        if (testError.stdout && testError.stdout.includes('owner.toBuffer')) {
          console.log('   → owner.toBuffer error reproduced');

          // 失敗した受信者をチェック
          const recipientMatch = testError.stdout.match(/recipient":"([^"]+)"/);
          if (recipientMatch) {
            const failedRecipient = recipientMatch[1];
            const failedIndex = testWallets.findIndex(w => w.address === failedRecipient);
            console.log('   → Failed on recipient index:', failedIndex, '(' + failedRecipient + ')');
          }
        }
      }
    }

    // 7. クリーンアップ
    await fs.rm(testDir, { recursive: true });
    console.log('\\n✅ Test directory cleaned up');

    console.log('\\n📊 T031 Exact Reproduction Summary:');
    console.log('1. Created exact T031 test conditions');
    console.log('2. Used same 4 recipients as T031');
    console.log('3. Used same 0.001 amount as T031');
    console.log('4. Analyzed error context and failed recipient');
    console.log('5. Tested progressive recipient reduction');

  } catch (error) {
    console.log('\\n❌ Test setup failed:', error instanceof Error ? error.message : 'Unknown error');

    try {
      await fs.rm(testDir, { recursive: true });
    } catch (cleanupError) {
      console.log('Warning: Could not clean up test directory:', cleanupError);
    }
  }
}

// 実行
exactT031Reproduction().catch(console.error);