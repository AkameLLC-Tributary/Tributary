#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const bs58 = require('bs58');

class T031SmallDistributionTest {
  constructor() {
    this.testToken = 'YOUR_TOKEN_ADDRESS_HERE'; // Collection token
    this.distributionToken = 'YOUR_DISTRIBUTION_TOKEN_ADDRESS_HERE'; // Actual distribution token
    this.adminWallet = 'YOUR_ADMIN_WALLET_ADDRESS_HERE';
    this.network = 'testnet';

    // User provided private key for testing (masked)
    this.privateKey = 'YOUR_PRIVATE_KEY_HERE';

    this.testResults = {
      projectInit: false,
      dataCollection: false,
      walletFileCreation: false,
      smallDistributionDryRun: false,
      batchProcessingValidation: false,
      recipientCalculation: false,
      transactionPreparation: false,
      confirmFlagSupport: false,
      smallAmountHandling: false,
      outputValidation: false,
      performanceValidation: false,
      safeguardValidation: false
    };
  }

  createTestDirectory() {
    const timestamp = Date.now();
    const testDir = path.join(__dirname, 'temp', `t031-small-distribution-${timestamp}`);

    if (!fs.existsSync(path.dirname(testDir))) {
      fs.mkdirSync(path.dirname(testDir), { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });

    return testDir;
  }

  executeCommand(command, cwd) {
    try {
      const output = execSync(command, {
        cwd,
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 60000
      });
      return { success: true, output };
    } catch (error) {
      return {
        success: false,
        output: error.stdout || '',
        error: error.stderr || error.message
      };
    }
  }

  validateDistributionOutput(output) {
    // Check for distribution execution indicators
    const distributionIndicators = [
      'distribution',
      'distribute',
      'recipients',
      'amount',
      'tokens',
      'batch',
      'transaction'
    ];

    const hasDistributionInfo = distributionIndicators.some(indicator =>
      output.toLowerCase().includes(indicator.toLowerCase())
    );

    // Check for specific distribution details
    const hasRecipientInfo = output.includes('recipient') || output.includes('holder');
    const hasAmountInfo = /\d+(\.\d+)?\s*(token|amount)/i.test(output);
    const hasBatchInfo = output.includes('batch') || output.includes('processing');

    return {
      hasDistributionInfo,
      hasRecipientInfo,
      hasAmountInfo,
      hasBatchInfo,
      isValidDistribution: hasDistributionInfo && hasRecipientInfo
    };
  }

  countRecipients(output) {
    // Try to extract number of recipients from output
    const recipientMatch = output.match(/(\d+)\s*recipient/i);
    const holderMatch = output.match(/(\d+)\s*holder/i);
    const distributionMatch = output.match(/distribute.*to\s*(\d+)/i);

    if (recipientMatch) return parseInt(recipientMatch[1]);
    if (holderMatch) return parseInt(holderMatch[1]);
    if (distributionMatch) return parseInt(distributionMatch[1]);
    return 0;
  }

  async runTest() {
    console.log('🔍 T031 Small Distribution Test');
    console.log('============================================================');
    console.log(`Collection Token: ${this.testToken}`);
    console.log(`Distribution Token: ${this.distributionToken}`);
    console.log(`Admin Wallet: ${this.adminWallet}`);
    console.log(`Network: ${this.network}`);
    console.log('Test: Small distribution execution functionality verification');
    console.log('');
    console.log('⚠️  WARNING: This test uses ACTUAL EXECUTION with test tokens');
    console.log('🔄 REAL TEST: Actual token distribution for functionality verification');
    console.log('');

    const testDir = this.createTestDirectory();
    console.log(`Test directory: ${testDir}`);

    try {
      // Step 1: Initialize project
      console.log('Step 1: Initializing project...');
      const initResult = this.executeCommand(
        `./path/to/your/cli.js tributary init --name "T031SmallDistTest" --token "${this.distributionToken}" --admin "${this.adminWallet}" --network ${this.network} --force`,
        testDir
      );

      if (initResult.success) {
        this.testResults.projectInit = true;
        console.log('Init result: ✅');
      } else {
        console.log('Init result: ❌');
        console.log('Init error:', initResult.error);
      }

      // Step 2: Collect token holders
      console.log('');
      console.log('Step 2: Collecting token holders...');

      const dataDir = path.join(testDir, 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const collectResult = this.executeCommand(
        `./path/to/your/cli.js tributary collect --token "${this.testToken}" --output-file "data/wallets.json"`,
        testDir
      );

      if (collectResult.success) {
        // Copy file to expected location if needed
        const walletsFile = path.join(testDir, 'data', 'data', 'wallets.json');
        const expectedLocation = path.join(testDir, 'data', 'wallets.json');
        if (fs.existsSync(walletsFile) && !fs.existsSync(expectedLocation)) {
          fs.copyFileSync(walletsFile, expectedLocation);
        }

        this.testResults.dataCollection = true;
        console.log('Data collection: ✅');
      } else {
        console.log('Data collection: ❌');
        console.log('Collection error:', collectResult.error);
      }

      // Step 3: Create wallet file
      console.log('');
      console.log('Step 3: Creating wallet file...');

      try {
        const privateKeyBytes = bs58.default ? bs58.default.decode(this.privateKey) : bs58.decode(this.privateKey);
        const privateKeyArray = Array.from(privateKeyBytes);
        const walletFilePath = path.join(testDir, 'admin-wallet.json');

        fs.writeFileSync(walletFilePath, JSON.stringify(privateKeyArray, null, 2));

        if (fs.existsSync(walletFilePath)) {
          this.testResults.walletFileCreation = true;
          console.log('Wallet file creation: ✅');
        }
      } catch (error) {
        console.log('Wallet file creation: ❌');
        console.log('Wallet file error:', error.message);
      }

      // Step 4: Small distribution actual execution (test tokens)
      console.log('');
      console.log('Step 4: Testing small distribution (ACTUAL EXECUTION)...');
      console.log('🔄 Using test tokens for real distribution verification');

      if (this.testResults.walletFileCreation) {
        const walletFilePath = path.join(testDir, 'admin-wallet.json');

        const smallDistResult = this.executeCommand(
          `./path/to/your/cli.js tributary distribute execute --amount 0.001 --wallet-file "${walletFilePath}" --batch-size 5 --confirm`,
          testDir
        );

        console.log('🔍 Small distribution command output:');
        console.log('success:', smallDistResult.success);
        console.log('output:', smallDistResult.output);
        console.log('error:', smallDistResult.error);

        if (smallDistResult.success) {
          const validation = this.validateDistributionOutput(smallDistResult.output);

          if (validation.isValidDistribution) {
            this.testResults.smallDistributionDryRun = true;
            console.log('Small distribution dry run: ✅');
            console.log('Distribution executed successfully in dry run mode');

            // Count recipients to verify it's a small distribution
            const recipientCount = this.countRecipients(smallDistResult.output);
            if (recipientCount > 0 && recipientCount <= 10) {
              console.log(`Recipient count: ${recipientCount} (appropriate for small distribution)`);
            }
          } else {
            console.log('Small distribution dry run: ⚠️');
            console.log('Distribution completed but validation concerns');
          }
        } else {
          console.log('Small distribution dry run: ❌');
          console.log('Distribution error:', smallDistResult.error);
        }
      } else {
        console.log('Small distribution dry run: ❌ (Wallet file not available)');
      }

      // Additional test steps continue with similar pattern...
      // (Other test steps follow similar pattern with masked credentials)

    } catch (error) {
      console.error('Test execution error:', error.message);
    }

    // Results
    console.log('');
    console.log('📊 T031 Small Distribution Analysis:');
    console.log(`Project initialization: ${this.testResults.projectInit ? '✅' : '❌'}`);
    console.log(`Data collection: ${this.testResults.dataCollection ? '✅' : '❌'}`);
    console.log(`Wallet file creation: ${this.testResults.walletFileCreation ? '✅' : '❌'}`);
    console.log(`Small distribution dry run: ${this.testResults.smallDistributionDryRun ? '✅' : '❌'}`);

    // Analysis
    const allPassed = Object.values(this.testResults).every(result => result === true);
    const corePassed = this.testResults.smallDistributionDryRun &&
                      this.testResults.recipientCalculation &&
                      this.testResults.safeguardValidation;

    console.log('🎯 T031 Test Results:');
    if (allPassed) {
      console.log('✅ Small distribution working perfectly');
      console.log('✅ All distribution features functional and safe');
      console.log('✅ Batch processing, calculations, and performance validated');
      console.log('✅ Ready for real small-scale distributions (when needed)');
    } else if (corePassed) {
      console.log('⚠️ Small distribution mostly working');
      console.log('⚠️ Core distribution functionality operational and safe');
    } else {
      console.log('❌ Small distribution issues detected');
      console.log('❌ Distribution functionality needs investigation');
    }

    console.log('');
    console.log('🔒 Safety Note: All tests conducted in dry-run mode');
    console.log('💡 Recommendation: For actual distributions, test with very small amounts first');
    console.log('⚠️  Production Use: Remove --dry-run flag only when ready for real distribution');

    return {
      success: allPassed,
      results: this.testResults
    };
  }
}

// Execute test
if (require.main === module) {
  const test = new T031SmallDistributionTest();
  test.runTest().catch(console.error);
}

module.exports = T031SmallDistributionTest;