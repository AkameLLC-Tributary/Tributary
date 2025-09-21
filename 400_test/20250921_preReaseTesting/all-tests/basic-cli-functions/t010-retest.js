#!/usr/bin/env node

/**
 * T010 Re-test with Token 2022 fixes
 */

const ComprehensiveTestRunner = require('./src/comprehensive-test-runner');

async function runT010ReTest() {
  console.log('🔍 T010 Re-test with Token 2022 fixes');
  console.log('='.repeat(60));

  const runner = new ComprehensiveTestRunner();
  runner.userConfig = {
    network: 'testnet',
    rpcUrl: 'https://api.testnet.solana.com',
    adminWallet: 'YOUR_ADMIN_WALLET_ADDRESS_HERE',
    targetToken: 'YOUR_TOKEN_ADDRESS_HERE',
    projectName: 'T010ReTest',
    testMode: 'real'
  };

  console.log('Testing Token Address:', runner.userConfig.targetToken);
  console.log('Network:', runner.userConfig.network);
  console.log('Admin Wallet:', runner.userConfig.adminWallet);
  console.log('');

  try {
    const result = await runner.testTokenCollection();

    console.log('🎯 T010 Test Result:');
    console.log('Success:', result.success ? '✅' : '❌');
    console.log('Details:', result.details);
    console.log('Has Holders:', result.hasHolders ? '✅ Found holders' : '❌ No holders detected');
    console.log('');
    console.log('📋 Full Output:');
    console.log(result.output);

    if (!result.success || !result.hasHolders) {
      console.log('');
      console.log('❌ Token 2022 holder detection still not working properly');
      console.log('This may indicate that further fixes are needed in the RPC client.');
    } else {
      console.log('');
      console.log('✅ Token 2022 holder detection working correctly!');
      console.log('The fix has successfully resolved the T010 discrepancy.');
    }

    return result;
  } catch (error) {
    console.log('❌ T010 test failed:', error.message);
    console.log('Stack:', error.stack);
    return { success: false, error: error.message };
  }
}

runT010ReTest().catch(error => {
  console.error('❌ Script failed:', error.message);
  process.exit(1);
});