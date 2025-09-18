#!/usr/bin/env node

/**
 * Interactive Test Runner for Tributary
 * User-friendly wrapper script with guided setup and phase-by-phase testing
 */

const readline = require('readline');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');

class InteractiveTestRunner {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    this.testConfig = {
      network: '',
      adminWallet: '',
      verificationToken: '',
      distributionToken: '',
      recipientWalletA: '',
      recipientWalletB: '',
      testMode: 'simulation', // 'simulation' or 'real'
      configFile: null
    };

    this.phases = [
      { id: 'phase1', name: 'Phase 1: 基本機能テスト (devnet)', duration: '30分' },
      { id: 'phase2', name: 'Phase 2: 統合テスト (testnet)', duration: '2時間' },
      { id: 'phase3', name: 'Phase 3: パフォーマンステスト', duration: '1時間' },
      { id: 'phase4', name: 'Phase 4: 本番準備テスト', duration: '30分' },
      { id: 'phase5', name: 'Phase 5: 高度機能テスト', duration: '1.5時間' },
      { id: 'phase6', name: 'Phase 6: 実配布テスト (オプション)', duration: '30分' }
    ];
  }

  /**
   * Main execution flow
   */
  async run() {
    try {
      console.log('🚀 Tributary Interactive Test Runner');
      console.log('=====================================');
      console.log('このスクリプトは、Tributaryの包括的テストを対話式で実行します。');
      console.log('');

      // Step 1: Collect configuration
      await this.collectConfiguration();

      // Step 2: Display configuration summary
      await this.displayConfigurationSummary();

      // Step 3: Confirm configuration
      const confirmed = await this.confirmConfiguration();
      if (!confirmed) {
        console.log('❌ 設定がキャンセルされました。');
        this.rl.close();
        return;
      }

      // Step 4: Save configuration
      await this.saveConfiguration();

      // Step 5: Phase selection and execution
      await this.executePhases();

      console.log('✅ テストセッション完了しました！');

    } catch (error) {
      console.error('❌ エラーが発生しました:', error.message);
    } finally {
      this.rl.close();
    }
  }

  /**
   * Collect all required configuration through interactive prompts
   */
  async collectConfiguration() {
    console.log('📋 テスト設定情報を入力してください:');
    console.log('');

    // Network
    this.testConfig.network = await this.askQuestion(
      '🌐 ネットワークを選択してください (devnet/testnet) [testnet]: ',
      'testnet',
      (input) => ['devnet', 'testnet'].includes(input.toLowerCase()),
      'devnetまたはtestnetを選択してください'
    );

    // Admin Wallet
    this.testConfig.adminWallet = await this.askQuestion(
      '👤 管理者ウォレットアドレスまたはキーペアファイルパスを入力してください: ',
      null,
      (input) => input.length > 20,
      '有効なウォレットアドレスまたはファイルパスを入力してください'
    );

    // Verification Token
    this.testConfig.verificationToken = await this.askQuestion(
      '🔍 配布先確認用トークンアドレスを入力してください: ',
      null,
      (input) => input.length > 20,
      '有効なトークンアドレスを入力してください'
    );

    // Distribution Token
    const sameToken = await this.askQuestion(
      '💰 配布トークンは確認用トークンと同じですか？ (y/n) [y]: ',
      'y',
      (input) => ['y', 'n', 'yes', 'no'].includes(input.toLowerCase()),
      'yまたはnを選択してください'
    );

    if (sameToken.toLowerCase() === 'y' || sameToken.toLowerCase() === 'yes') {
      this.testConfig.distributionToken = this.testConfig.verificationToken;
    } else {
      this.testConfig.distributionToken = await this.askQuestion(
        '💸 配布用トークンアドレスを入力してください: ',
        null,
        (input) => input.length > 20,
        '有効なトークンアドレスを入力してください'
      );
    }

    // Recipient Wallet A
    this.testConfig.recipientWalletA = await this.askQuestion(
      '📥 配布先ウォレットA のアドレスを入力してください: ',
      null,
      (input) => input.length > 20,
      '有効なウォレットアドレスを入力してください'
    );

    // Recipient Wallet B
    this.testConfig.recipientWalletB = await this.askQuestion(
      '📥 配布先ウォレットB のアドレスを入力してください: ',
      null,
      (input) => input.length > 20,
      '有効なウォレットアドレスを入力してください'
    );

    // Test Mode
    console.log('');
    console.log('⚠️ テストモードを選択してください:');
    console.log('  simulation: シミュレーションのみ（実際のトークン転送なし）');
    console.log('  real: 実配布テスト（実際のトークンを転送）');

    this.testConfig.testMode = await this.askQuestion(
      '🧪 テストモード (simulation/real) [simulation]: ',
      'simulation',
      (input) => ['simulation', 'real'].includes(input.toLowerCase()),
      'simulationまたはrealを選択してください'
    );

    if (this.testConfig.testMode === 'real') {
      console.log('');
      console.log('🚨 警告: 実配布モードでは実際のトークンが転送されます！');
      console.log('   - 取り消し不可能な操作です');
      console.log('   - testnetでのみ実行されます');
      console.log('   - 十分なトークン残高が必要です');

      const realConfirm = await this.askQuestion(
        '本当に実配布テストを実行しますか？ (yes/no) [no]: ',
        'no',
        (input) => ['yes', 'no'].includes(input.toLowerCase()),
        'yesまたはnoを入力してください'
      );

      if (realConfirm.toLowerCase() !== 'yes') {
        console.log('✅ シミュレーションモードに変更されました。');
        this.testConfig.testMode = 'simulation';
      }
    }
  }

  /**
   * Display configuration summary
   */
  async displayConfigurationSummary() {
    console.log('');
    console.log('📊 設定情報確認');
    console.log('=====================================');
    console.log(`🌐 ネットワーク: ${this.testConfig.network}`);
    console.log(`👤 管理者ウォレット: ${this.maskSensitiveInfo(this.testConfig.adminWallet)}`);
    console.log(`🔍 確認用トークン: ${this.maskSensitiveInfo(this.testConfig.verificationToken)}`);
    console.log(`💰 配布トークン: ${this.maskSensitiveInfo(this.testConfig.distributionToken)}`);
    console.log(`📥 配布先A: ${this.maskSensitiveInfo(this.testConfig.recipientWalletA)}`);
    console.log(`📥 配布先B: ${this.maskSensitiveInfo(this.testConfig.recipientWalletB)}`);
    console.log(`🧪 テストモード: ${this.testConfig.testMode}`);
    console.log('=====================================');
    console.log('');
  }

  /**
   * Confirm configuration with user
   */
  async confirmConfiguration() {
    const confirm = await this.askQuestion(
      'この設定でテストを実行しますか？ (y/n) [y]: ',
      'y',
      (input) => ['y', 'n', 'yes', 'no'].includes(input.toLowerCase()),
      'yまたはnを選択してください'
    );

    return confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes';
  }

  /**
   * Save configuration to file
   */
  async saveConfiguration() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const configFileName = `test-config-${timestamp}.json`;
    this.testConfig.configFile = path.join(process.cwd(), configFileName);

    const configData = {
      ...this.testConfig,
      createdAt: new Date().toISOString(),
      version: '1.0.0'
    };

    try {
      await fs.writeFile(this.testConfig.configFile, JSON.stringify(configData, null, 2));
      console.log(`✅ 設定ファイルを保存しました: ${configFileName}`);
    } catch (error) {
      console.warn(`⚠️ 設定ファイルの保存に失敗しました: ${error.message}`);
    }
  }

  /**
   * Execute test phases with user selection
   */
  async executePhases() {
    console.log('');
    console.log('🧪 テストフェーズ選択');
    console.log('=====================================');

    // Display available phases
    this.phases.forEach((phase, index) => {
      console.log(`${index + 1}. ${phase.name} (${phase.duration})`);
    });

    console.log('');
    console.log('実行オプション:');
    console.log('  all: 全フェーズを実行');
    console.log('  1-6: 個別フェーズを選択');
    console.log('  1,3,5: 複数フェーズを選択（カンマ区切り）');
    console.log('');

    const selection = await this.askQuestion(
      '実行するフェーズを選択してください [all]: ',
      'all'
    );

    let phasesToRun = [];

    if (selection.toLowerCase() === 'all') {
      phasesToRun = this.phases;
    } else {
      const selectedNumbers = selection.split(',').map(n => parseInt(n.trim()));
      phasesToRun = this.phases.filter((_, index) => selectedNumbers.includes(index + 1));
    }

    if (phasesToRun.length === 0) {
      console.log('❌ 有効なフェーズが選択されていません。');
      return;
    }

    console.log('');
    console.log(`📋 実行予定フェーズ: ${phasesToRun.map(p => p.name).join(', ')}`);

    const proceed = await this.askQuestion(
      '実行を開始しますか？ (y/n) [y]: ',
      'y',
      (input) => ['y', 'n', 'yes', 'no'].includes(input.toLowerCase()),
      'yまたはnを選択してください'
    );

    if (proceed.toLowerCase() !== 'y' && proceed.toLowerCase() !== 'yes') {
      console.log('❌ テスト実行がキャンセルされました。');
      return;
    }

    // Execute selected phases
    for (const phase of phasesToRun) {
      await this.executePhase(phase);
    }
  }

  /**
   * Execute a single test phase
   */
  async executePhase(phase) {
    console.log('');
    console.log('='.repeat(60));
    console.log(`🚀 ${phase.name} 開始`);
    console.log('='.repeat(60));

    try {
      // Set environment variables for test
      await this.setEnvironmentVariables();

      // Prepare phase-specific command
      let command = '';

      switch (phase.id) {
        case 'phase1':
          command = 'npm run test:phase1';
          break;
        case 'phase2':
          command = 'npm run test:phase2';
          break;
        case 'phase3':
          command = 'npm run test:phase3';
          break;
        case 'phase4':
          command = 'npm run test:phase4';
          break;
        case 'phase5':
          command = 'npm run test:phase5';
          break;
        case 'phase6':
          if (this.testConfig.testMode === 'real') {
            command = 'npm run test:real-distribution';
          } else {
            console.log('⚠️ Phase 6は実配布モードでのみ実行されます。スキップします。');
            return;
          }
          break;
      }

      console.log(`📋 実行コマンド: ${command}`);
      console.log('');

      const startTime = Date.now();

      // Execute the test
      await this.executeCommand(command);

      const duration = Date.now() - startTime;
      const durationMinutes = Math.round(duration / 60000);

      console.log('');
      console.log(`✅ ${phase.name} 完了 (${durationMinutes}分)`);

      // Ask if user wants to continue to next phase
      if (phasesToRun.indexOf(phase) < phasesToRun.length - 1) {
        const continueNext = await this.askQuestion(
          '次のフェーズに進みますか？ (y/n) [y]: ',
          'y',
          (input) => ['y', 'n', 'yes', 'no'].includes(input.toLowerCase()),
          'yまたはnを選択してください'
        );

        if (continueNext.toLowerCase() !== 'y' && continueNext.toLowerCase() !== 'yes') {
          console.log('⏹️ テスト実行を中断しました。');
          break;
        }
      }

    } catch (error) {
      console.error(`❌ ${phase.name} でエラーが発生しました:`, error.message);

      const continueOnError = await this.askQuestion(
        'エラーが発生しましたが、続行しますか？ (y/n) [n]: ',
        'n',
        (input) => ['y', 'n', 'yes', 'no'].includes(input.toLowerCase()),
        'yまたはnを選択してください'
      );

      if (continueOnError.toLowerCase() !== 'y' && continueOnError.toLowerCase() !== 'yes') {
        throw error;
      }
    }
  }

  /**
   * Set environment variables for tests
   */
  async setEnvironmentVariables() {
    process.env.TRIBUTARY_NETWORK = this.testConfig.network;
    process.env.TRIBUTARY_ADMIN_WALLET = this.testConfig.adminWallet;
    process.env.TRIBUTARY_VERIFICATION_TOKEN = this.testConfig.verificationToken;
    process.env.TRIBUTARY_DISTRIBUTION_TOKEN = this.testConfig.distributionToken;
    process.env.TRIBUTARY_RECIPIENT_A = this.testConfig.recipientWalletA;
    process.env.TRIBUTARY_RECIPIENT_B = this.testConfig.recipientWalletB;
    process.env.TRIBUTARY_TEST_MODE = this.testConfig.testMode;
  }

  /**
   * Execute a command and stream output
   */
  async executeCommand(command) {
    return new Promise((resolve, reject) => {
      const process = exec(command, {
        cwd: __dirname,
        env: { ...process.env }
      });

      process.stdout.on('data', (data) => {
        process.stdout.write(data);
      });

      process.stderr.on('data', (data) => {
        process.stderr.write(data);
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Ask a question with validation
   */
  async askQuestion(question, defaultValue = null, validator = null, errorMessage = null) {
    while (true) {
      const answer = await new Promise((resolve) => {
        this.rl.question(question, resolve);
      });

      const value = answer.trim() || defaultValue;

      if (value === null || value === '') {
        console.log('⚠️ 値を入力してください。');
        continue;
      }

      if (validator && !validator(value)) {
        console.log(`⚠️ ${errorMessage || '無効な値です。'}`);
        continue;
      }

      return value;
    }
  }

  /**
   * Mask sensitive information for display
   */
  maskSensitiveInfo(value) {
    if (!value || value.length < 8) {
      return value;
    }

    return value.substring(0, 4) + '***' + value.substring(value.length - 4);
  }
}

// Export for testing
module.exports = InteractiveTestRunner;

// Main execution
if (require.main === module) {
  const runner = new InteractiveTestRunner();
  runner.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}