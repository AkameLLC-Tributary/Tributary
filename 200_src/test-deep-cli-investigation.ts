import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// CLI実行環境の深層レベル調査
async function deepCLIInvestigation() {
  const timestamp = Date.now();
  const testDir = path.join(__dirname, '..', '400_test', '200_automation', 'temp', `deep-cli-investigation-${timestamp}`);

  try {
    console.log('🔍 Deep CLI Investigation: Identifying Root Cause');
    console.log('====================================================');

    // 1. テスト環境作成
    await fs.mkdir(testDir, { recursive: true });
    const dataDir = path.join(testDir, 'data');
    await fs.mkdir(dataDir, { recursive: true });
    console.log('✅ Test environment created');

    // 2. 設定ファイル作成
    const tomlContent = `[project]
name = "DeepCLIInvestigation"
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

    const wallets = [{ address: '22XkWSj5b7MT47ubmmFWjWr8jMDCgE5szc8wiVL79xv1', balance: 1000, percentage: 100 }];
    await fs.writeFile(path.join(dataDir, 'wallets.json'), JSON.stringify(wallets, null, 2));

    const privateKeyArray = [150,246,237,252,156,214,60,223,98,126,155,100,109,247,100,224,243,44,239,204,5,25,218,224,48,55,64,22,103,62,60,201,180,88,17,191,20,144,160,45,223,50,74,128,194,98,67,174,100,192,92,255,61,156,47,177,30,244,17,75,206,29,195,159];
    const walletPath = path.join(testDir, 'admin-wallet.json');
    await fs.writeFile(walletPath, JSON.stringify(privateKeyArray, null, 2));

    console.log('✅ Configuration files created');

    // 3. DistributionServiceに極めて詳細なデバッグログを追加
    console.log('\\n🔧 Adding comprehensive debugging to DistributionService...');

    const servicePath = path.join(__dirname, 'src', 'application', 'services', 'DistributionService.ts');
    const backupPath = servicePath + '.deep-debug-backup';

    await fs.copyFile(servicePath, backupPath);
    let serviceContent = await fs.readFile(servicePath, 'utf-8');

    // safeCreatePublicKey関数に極めて詳細なログを追加
    const oldSafeCreatePattern = /(private safeCreatePublicKey\(pubkey: PublicKey \| string\): PublicKey \{[\s\S]*?return newKey;[\s\S]*?\})/;
    const newSafeCreatePattern = `private safeCreatePublicKey(pubkey: PublicKey | string): PublicKey {
    console.log('=== DEEP DEBUG: safeCreatePublicKey called ===');
    console.log('Input type:', typeof pubkey);
    console.log('Input value:', pubkey.toString());
    console.log('Input constructor:', pubkey.constructor.name);

    if (typeof pubkey !== 'string') {
      console.log('Input instanceof PublicKey:', pubkey instanceof PublicKey);
      console.log('Input has toBuffer:', typeof pubkey.toBuffer);
    }

    try {
      // 文字列またはPublicKeyから新しいPublicKeyオブジェクトを作成
      const keyString = typeof pubkey === 'string' ? pubkey : pubkey.toString();
      console.log('Creating new PublicKey from string:', keyString);

      const newKey = new PublicKey(keyString);
      console.log('New PublicKey created successfully');
      console.log('New key type:', typeof newKey);
      console.log('New key constructor:', newKey.constructor.name);
      console.log('New key instanceof PublicKey:', newKey instanceof PublicKey);
      console.log('New key prototype:', Object.getPrototypeOf(newKey));
      console.log('New key has toBuffer method:', typeof newKey.toBuffer);
      console.log('New key toString():', newKey.toString());

      // プロトタイプチェーンの詳細調査
      console.log('=== PROTOTYPE CHAIN ANALYSIS ===');
      let proto = Object.getPrototypeOf(newKey);
      let level = 0;
      while (proto && level < 5) {
        console.log('Prototype level ' + level + ':', proto.constructor.name);
        console.log('  Has toBuffer: ' + typeof proto.toBuffer);
        console.log('  Methods: ' + Object.getOwnPropertyNames(proto).filter(name => typeof proto[name] === 'function'));
        proto = Object.getPrototypeOf(proto);
        level++;
      }

      // toBufferメソッドが利用可能であることを確認
      if (typeof newKey.toBuffer !== 'function') {
        console.log('=== CRITICAL: toBuffer method missing ===');
        console.log('Attempting prototype restoration...');

        this.logger.error('PublicKey object missing toBuffer method', {
          keyString,
          keyType: typeof newKey,
          hasToBuffer: typeof newKey.toBuffer,
          constructor: newKey.constructor.name,
          prototype: Object.getPrototypeOf(newKey)
        });

        // プロトタイプが破損している場合の強制的な修復
        if (newKey.constructor.name === 'PublicKey' && !newKey.toBuffer) {
          console.log('Attempting to restore PublicKey prototype...');

          // PublicKeyプロトタイプからtoBufferメソッドを取得して追加
          Object.setPrototypeOf(newKey, PublicKey.prototype);
          console.log('Prototype restored, checking toBuffer again...');
          console.log('After restoration - has toBuffer:', typeof newKey.toBuffer);

          // それでも動作しない場合はエラー
          if (typeof newKey.toBuffer !== 'function') {
            console.log('FATAL: Prototype restoration failed');
            throw new Error('Failed to restore toBuffer method for PublicKey: ' + keyString);
          }

          console.log('SUCCESS: PublicKey prototype restored');
          this.logger.warn('PublicKey prototype restored', { keyString });
        } else {
          console.log('FATAL: Cannot restore toBuffer method');
          throw new Error('PublicKey object missing toBuffer method: ' + keyString);
        }
      } else {
        console.log('SUCCESS: toBuffer method available');
      }

      // toBufferメソッドの実際のテスト
      console.log('=== TESTING toBuffer METHOD ===');
      try {
        const buffer = newKey.toBuffer();
        console.log('toBuffer() test successful, buffer type:', typeof buffer);
        console.log('Buffer length:', buffer.length);
        console.log('Buffer constructor:', buffer.constructor.name);
      } catch (testError) {
        console.log('CRITICAL: toBuffer() test failed:', testError instanceof Error ? testError.message : testError);
        throw testError;
      }

      console.log('=== safeCreatePublicKey completed successfully ===');
      return newKey;
    } catch (error) {
      console.log('=== FATAL ERROR in safeCreatePublicKey ===');
      console.log('Error:', error instanceof Error ? error.message : error);
      console.log('Stack:', error instanceof Error ? error.stack : 'No stack');

      this.logger.error('Failed to create safe PublicKey', {
        originalInput: typeof pubkey === 'string' ? pubkey : pubkey.toString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }`;

    serviceContent = serviceContent.replace(oldSafeCreatePattern, newSafeCreatePattern);

    // createTransferCheckedInstruction呼び出し直前に詳細ログを追加
    const transferInstructionPattern = /(const transferInstruction = createTransferCheckedInstruction\()/;
    const transferInstructionDebug = `console.log('=== DEEP DEBUG: Creating Transfer Instruction ===');
    console.log('About to call createTransferCheckedInstruction with:');
    console.log('  safeAdminTokenAccount:', safeAdminTokenAccount.toString());
    console.log('  safeAdminTokenAccount type:', typeof safeAdminTokenAccount);
    console.log('  safeAdminTokenAccount instanceof PublicKey:', safeAdminTokenAccount instanceof PublicKey);
    console.log('  safeAdminTokenAccount has toBuffer:', typeof safeAdminTokenAccount.toBuffer);
    console.log('  safeCleanTokenAddress:', safeCleanTokenAddress.toString());
    console.log('  safeCleanTokenAddress type:', typeof safeCleanTokenAddress);
    console.log('  safeRecipientTokenAccount:', safeRecipientTokenAccount.toString());
    console.log('  safeCleanOwner:', safeCleanOwner.toString());
    console.log('  safeCleanOwner type:', typeof safeCleanOwner);
    console.log('  safeCleanOwner instanceof PublicKey:', safeCleanOwner instanceof PublicKey);
    console.log('  safeCleanOwner has toBuffer:', typeof safeCleanOwner.toBuffer);
    console.log('  adjustedAmount:', adjustedAmount);
    console.log('  decimals:', decimals);

    // 各PublicKeyオブジェクトのtoBufferテスト
    try {
      console.log('Testing safeAdminTokenAccount.toBuffer()...');
      const buf1 = safeAdminTokenAccount.toBuffer();
      console.log('  SUCCESS: safeAdminTokenAccount.toBuffer() works');
    } catch (e) {
      console.log('  ERROR: safeAdminTokenAccount.toBuffer() failed:', e instanceof Error ? e.message : e);
    }

    try {
      console.log('Testing safeCleanTokenAddress.toBuffer()...');
      const buf2 = safeCleanTokenAddress.toBuffer();
      console.log('  SUCCESS: safeCleanTokenAddress.toBuffer() works');
    } catch (e) {
      console.log('  ERROR: safeCleanTokenAddress.toBuffer() failed:', e instanceof Error ? e.message : e);
    }

    try {
      console.log('Testing safeRecipientTokenAccount.toBuffer()...');
      const buf3 = safeRecipientTokenAccount.toBuffer();
      console.log('  SUCCESS: safeRecipientTokenAccount.toBuffer() works');
    } catch (e) {
      console.log('  ERROR: safeRecipientTokenAccount.toBuffer() failed:', e instanceof Error ? e.message : e);
    }

    try {
      console.log('Testing safeCleanOwner.toBuffer()...');
      const buf4 = safeCleanOwner.toBuffer();
      console.log('  SUCCESS: safeCleanOwner.toBuffer() works');
    } catch (e) {
      console.log('  ERROR: safeCleanOwner.toBuffer() failed:', e instanceof Error ? e.message : e);
    }

    console.log('Creating transfer instruction now...');

    $1`;

    serviceContent = serviceContent.replace(transferInstructionPattern, transferInstructionDebug);

    await fs.writeFile(servicePath, serviceContent);
    console.log('✅ Comprehensive debugging added');

    // 4. CLI実行と詳細な出力解析
    console.log('\\n🚀 Executing CLI with comprehensive debugging...');
    const command = 'npx tributary distribute execute --amount 0.01 --wallet-file "' + walletPath + '" --batch-size 5 --confirm';

    try {
      const output = execSync(command, {
        cwd: testDir,
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 60000
      });

      console.log('\\n📝 CLI Output Analysis:');
      console.log('Command executed successfully. This should not happen if the error is consistent.');
      console.log('Output length:', output.length);
      console.log('Full output:');
      console.log(output);

    } catch (error: any) {
      console.log('\\n📝 CLI Failed - Detailed Analysis:');

      const fullOutput = (error.stdout || '') + (error.stderr || '');
      console.log('Total output length:', fullOutput.length);

      if (error.stdout) {
        console.log('\\n🔍 STDOUT Analysis:');
        console.log('STDOUT length:', error.stdout.length);

        // safeCreatePublicKey呼び出しログを検索
        const safeCreateCalls = error.stdout.match(/=== DEEP DEBUG: safeCreatePublicKey called ===/g);
        if (safeCreateCalls) {
          console.log('Found ' + safeCreateCalls.length + ' safeCreatePublicKey calls');
        }

        // toBufferテストの結果を検索
        const toBufferTests = error.stdout.match(/Testing .+ toBuffer\\(\\)\\.\\.\\./g);
        if (toBufferTests) {
          console.log('Found toBuffer tests:', toBufferTests.length);
          toBufferTests.forEach(test => console.log('  ', test));
        }

        // エラーメッセージを検索
        const toBufferErrors = error.stdout.match(/ERROR: .+ toBuffer\\(\\) failed: .+/g);
        if (toBufferErrors) {
          console.log('\\n🎯 FOUND toBuffer ERRORS in STDOUT:');
          toBufferErrors.forEach((err, index) => {
            console.log('  ' + (index + 1) + '. ' + err);
          });
        }

        // プロトタイプ復元ログを検索
        const prototypeRestoration = error.stdout.match(/Attempting to restore PublicKey prototype/g);
        if (prototypeRestoration) {
          console.log('Found ' + prototypeRestoration.length + ' prototype restoration attempts');
        }

        console.log('\\nFirst 2000 chars of STDOUT:');
        console.log(error.stdout.substring(0, 2000));
      }

      if (error.stderr) {
        console.log('\\n🔍 STDERR Analysis:');
        console.log('STDERR length:', error.stderr.length);
        console.log('STDERR content:');
        console.log(error.stderr);
      }

      // owner.toBufferエラーの詳細分析
      if (fullOutput.includes('owner.toBuffer')) {
        console.log('\\n🎯 CRITICAL ANALYSIS: owner.toBuffer error found');
        console.log('Searching for the exact context...');

        const lines = fullOutput.split('\\n');
        const errorLineIndex = lines.findIndex(line => line.includes('owner.toBuffer'));

        if (errorLineIndex >= 0) {
          console.log('Error found at line ' + (errorLineIndex + 1));
          console.log('Context (5 lines before and after):');

          const startLine = Math.max(0, errorLineIndex - 5);
          const endLine = Math.min(lines.length - 1, errorLineIndex + 5);

          for (let i = startLine; i <= endLine; i++) {
            const marker = i === errorLineIndex ? '>>> ' : '    ';
            console.log(marker + (i + 1) + ': ' + lines[i]);
          }
        }
      }
    }

    // 5. DistributionService復元
    console.log('\\n🔧 Restoring DistributionService...');
    await fs.copyFile(backupPath, servicePath);
    await fs.unlink(backupPath);
    console.log('✅ DistributionService restored');

    // 6. クリーンアップ
    await fs.rm(testDir, { recursive: true });
    console.log('✅ Test directory cleaned up');

    console.log('\\n📊 Deep Investigation Summary:');
    console.log('1. Comprehensive debugging logs added to trace PublicKey lifecycle');
    console.log('2. Prototype chain analysis implemented');
    console.log('3. Individual toBuffer() method testing before SPL calls');
    console.log('4. Context analysis around error occurrence');
    console.log('\\nNext steps based on findings will determine root cause solution.');

  } catch (error) {
    console.log('\\n❌ Deep investigation failed:', error instanceof Error ? error.message : 'Unknown error');

    // 復元を試行
    const servicePath = path.join(__dirname, 'src', 'application', 'services', 'DistributionService.ts');
    const backupPath = servicePath + '.deep-debug-backup';

    try {
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
deepCLIInvestigation().catch(console.error);