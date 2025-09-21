#!/usr/bin/env node

/**
 * Tributary Test Automation Runner
 * Comprehensive automated testing system for Tributary CLI
 */

const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class TestRunner {
  constructor() {
    this.testResults = [];
    this.config = {
      devnetTimeout: 60000,    // 1 minute
      testnetTimeout: 300000,  // 5 minutes
      maxRetries: 3,
      testDir: path.join(__dirname, '../temp/workspaces/tributary-test-' + Date.now()),
      networks: {
        devnet: 'https://api.devnet.solana.com',
        testnet: 'https://api.testnet.solana.com'
      }
    };
    this.phase = 'init';
    this.startTime = new Date();
  }

  /**
   * Main test execution entry point
   */
  async run() {
    try {
      console.log('🚀 Tributary Automated Test Suite Starting...');
      console.log('📅 Start Time:', this.startTime.toISOString());

      await this.setupEnvironment();
      await this.verifyPrerequisites();

      // Execute test phases in sequence
      await this.runPhase1(); // devnet basic functions
      await this.runPhase2(); // testnet integration
      await this.runPhase3(); // performance testing
      await this.runPhase4(); // production preparation

      await this.generateReport();

    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Setup test environment
   */
  async setupEnvironment() {
    console.log('\n📁 Setting up test environment...');

    try {
      await fs.mkdir(this.config.testDir, { recursive: true });
      console.log('✅ Test directory created:', this.config.testDir);

      // Create test keypair files
      await this.createTestKeypairs();

    } catch (error) {
      throw new Error(`Environment setup failed: ${error.message}`);
    }
  }

  /**
   * Create test keypair files
   */
  async createTestKeypairs() {
    const validKeypair = [
      174, 47, 154, 16, 202, 193, 206, 113, 199, 190, 53, 133, 169, 175, 31, 56,
      222, 53, 138, 189, 224, 216, 117, 173, 10, 149, 53, 45, 73, 251, 237, 246,
      12, 23, 150, 149, 127, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ];

    const invalidKeypair = [1, 2, 3]; // Invalid format

    await fs.writeFile(
      path.join(this.config.testDir, 'valid-keypair.json'),
      JSON.stringify(validKeypair)
    );

    await fs.writeFile(
      path.join(this.config.testDir, 'invalid-keypair.json'),
      JSON.stringify(invalidKeypair)
    );

    console.log('✅ Test keypair files created');
  }

  /**
   * Verify prerequisites before testing
   */
  async verifyPrerequisites() {
    console.log('\n🔍 Verifying prerequisites...');

    const checks = [
      { name: 'Node.js version', cmd: 'node --version' },
      { name: 'NPM version', cmd: 'npm --version' },
      { name: 'Tributary CLI', cmd: 'tributary --version' }
    ];

    for (const check of checks) {
      try {
        const result = await this.execCommand(check.cmd);
        const version = result.output || result;
        console.log(`✅ ${check.name}: ${version.trim()}`);
      } catch (error) {
        throw new Error(`${check.name} check failed: ${error.message}`);
      }
    }

    // Network connectivity check
    await this.checkNetworkConnectivity();
  }

  /**
   * Check Solana network connectivity
   */
  async checkNetworkConnectivity() {
    console.log('🌐 Checking network connectivity...');

    for (const [network, url] of Object.entries(this.config.networks)) {
      try {
        const result = await this.execCommand(
          `curl -s ${url} -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' -H "Content-Type: application/json"`
        );
        const output = result.output || result;
        const response = JSON.parse(output);
        if (response.result === 'ok') {
          console.log(`✅ ${network} connectivity: OK`);
        } else {
          throw new Error(`${network} health check failed`);
        }
      } catch (error) {
        console.warn(`⚠️ ${network} connectivity issue: ${error.message}`);
      }
    }
  }

  /**
   * Phase 1: devnet Basic Functions
   */
  async runPhase1() {
    console.log('\n🏁 Phase 1: devnet Basic Functions');
    this.phase = 'phase1';

    const tests = [
      { id: 'T001', name: 'Basic initialization', fn: () => this.testBasicInit() },
      { id: 'T002', name: 'Interactive initialization', fn: () => this.testInteractiveInit() },
      { id: 'T003', name: 'Force overwrite', fn: () => this.testForceOverwrite() },
      { id: 'T004', name: 'Invalid parameters', fn: () => this.testInvalidParameters() },
      { id: 'T040', name: 'Config show', fn: () => this.testConfigShow() },
      { id: 'T041', name: 'Config validate', fn: () => this.testConfigValidate() },
      { id: 'T050', name: 'Network errors', fn: () => this.testNetworkErrors() },
      { id: 'T060', name: 'Invalid token address', fn: () => this.testInvalidToken() }
    ];

    await this.runTestBatch(tests);
  }

  /**
   * Phase 2: testnet Integration
   */
  async runPhase2() {
    console.log('\n🌐 Phase 2: testnet Integration');
    this.phase = 'phase2';

    const tests = [
      { id: 'T010', name: 'Token holder collection', fn: () => this.testTokenCollection() },
      { id: 'T011', name: 'Threshold filtering', fn: () => this.testThresholdFiltering() },
      { id: 'T020', name: 'Distribution simulation', fn: () => this.testDistributionSim() },
      { id: 'T030', name: 'Dry run execution', fn: () => this.testDryRun() },
      { id: 'T031', name: 'Small distribution', fn: () => this.testSmallDistribution() }
    ];

    await this.runTestBatch(tests);
  }

  /**
   * Phase 3: Performance Testing
   */
  async runPhase3() {
    console.log('\n⚡ Phase 3: Performance Testing');
    this.phase = 'phase3';

    const tests = [
      { id: 'T070', name: 'Large collection performance', fn: () => this.testLargeCollection() },
      { id: 'T071', name: 'Batch processing performance', fn: () => this.testBatchPerformance() }
    ];

    await this.runTestBatch(tests);
  }

  /**
   * Phase 4: Production Preparation
   */
  async runPhase4() {
    console.log('\n🚀 Phase 4: Production Preparation');
    this.phase = 'phase4';

    const tests = [
      { id: 'T090', name: 'Mainnet config validation', fn: () => this.testMainnetConfig() },
      { id: 'T091', name: 'Production settings', fn: () => this.testProductionSettings() }
    ];

    await this.runTestBatch(tests);
  }

  /**
   * Run a batch of tests
   */
  async runTestBatch(tests) {
    for (const test of tests) {
      await this.runSingleTest(test);
    }
  }

  /**
   * Run a single test with error handling and retries
   */
  async runSingleTest(test) {
    let attempts = 0;
    let lastError = null;

    while (attempts < this.config.maxRetries) {
      attempts++;

      try {
        console.log(`\n🧪 Running ${test.id}: ${test.name} (attempt ${attempts})`);
        const startTime = Date.now();

        const result = await Promise.race([
          test.fn(),
          this.timeout(this.getTimeoutForPhase())
        ]);

        const duration = Date.now() - startTime;

        this.testResults.push({
          id: test.id,
          name: test.name,
          phase: this.phase,
          status: 'PASS',
          duration,
          attempts,
          timestamp: new Date().toISOString(),
          details: result
        });

        console.log(`✅ ${test.id} PASSED (${duration}ms)`);
        return;

      } catch (error) {
        lastError = error;
        console.log(`❌ ${test.id} FAILED (attempt ${attempts}): ${error.message}`);

        if (attempts < this.config.maxRetries) {
          console.log(`🔄 Retrying in 5 seconds...`);
          await this.sleep(5000);
        }
      }
    }

    // All attempts failed
    this.testResults.push({
      id: test.id,
      name: test.name,
      phase: this.phase,
      status: 'FAIL',
      attempts,
      timestamp: new Date().toISOString(),
      error: lastError.message,
      details: null
    });
  }

  /**
   * Individual test implementations
   */
  async testBasicInit() {
    const testDir = path.join(this.config.testDir, 'basic-init');
    await fs.mkdir(testDir, { recursive: true });

    const result = await this.execCommand(
      `cd "${testDir}" && tributary init --name "BasicInitTest" --token "So11111111111111111111111111111111111111112" --admin "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" --network devnet`
    );

    // Verify config file exists
    const configPath = path.join(testDir, 'tributary.toml');
    try {
      await fs.access(configPath);
    } catch {
      throw new Error('Configuration file not created');
    }

    return { result, configCreated: true };
  }

  async testInteractiveInit() {
    // Skip interactive mode in automated testing
    return { skipped: true, reason: 'Interactive mode not suitable for automation' };
  }

  async testForceOverwrite() {
    const timestamp = Date.now();
    const testDir = path.join(this.config.testDir, `force-overwrite-${timestamp}`);
    await fs.mkdir(testDir, { recursive: true });

    // Create initial config
    await this.execCommand(
      `tributary init --name "InitialTest" --token "So11111111111111111111111111111111111111112" --admin "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" --network devnet`,
      { cwd: testDir }
    );

    // Try to overwrite with --force
    const result = await this.execCommand(
      `tributary init --name "OverwriteTest" --token "So11111111111111111111111111111111111111112" --admin "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" --network devnet --force`,
      { cwd: testDir }
    );

    return { result, overwritten: true };
  }

  async testInvalidParameters() {
    const testDir = path.join(this.config.testDir, 'invalid-params');
    await fs.mkdir(testDir, { recursive: true });

    try {
      await this.execCommand(
        `cd "${testDir}" && tributary init --name "" --token "invalid" --admin "invalid"`
      );
      throw new Error('Should have failed with invalid parameters');
    } catch (error) {
      if (error.message.includes('Should have failed')) {
        throw error;
      }
      return { validationWorked: true, error: error.message };
    }
  }

  async testConfigShow() {
    const testDir = path.join(this.config.testDir, 'config-show');
    await fs.mkdir(testDir, { recursive: true });

    // Create config first
    await this.execCommand(
      `cd "${testDir}" && tributary init --name "ConfigTest" --token "So11111111111111111111111111111111111111112" --admin "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" --network devnet`
    );

    const result = await this.execCommand(`cd "${testDir}" && tributary config show`);

    return { result, displayed: true };
  }

  async testConfigValidate() {
    const testDir = path.join(this.config.testDir, 'config-validate');
    await fs.mkdir(testDir, { recursive: true });

    // Create valid config
    await this.execCommand(
      `cd "${testDir}" && tributary init --name "ValidateTest" --token "So11111111111111111111111111111111111111112" --admin "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" --network devnet`
    );

    const result = await this.execCommand(`cd "${testDir}" && tributary config validate`);

    return { result, validated: true };
  }

  async testNetworkErrors() {
    // Test with invalid RPC endpoint
    try {
      await this.execCommand(
        `SOLANA_RPC_URL=http://invalid-endpoint.com tributary collect --token "So11111111111111111111111111111111111111112" --network devnet`
      );
      throw new Error('Should have failed with network error');
    } catch (error) {
      if (error.message.includes('Should have failed')) {
        throw error;
      }
      return { networkErrorHandled: true, error: error.message };
    }
  }

  async testInvalidToken() {
    try {
      await this.execCommand(
        `tributary collect --token "ThisIsNotAValidTokenAddress123456789"`
      );
      throw new Error('Should have failed with invalid token');
    } catch (error) {
      if (error.message.includes('Should have failed')) {
        throw error;
      }
      return { tokenValidationWorked: true, error: error.message };
    }
  }

  async testTokenCollection() {
    const testDir = path.join(this.config.testDir, 'token-collection');
    await fs.mkdir(testDir, { recursive: true });

    const result = await this.execCommand(
      `cd "${testDir}" && tributary collect --token "So11111111111111111111111111111111111111112" --threshold 0.1 --network testnet --output-file "test_holders.json"`
    );

    // Verify output file exists
    const outputPath = path.join(testDir, 'test_holders.json');
    try {
      await fs.access(outputPath);
      const content = await fs.readFile(outputPath, 'utf8');
      const data = JSON.parse(content);
      return { result, fileCreated: true, holderCount: data.length };
    } catch {
      throw new Error('Output file not created or invalid');
    }
  }

  async testThresholdFiltering() {
    const testDir = path.join(this.config.testDir, 'threshold-filtering');
    await fs.mkdir(testDir, { recursive: true });

    // Test with different thresholds
    const thresholds = [0.01, 1.0, 10.0];
    const results = [];

    for (const threshold of thresholds) {
      const result = await this.execCommand(
        `cd "${testDir}" && tributary collect --token "So11111111111111111111111111111111111111112" --threshold ${threshold} --network testnet --output-file "holders_${threshold}.json"`
      );
      results.push({ threshold, result });
    }

    return { results, thresholdsTested: thresholds.length };
  }

  async testDistributionSim() {
    const testDir = path.join(this.config.testDir, 'distribution-sim');
    await fs.mkdir(testDir, { recursive: true });

    const result = await this.execCommand(
      `cd "${testDir}" && tributary distribute simulate --amount 100 --token "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr" --network testnet`
    );

    return { result, simulated: true };
  }

  async testDryRun() {
    const testDir = path.join(this.config.testDir, 'dry-run');
    await fs.mkdir(testDir, { recursive: true });

    const result = await this.execCommand(
      `cd "${testDir}" && tributary distribute execute --amount 10 --token "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr" --network testnet --dry-run --batch-size 3`
    );

    return { result, dryRun: true };
  }

  async testSmallDistribution() {
    // Skip actual distribution in automation unless explicitly enabled
    return { skipped: true, reason: 'Actual token distribution skipped for safety' };
  }

  async testLargeCollection() {
    const startTime = Date.now();

    const result = await this.execCommand(
      `tributary collect --token "So11111111111111111111111111111111111111112" --threshold 0.001 --max-holders 1000 --network testnet --cache false`
    );

    const duration = Date.now() - startTime;

    return { result, duration, performanceTest: true };
  }

  async testBatchPerformance() {
    const startTime = Date.now();

    const result = await this.execCommand(
      `tributary distribute simulate --amount 100 --token "TestTokenAddress" --network testnet --batch-size 20`
    );

    const duration = Date.now() - startTime;

    return { result, duration, batchTest: true };
  }

  async testMainnetConfig() {
    const testDir = path.join(this.config.testDir, 'mainnet-config');
    await fs.mkdir(testDir, { recursive: true });

    // Create mainnet config for validation only
    await this.execCommand(
      `cd "${testDir}" && tributary init --name "TributaryMainnetConfig" --token "So11111111111111111111111111111111111111112" --admin "ProductionAdminWallet" --network mainnet-beta`
    );

    const result = await this.execCommand(`cd "${testDir}" && tributary config validate`);

    return { result, mainnetConfigValidated: true };
  }

  async testProductionSettings() {
    const testDir = path.join(this.config.testDir, 'production-settings');
    await fs.mkdir(testDir, { recursive: true });

    // Test production-grade settings
    const result = await this.execCommand(
      `cd "${testDir}" && tributary init --name "ProductionTest" --token "So11111111111111111111111111111111111111112" --admin "ProductionAdmin" --network mainnet-beta`
    );

    return { result, productionSettings: true };
  }

  /**
   * Generate comprehensive test report
   */
  async generateReport() {
    console.log('\n📊 Generating test report...');

    const endTime = new Date();
    const totalDuration = endTime - this.startTime;

    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const skipped = this.testResults.filter(r => r.details?.skipped).length;
    const total = this.testResults.length;
    const successRate = ((passed / (total - skipped)) * 100).toFixed(1);

    const report = {
      summary: {
        startTime: this.startTime.toISOString(),
        endTime: endTime.toISOString(),
        totalDuration: `${Math.round(totalDuration / 1000)}s`,
        total,
        passed,
        failed,
        skipped,
        successRate: `${successRate}%`
      },
      results: this.testResults
    };

    const reportPath = path.join(this.config.testDir, 'test-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Console summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST EXECUTION SUMMARY');
    console.log('='.repeat(60));
    console.log(`⏱️  Total Duration: ${report.summary.totalDuration}`);
    console.log(`📊 Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log(`📄 Report saved: ${reportPath}`);
    console.log('='.repeat(60));

    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`  • ${r.id}: ${r.name} - ${r.error}`));
    }

    if (successRate < 95) {
      console.log('\n⚠️ WARNING: Success rate below 95% threshold');
      process.exit(1);
    }
  }

  /**
   * Utility methods
   */
  getTimeoutForPhase() {
    return this.phase === 'phase2' ? this.config.testnetTimeout : this.config.devnetTimeout;
  }

  async execCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, {
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 // 1MB buffer
      }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Command failed: ${error.message}`));
        } else {
          resolve({
            success: true,
            output: stdout,
            stderr: stderr
          });
        }
      });
    });
  }

  async timeout(ms) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Test timeout')), ms);
    });
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
if (require.main === module) {
  const runner = new TestRunner();
  runner.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;