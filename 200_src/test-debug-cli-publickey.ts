import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// CLIでのPublicKey処理を詳細にデバッグするテスト
async function debugCLIPublicKey() {
  const timestamp = Date.now();
  const testDir = path.join(__dirname, '..', '400_test', '200_automation', 'temp', `debug-cli-${timestamp}`);

  try {
    console.log('🔍 Debug CLI PublicKey Processing');
    console.log('==================================');

    // 1. テストディレクトリ作成
    await fs.mkdir(testDir, { recursive: true });
    const dataDir = path.join(testDir, 'data');
    await fs.mkdir(dataDir, { recursive: true });

    // 2. tributary.toml作成
    const tomlContent = `[project]
name = "DebugCLIProject"
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

    await fs.writeFile(path.join(testDir, 'tributary.toml'), tomlContent);

    // 3. wallets.json作成
    const wallets = [
      {
        address: '22XkWSj5b7MT47ubmmFWjWr8jMDCgE5szc8wiVL79xv1',
        balance: 1000,
        percentage: 100
      }
    ];

    await fs.writeFile(path.join(dataDir, 'wallets.json'), JSON.stringify(wallets, null, 2));

    // 4. admin-wallet.json作成
    const privateKeyArray = [150,246,237,252,156,214,60,223,98,126,155,100,109,247,100,224,243,44,239,204,5,25,218,224,48,55,64,22,103,62,60,201,180,88,17,191,20,144,160,45,223,50,74,128,194,98,67,174,100,192,92,255,61,156,47,177,30,244,17,75,206,29,195,159];
    const walletPath = path.join(testDir, 'admin-wallet.json');
    await fs.writeFile(walletPath, JSON.stringify(privateKeyArray, null, 2));

    console.log('✅ Test environment created');

    // 5. まず、DistributionServiceに追加のデバッグログを挿入
    console.log('\n🔧 Adding debug logs to DistributionService...');

    // DistributionServiceファイルのバックアップを作成
    const originalServicePath = path.join(__dirname, 'src', 'application', 'services', 'DistributionService.ts');
    const backupServicePath = originalServicePath + '.backup';

    try {
      await fs.copyFile(originalServicePath, backupServicePath);
      console.log('✅ DistributionService backup created');

      // loadTokenHolders関数にデバッグログを追加
      let serviceContent = await fs.readFile(originalServicePath, 'utf-8');

      // CLI実行時のloadTokenHolders関数を見つけて詳細なデバッグを追加
      const originalLoadFunction = `  private async loadTokenHolders(): Promise<TokenHolder[]> {
    try {
      interface RawTokenHolder {
        address: string;
        balance: number;
        percentage: number;
      }
      const rawHolders = await this.storage.readJson<RawTokenHolder[]>('wallets.json');
      return rawHolders.map(holder => ({
        address: new PublicKey(holder.address),
        balance: holder.balance,
        percentage: holder.percentage
      }));
    } catch {
      return [];
    }
  }`;

      const debugLoadFunction = `  private async loadTokenHolders(): Promise<TokenHolder[]> {
    try {
      interface RawTokenHolder {
        address: string;
        balance: number;
        percentage: number;
      }

      console.log('🔍 DEBUG: loadTokenHolders called');
      const rawHolders = await this.storage.readJson<RawTokenHolder[]>('wallets.json');
      console.log('🔍 DEBUG: Raw holders loaded:', rawHolders);

      const convertedHolders = rawHolders.map((holder, index) => {
        console.log(\`🔍 DEBUG: Converting holder \${index + 1}:\`);
        console.log(\`  Original address: \${holder.address}\`);
        console.log(\`  Address type: \${typeof holder.address}\`);

        const publicKey = new PublicKey(holder.address);
        console.log(\`  PublicKey created: \${publicKey.toString()}\`);
        console.log(\`  PublicKey type: \${typeof publicKey}\`);
        console.log(\`  PublicKey instanceof PublicKey: \${publicKey instanceof PublicKey}\`);
        console.log(\`  PublicKey constructor: \${publicKey.constructor.name}\`);
        console.log(\`  PublicKey has toBuffer: \${typeof publicKey.toBuffer}\`);

        // toBuffer()テスト
        try {
          const buffer = publicKey.toBuffer();
          console.log(\`  toBuffer() works: true, result type: \${typeof buffer}\`);
        } catch (e) {
          console.log(\`  toBuffer() ERROR: \${e instanceof Error ? e.message : 'Unknown error'}\`);
        }

        const convertedHolder = {
          address: publicKey,
          balance: holder.balance,
          percentage: holder.percentage
        };

        console.log(\`  Final holder address type: \${typeof convertedHolder.address}\`);
        console.log(\`  Final holder address instanceof PublicKey: \${convertedHolder.address instanceof PublicKey}\`);

        return convertedHolder;
      });

      console.log('🔍 DEBUG: All holders converted successfully');
      console.log(\`🔍 DEBUG: Converted holders count: \${convertedHolders.length}\`);

      return convertedHolders;
    } catch (error) {
      console.log('🔍 DEBUG: Error in loadTokenHolders:', error);
      return [];
    }
  }`;

      // CLI index.tsでloadTokenHolders関数を見つけて置き換え
      const originalCLIPath = path.join(__dirname, 'src', 'presentation', 'cli', 'index.ts');
      const backupCLIPath = originalCLIPath + '.backup';

      await fs.copyFile(originalCLIPath, backupCLIPath);
      console.log('✅ CLI index.ts backup created');

      let cliContent = await fs.readFile(originalCLIPath, 'utf-8');
      cliContent = cliContent.replace(originalLoadFunction, debugLoadFunction);

      await fs.writeFile(originalCLIPath, cliContent);
      console.log('✅ Debug logs added to CLI');

      // 6. CLIを実行してデバッグ出力を確認
      console.log('\n🚀 Executing CLI with debug logs...');

      const command = `npx tributary distribute execute --amount 0.01 --wallet-file "${walletPath}" --batch-size 5 --confirm`;

      try {
        const output = execSync(command, {
          cwd: testDir,
          encoding: 'utf8',
          stdio: 'pipe',
          timeout: 60000
        });

        console.log('\n📝 CLI Output with Debug Info:');
        console.log(output);

      } catch (error: any) {
        console.log('\n📝 CLI Failed - Debug Output:');

        if (error.stdout) {
          console.log('\n🔍 STDOUT (contains debug info):');
          console.log(error.stdout);
        }

        if (error.stderr) {
          console.log('\n🔍 STDERR:');
          console.log(error.stderr);
        }

        // owner.toBufferエラーの詳細な分析
        if (error.stderr?.includes('owner.toBuffer') || error.stdout?.includes('owner.toBuffer')) {
          console.log('\n🎯 ANALYSIS: owner.toBuffer error detected');
          console.log('Looking for patterns in debug output...');

          const debugOutput = error.stdout || '';

          // toBuffer() ERRORパターンを探す
          const toBufferErrors = debugOutput.match(/toBuffer\(\) ERROR: .+/g);
          if (toBufferErrors) {
            console.log('\n🔍 Found toBuffer() errors:');
            toBufferErrors.forEach((errorMsg: string) => console.log('   ', errorMsg));
          }

          // PublicKey作成の失敗パターンを探す
          const publicKeyErrors = debugOutput.match(/PublicKey .+ false/g);
          if (publicKeyErrors) {
            console.log('\n🔍 Found PublicKey validation failures:');
            publicKeyErrors.forEach((errorMsg: string) => console.log('   ', errorMsg));
          }
        }
      }

      // 7. ファイルを復元
      console.log('\n🔧 Restoring original files...');
      await fs.copyFile(backupCLIPath, originalCLIPath);
      await fs.unlink(backupCLIPath);
      console.log('✅ CLI index.ts restored');

    } catch (debugError) {
      console.log('❌ Debug modification failed:', debugError);

      // 復元を試行
      try {
        if (await fs.access(backupServicePath).then(() => true, () => false)) {
          await fs.copyFile(backupServicePath, originalServicePath);
          await fs.unlink(backupServicePath);
        }
        const backupCLIPath = path.join(__dirname, 'src', 'presentation', 'cli', 'index.ts') + '.backup';
        if (await fs.access(backupCLIPath).then(() => true, () => false)) {
          await fs.copyFile(backupCLIPath, path.join(__dirname, 'src', 'presentation', 'cli', 'index.ts'));
          await fs.unlink(backupCLIPath);
        }
      } catch (restoreError) {
        console.log('⚠️ Warning: Could not restore files:', restoreError);
      }
    }

    // 8. クリーンアップ
    await fs.rm(testDir, { recursive: true });
    console.log('✅ Test directory cleaned up');

  } catch (error) {
    console.log('❌ Debug test failed:', error instanceof Error ? error.message : 'Unknown error');
    console.log('Error details:', error);

    try {
      await fs.rm(testDir, { recursive: true });
    } catch (cleanupError) {
      console.log('Warning: Could not clean up test directory:', cleanupError);
    }
  }
}

// 実行
debugCLIPublicKey().catch(console.error);