#!/usr/bin/env node

/**
 * T002 Only Test - Configuration show functionality
 * Single test execution to verify T002 works correctly
 */

const ComprehensiveTestRunner = require('./src/comprehensive-test-runner');

async function runT002Only() {
  console.log('🧪 Testing T002: Configuration show functionality (single test)');
  console.log('='.repeat(60));

  const runner = new ComprehensiveTestRunner();

  // Set up test configuration manually (no interactive)
  runner.userConfig = {
    network: 'devnet',
    adminWallet: 'YOUR_ADMIN_WALLET_ADDRESS_HERE',
    targetToken: 'YOUR_TOKEN_ADDRESS_HERE', // Valid SOL token address
    distributionToken: 'YOUR_DISTRIBUTION_TOKEN_ADDRESS_HERE',
    projectName: 'T002Test',
    testMode: 'simulation',
    batchSize: 10,
    networkTimeout: 30000,
    logLevel: 'info'
  };

  try {
    console.log('📋 Test Configuration:');
    console.log(`  Network: ${runner.userConfig.network}`);
    console.log(`  Admin: ${runner.userConfig.adminWallet}`);
    console.log(`  Target Token: ${runner.userConfig.targetToken}`);
    console.log(`  Project: ${runner.userConfig.projectName}`);
    console.log('');

    const startTime = Date.now();

    // Execute T002 test directly - Config show functionality
    console.log('🚀 Executing T002: Configuration show...');
    const result = await runner.testConfigShow();

    const duration = Date.now() - startTime;

    if (result.success) {
      console.log(`✅ T002 PASSED (${duration}ms)`);
      console.log('📄 Test Details:');
      console.log(`   ${result.details}`);

      if (result.output) {
        console.log('🖥️ Command output:');
        console.log(`   ${result.output.substring(0, 300)}...`);
      }
    } else {
      console.log(`❌ T002 FAILED (${duration}ms)`);
      console.log(`   Details: ${result.details}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }

  } catch (error) {
    console.log(`❌ T002 FAILED with exception:`);
    console.log(`   ${error.message}`);
    if (error.stack) {
      console.log('📍 Stack trace:');
      console.log(error.stack);
    }
  }

  console.log('');
  console.log('🏁 T002 single test completed');
}

// Run if called directly
if (require.main === module) {
  runT002Only().catch(error => {
    console.error('❌ T002 test runner failed:', error.message);
    process.exit(1);
  });
}

module.exports = runT002Only;