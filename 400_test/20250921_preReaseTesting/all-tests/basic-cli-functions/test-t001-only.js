#!/usr/bin/env node

/**
 * T001 Only Test - Basic initialization
 * Single test execution to verify T001 works correctly
 */

const ComprehensiveTestRunner = require('./src/comprehensive-test-runner');

async function runT001Only() {
  console.log('🧪 Testing T001: Basic initialization (single test)');
  console.log('='.repeat(50));

  const runner = new ComprehensiveTestRunner();

  // Set up test configuration manually (no interactive)
  runner.userConfig = {
    network: 'devnet',
    adminWallet: 'YOUR_ADMIN_WALLET_ADDRESS_HERE',
    targetToken: 'YOUR_TOKEN_ADDRESS_HERE', // Valid SOL token address
    distributionToken: 'YOUR_DISTRIBUTION_TOKEN_ADDRESS_HERE',
    projectName: 'T001Test',
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

    // Execute T001 test directly
    console.log('🚀 Executing T001: Basic initialization...');
    const result = await runner.testBasicInit();

    const duration = Date.now() - startTime;

    if (result.success) {
      console.log(`✅ T001 PASSED (${duration}ms)`);
      console.log('📄 Test Details:');
      console.log(`   ${result.details}`);
      console.log(`   Config created: ${result.configCreated ? '✅' : '❌'}`);
      console.log(`   File existed before: ${result.fileExistedBefore ? '⚠️' : '✅'}`);
      console.log(`   File exists after: ${result.fileExistsAfter ? '✅' : '❌'}`);

      if (result.configContent) {
        console.log('📝 Config file content preview:');
        console.log(`   ${result.configContent}`);
      }

      if (result.output) {
        console.log('🖥️ Command output:');
        console.log(`   ${result.output.substring(0, 200)}...`);
      }
    } else {
      console.log(`❌ T001 FAILED (${duration}ms)`);
      console.log(`   Details: ${result.details}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }

  } catch (error) {
    console.log(`❌ T001 FAILED with exception:`);
    console.log(`   ${error.message}`);
    if (error.stack) {
      console.log('📍 Stack trace:');
      console.log(error.stack);
    }
  }

  console.log('');
  console.log('🏁 T001 single test completed');
}

// Run if called directly
if (require.main === module) {
  runT001Only().catch(error => {
    console.error('❌ T001 test runner failed:', error.message);
    process.exit(1);
  });
}

module.exports = runT001Only;