#!/usr/bin/env node

/**
 * T003 Only Test - Force overwrite functionality
 * Single test execution to verify T003 works correctly
 */

const ComprehensiveTestRunner = require('./src/comprehensive-test-runner');

async function runT003Only() {
  console.log('🧪 Testing T003: Force overwrite functionality (single test)');
  console.log('='.repeat(60));

  const runner = new ComprehensiveTestRunner();

  // Set up test configuration manually (no interactive)
  runner.userConfig = {
    network: 'devnet',
    adminWallet: 'YOUR_ADMIN_WALLET_ADDRESS_HERE',
    targetToken: 'YOUR_TOKEN_ADDRESS_HERE', // Valid SOL token address
    distributionToken: 'YOUR_DISTRIBUTION_TOKEN_ADDRESS_HERE',
    projectName: 'T003Test',
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

    // Execute T003 test directly - Force overwrite functionality
    console.log('🚀 Executing T003: Force overwrite...');
    const result = await runner.testForceOverwrite();

    const duration = Date.now() - startTime;

    if (result.success) {
      console.log(`✅ T003 PASSED (${duration}ms)`);
      console.log('📄 Test Details:');
      console.log(`   ${result.details}`);

      if (result.rejectedWithoutForce !== undefined) {
        console.log(`   Rejected without --force: ${result.rejectedWithoutForce ? '✅' : '❌'}`);
      }
      if (result.succeededWithForce !== undefined) {
        console.log(`   Succeeded with --force: ${result.succeededWithForce ? '✅' : '❌'}`);
      }

      if (result.output) {
        console.log('🖥️ Command output:');
        console.log(`   ${result.output.substring(0, 300)}...`);
      }
    } else {
      console.log(`❌ T003 FAILED (${duration}ms)`);
      console.log(`   Details: ${result.details}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }

  } catch (error) {
    console.log(`❌ T003 FAILED with exception:`);
    console.log(`   ${error.message}`);
    if (error.stack) {
      console.log('📍 Stack trace:');
      console.log(error.stack);
    }
  }

  console.log('');
  console.log('🏁 T003 single test completed');
}

// Run if called directly
if (require.main === module) {
  runT003Only().catch(error => {
    console.error('❌ T003 test runner failed:', error.message);
    process.exit(1);
  });
}

module.exports = runT003Only;