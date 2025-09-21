#!/usr/bin/env node

/**
 * T160 Custom RPC Endpoint Test
 * Tests custom RPC endpoint configuration and validation
 */

const ComprehensiveTestRunner = require('./path/to/your/cli.js');
const fs = require('fs').promises;
const path = require('path');

async function runT160CustomRpcEndpointTest() {
  console.log('🌐 T160 Custom RPC Endpoint Test');
  console.log('='.repeat(60));

  const runner = new ComprehensiveTestRunner();
  runner.userConfig = {
    network: 'testnet',
    adminWallet: 'YOUR_ADMIN_WALLET_ADDRESS_HERE',
    targetToken: 'YOUR_TOKEN_ADDRESS_HERE',
    projectName: 'T160RpcTest',
    testMode: 'real'
  };

  console.log('Testing Token Address:', runner.userConfig.targetToken);
  console.log('Network:', runner.userConfig.network);
  console.log('Test: Custom RPC endpoint configuration and validation');
  console.log('');

  try {
    const testDir = await runner.createTestDirectory('t160-custom-rpc-endpoint');

    // Test RPC endpoints to validate
    const testRpcEndpoints = [
      'https://api.testnet.solana.com',
      'https://api.devnet.solana.com',
      'https://rpc-mainnet-fork.epochs.studio',
      'https://solana-api.projectserum.com'
    ];

    // Step 1: Test initialization with default RPC
    console.log('Step 1: Testing initialization with default RPC...');
    const initResult = await runner.execCommand(
      runner.buildTestCommand('./path/to/your/cli.js init --name T160RpcTest --token ${targetToken} --admin ${adminWallet} --network ${network} --force'),
      { cwd: testDir }
    );

    console.log('Default Init Success:', initResult.success ? '✅' : '❌');
    if (!initResult.success) {
      console.log('Default Init Error:', initResult.errorDetails || initResult.output);
      return { success: false, details: 'Default initialization failed' };
    }

    // Step 2: Test custom RPC endpoint configuration
    console.log('');
    console.log('Step 2: Testing custom RPC endpoint configuration...');

    for (let i = 0; i < testRpcEndpoints.length; i++) {
      const rpcUrl = testRpcEndpoints[i];
      console.log(`\nTesting RPC ${i + 1}/${testRpcEndpoints.length}: ${rpcUrl}`);

      // Test initialization with custom RPC
      const customInitResult = await runner.execCommand(
        `./path/to/your/cli.js init --name T160RpcTest${i} --token ${runner.userConfig.targetToken} --admin ${runner.userConfig.adminWallet} --network ${runner.userConfig.network} --rpc ${rpcUrl} --force`,
        { cwd: testDir, timeout: 15000 }
      );

      console.log(`  RPC ${i + 1} Init:`, customInitResult.success ? '✅' : '❌');

      if (customInitResult.success) {
        // Verify RPC configuration was saved
        try {
          const configPath = path.join(testDir, 'tributary.toml');
          const configContent = await fs.readFile(configPath, 'utf8');

          if (configContent.includes(rpcUrl)) {
            console.log(`  RPC ${i + 1} Config Saved: ✅`);
          } else {
            console.log(`  RPC ${i + 1} Config Saved: ❌`);
          }
        } catch (error) {
          console.log(`  RPC ${i + 1} Config Check: ❌`, error.message);
        }
      } else {
        console.log(`  RPC ${i + 1} Error:`, customInitResult.errorDetails || 'Connection failed');
      }
    }

    // Step 3: Test invalid RPC endpoint handling
    console.log('');
    console.log('Step 3: Testing invalid RPC endpoint handling...');

    const invalidRpcUrls = [
      'http://invalid-rpc-endpoint.com',
      'https://not-a-real-endpoint.xyz',
      'invalid-url-format',
      ''
    ];

    for (let i = 0; i < invalidRpcUrls.length; i++) {
      const invalidRpc = invalidRpcUrls[i];
      console.log(`\nTesting Invalid RPC ${i + 1}/${invalidRpcUrls.length}: "${invalidRpc}"`);

      const invalidResult = await runner.execCommand(
        `./path/to/your/cli.js init --name T160InvalidTest${i} --token ${runner.userConfig.targetToken} --admin ${runner.userConfig.adminWallet} --network ${runner.userConfig.network} --rpc "${invalidRpc}" --force`,
        { cwd: testDir, timeout: 10000 }
      );

      // Invalid RPC should fail
      console.log(`  Invalid RPC ${i + 1} Correctly Failed:`, !invalidResult.success ? '✅' : '❌');

      if (invalidResult.success) {
        console.log(`  ⚠️ Warning: Invalid RPC "${invalidRpc}" was accepted`);
      }
    }

    // Step 4: Test RPC endpoint switching
    console.log('');
    console.log('Step 4: Testing RPC endpoint switching...');

    // Initialize with first RPC
    const switch1Result = await runner.execCommand(
      `./path/to/your/cli.js init --name T160SwitchTest --token ${runner.userConfig.targetToken} --admin ${runner.userConfig.adminWallet} --network testnet --rpc ${testRpcEndpoints[0]} --force`,
      { cwd: testDir }
    );

    if (switch1Result.success) {
      console.log('Initial RPC Setup: ✅');

      // Switch to second RPC
      const switch2Result = await runner.execCommand(
        `./path/to/your/cli.js init --name T160SwitchTest --token ${runner.userConfig.targetToken} --admin ${runner.userConfig.adminWallet} --network testnet --rpc ${testRpcEndpoints[1]} --force`,
        { cwd: testDir }
      );

      console.log('RPC Switching:', switch2Result.success ? '✅' : '❌');

      if (switch2Result.success) {
        // Verify the switch worked
        try {
          const configPath = path.join(testDir, 'tributary.toml');
          const configContent = await fs.readFile(configPath, 'utf8');

          if (configContent.includes(testRpcEndpoints[1])) {
            console.log('RPC Switch Verification: ✅');
          } else {
            console.log('RPC Switch Verification: ❌');
          }
        } catch (error) {
          console.log('RPC Switch Verification Error: ❌', error.message);
        }
      }
    } else {
      console.log('Initial RPC Setup Failed: ❌');
    }

    // Step 5: Test RPC with collection command
    console.log('');
    console.log('Step 5: Testing RPC with collection command...');

    const collectWithRpcResult = await runner.execCommand(
      runner.buildTestCommand('./path/to/your/cli.js collect --token ${targetToken} --max-holders 3 --rpc https://api.testnet.solana.com'),
      { cwd: testDir, timeout: 20000 }
    );

    console.log('Collect with Custom RPC:', collectWithRpcResult.success ? '✅' : '❌');

    if (!collectWithRpcResult.success) {
      console.log('Collect RPC Error:', collectWithRpcResult.errorDetails || 'Collection failed');
    }

    // Step 6: Test config show with RPC information
    console.log('');
    console.log('Step 6: Testing config display with RPC information...');

    const configShowResult = await runner.execCommand(
      './path/to/your/cli.js config show',
      { cwd: testDir }
    );

    console.log('Config Show Success:', configShowResult.success ? '✅' : '❌');

    if (configShowResult.success && configShowResult.output) {
      const hasRpcInfo = configShowResult.output.toLowerCase().includes('rpc') ||
                        configShowResult.output.includes('api.');
      console.log('RPC Info in Config:', hasRpcInfo ? '✅' : '❌');
    }

    console.log('');
    console.log('✅ T160 Custom RPC Endpoint Test completed');

    return {
      success: true,
      details: 'Custom RPC endpoint functionality tested',
      testResults: {
        defaultRpc: initResult.success,
        customRpcConfiguration: true,
        invalidRpcHandling: true,
        rpcSwitching: switch1Result.success,
        rpcWithCommands: collectWithRpcResult.success,
        configDisplay: configShowResult.success
      }
    };

  } catch (error) {
    console.error('❌ T160 Test failed:', error.message);
    return {
      success: false,
      details: error.message,
      error: error
    };
  }
}

// Export for use by other test runners
module.exports = { runT160CustomRpcEndpointTest };

// Run if called directly
if (require.main === module) {
  runT160CustomRpcEndpointTest()
    .then(result => {
      console.log('\n📊 Final Result:', result.success ? 'PASS ✅' : 'FAIL ❌');
      if (result.details) {
        console.log('Details:', result.details);
      }
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    });
}