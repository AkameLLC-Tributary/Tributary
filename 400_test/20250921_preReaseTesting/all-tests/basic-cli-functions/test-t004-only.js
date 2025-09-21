#!/usr/bin/env node

/**
 * T004 Only Test - Invalid parameters validation
 * Single test execution to verify T004 works correctly
 */

const ComprehensiveTestRunner = require('./src/comprehensive-test-runner');

async function runT004Only() {
  console.log('🧪 Testing T004: Invalid parameters validation (single test)');
  console.log('='.repeat(60));

  const runner = new ComprehensiveTestRunner();

  // Set up test configuration manually (no interactive)
  runner.userConfig = {
    network: 'devnet',
    adminWallet: 'YOUR_ADMIN_WALLET_ADDRESS_HERE',
    targetToken: 'YOUR_TOKEN_ADDRESS_HERE', // Valid SOL token address
    distributionToken: 'YOUR_DISTRIBUTION_TOKEN_ADDRESS_HERE',
    projectName: 'T004Test',
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

    // Execute T004 test directly - Invalid parameters validation
    console.log('🚀 Executing T004: Invalid parameters validation...');
    const result = await runner.testInvalidParameters();

    const duration = Date.now() - startTime;

    if (result.success) {
      console.log(`✅ T004 PASSED (${duration}ms)`);
      console.log('📄 Test Details:');
      console.log(`   ${result.details}`);

      if (result.validationWorked !== undefined) {
        console.log(`   Validation worked: ${result.validationWorked ? '✅' : '❌'}`);
      }
      if (result.rejectedError) {
        console.log(`   Rejected error: ${result.rejectedError}`);
      }

      if (result.output) {
        console.log('🖥️ Command output:');
        console.log(`   ${result.output.substring(0, 300)}...`);
      }
    } else {
      console.log(`❌ T004 FAILED (${duration}ms)`);
      console.log(`   Details: ${result.details}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }

  } catch (error) {
    console.log(`❌ T004 FAILED with exception:`);
    console.log(`   ${error.message}`);
    if (error.stack) {
      console.log('📍 Stack trace:');
      console.log(error.stack);
    }
  }

  console.log('');
  console.log('🏁 T004 single test completed');
}

// Run if called directly
if (require.main === module) {
  runT004Only().catch(error => {
    console.error('❌ T004 test runner failed:', error.message);
    process.exit(1);
  });
}

module.exports = runT004Only;