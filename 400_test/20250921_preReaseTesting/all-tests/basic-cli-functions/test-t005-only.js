#!/usr/bin/env node

/**
 * T005 Only Test - Network-specific initialization
 * Single test execution to verify T005 works correctly
 */

const ComprehensiveTestRunner = require('./src/comprehensive-test-runner');

async function runT005Only() {
  console.log('🧪 Testing T005: Network-specific initialization (single test)');
  console.log('='.repeat(60));

  const runner = new ComprehensiveTestRunner();

  // Set up test configuration manually (no interactive)
  runner.userConfig = {
    network: 'devnet',
    adminWallet: 'YOUR_ADMIN_WALLET_ADDRESS_HERE',
    targetToken: 'YOUR_TOKEN_ADDRESS_HERE', // Valid SOL token address
    distributionToken: 'YOUR_DISTRIBUTION_TOKEN_ADDRESS_HERE',
    projectName: 'T005Test',
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

    // Execute T005 test directly - Network-specific initialization
    console.log('🚀 Executing T005: Network-specific initialization...');
    const result = await runner.testNetworkInit();

    const duration = Date.now() - startTime;

    if (result.success) {
      console.log(`✅ T005 PASSED (${duration}ms)`);
      console.log('📄 Test Details:');
      console.log(`   ${result.details}`);

      if (result.networkResults) {
        console.log('🌐 Network Test Results:');
        result.networkResults.forEach((networkResult, index) => {
          console.log(`   ${index + 1}. ${networkResult.network}: ${networkResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
          if (networkResult.error) {
            console.log(`      Error: ${networkResult.error}`);
          }
          if (networkResult.output) {
            console.log(`      Output: ${networkResult.output}`);
          }
        });
      }

      if (result.successfulNetworks !== undefined) {
        console.log(`   Successful networks: ${result.successfulNetworks}`);
      }

    } else {
      console.log(`❌ T005 FAILED (${duration}ms)`);
      console.log(`   Details: ${result.details}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }

  } catch (error) {
    console.log(`❌ T005 FAILED with exception:`);
    console.log(`   ${error.message}`);
    if (error.stack) {
      console.log('📍 Stack trace:');
      console.log(error.stack);
    }
  }

  console.log('');
  console.log('🏁 T005 single test completed');
}

// Run if called directly
if (require.main === module) {
  runT005Only().catch(error => {
    console.error('❌ T005 test runner failed:', error.message);
    process.exit(1);
  });
}

module.exports = runT005Only;