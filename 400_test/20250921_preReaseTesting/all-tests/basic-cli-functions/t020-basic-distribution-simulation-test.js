#!/usr/bin/env node

/**
 * T020: Basic distribution simulation test
 * Tests the tributary distribute simulate command functionality
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

async function runT020BasicDistributionSimulationTest() {
  console.log('🔍 T020 Basic Distribution Simulation Test');
  console.log('='.repeat(60));
  console.log('Testing Token Address: YOUR_TOKEN_ADDRESS_HERE');
  console.log('Network: testnet');
  console.log('Test: Basic distribution simulation functionality\n');

  const testDir = path.join(__dirname, 'temp', 't020-distribution-sim-' + Date.now());
  await fs.mkdir(testDir, { recursive: true });

  let testResults = {
    initSuccess: false,
    collectSuccess: false,
    simulateBasicSuccess: false,
    simulateAmountSuccess: false,
    simulateDetailSuccess: false,
    simulateBatchSizeSuccess: false,
    simulationOutput: null,
    amountSimulationOutput: null,
    detailSimulationOutput: null,
    batchSizeSimulationOutput: null
  };

  try {
    // Step 1: Initialize project
    console.log('Step 1: Initializing project...');
    const initCommand = [
      'tributary', 'init',
      '--name', 'T020DistSimTest',
      '--token', 'YOUR_TOKEN_ADDRESS_HERE',
      '--admin', 'YOUR_ADMIN_WALLET_ADDRESS_HERE',
      '--network', 'testnet',
      '--force'
    ];

    const initResult = await execCommand('./path/to/your/cli.js', initCommand, testDir);
    testResults.initSuccess = initResult.code === 0;
    console.log(`Init result: ${testResults.initSuccess ? '✅' : '❌'}`);

    if (!testResults.initSuccess) {
      console.log('Init failed:', initResult.stderr);
      throw new Error('Initialization failed');
    }

    // Step 2: Collect token holders first (required for simulation)
    console.log('\nStep 2: Collecting token holders...');
    const dataDir = path.join(testDir, 'data');
    await fs.mkdir(dataDir, { recursive: true });
    const walletsFile = path.join(dataDir, 'wallets.json');
    const collectCommand = [
      'tributary', 'collect',
      '--token', 'YOUR_TOKEN_ADDRESS_HERE',
      '--threshold', '0.1',
      '--max-holders', '10',
      '--output-file', walletsFile
    ];

    const collectResult = await execCommand('./path/to/your/cli.js', collectCommand, testDir);
    testResults.collectSuccess = collectResult.code === 0;
    console.log(`Collect result: ${testResults.collectSuccess ? '✅' : '❌'}`);

    if (!testResults.collectSuccess) {
      console.log('Collect failed:', collectResult.stderr);
      console.log('Collect stdout:', collectResult.stdout);
    }

    // Verify wallets.json file was created
    try {
      const walletsStats = await fs.stat(walletsFile);
      console.log(`Wallets file created: ✅ (${walletsStats.size} bytes)`);
    } catch (error) {
      console.log(`Wallets file creation: ❌ (${error.message})`);
    }

    // Step 3: Test basic distribution simulation
    console.log('\nStep 3: Testing basic distribution simulation...');
    const simulateBasicCommand = [
      'tributary', 'distribute', 'simulate',
      '--token', 'YOUR_TOKEN_ADDRESS_HERE'
    ];

    const simulateBasicResult = await execCommand('./path/to/your/cli.js', simulateBasicCommand, testDir);
    testResults.simulateBasicSuccess = simulateBasicResult.code === 0;
    testResults.simulationOutput = simulateBasicResult.stdout;
    console.log(`Basic simulation result: ${testResults.simulateBasicSuccess ? '✅' : '❌'}`);

    if (!testResults.simulateBasicSuccess) {
      console.log('Basic simulation stderr:', simulateBasicResult.stderr);
      console.log('Basic simulation stdout:', simulateBasicResult.stdout);
    }

    // Step 4: Test simulation with specific amount
    console.log('\nStep 4: Testing simulation with specific amount...');
    const simulateAmountCommand = [
      'tributary', 'distribute', 'simulate',
      '--token', 'YOUR_TOKEN_ADDRESS_HERE',
      '--amount', '100'
    ];

    const simulateAmountResult = await execCommand('./path/to/your/cli.js', simulateAmountCommand, testDir);
    testResults.simulateAmountSuccess = simulateAmountResult.code === 0;
    testResults.amountSimulationOutput = simulateAmountResult.stdout;
    console.log(`Amount simulation result: ${testResults.simulateAmountSuccess ? '✅' : '❌'}`);

    if (!testResults.simulateAmountSuccess) {
      console.log('Amount simulation stderr:', simulateAmountResult.stderr);
    }

    // Step 5: Test simulation with detail mode
    console.log('\nStep 5: Testing simulation with detail mode...');
    const simulateDetailCommand = [
      'tributary', 'distribute', 'simulate',
      '--token', 'YOUR_TOKEN_ADDRESS_HERE',
      '--amount', '50',
      '--detail'
    ];

    const simulateDetailResult = await execCommand('./path/to/your/cli.js', simulateDetailCommand, testDir);
    testResults.simulateDetailSuccess = simulateDetailResult.code === 0;
    testResults.detailSimulationOutput = simulateDetailResult.stdout;
    console.log(`Detail simulation result: ${testResults.simulateDetailSuccess ? '✅' : '❌'}`);

    if (!testResults.simulateDetailSuccess) {
      console.log('Detail simulation stderr:', simulateDetailResult.stderr);
    }

    // Step 6: Test simulation with custom batch size
    console.log('\nStep 6: Testing simulation with custom batch size...');
    const simulateBatchSizeCommand = [
      'tributary', 'distribute', 'simulate',
      '--token', 'YOUR_TOKEN_ADDRESS_HERE',
      '--amount', '75',
      '--batch-size', '5'
    ];

    const simulateBatchSizeResult = await execCommand('./path/to/your/cli.js', simulateBatchSizeCommand, testDir);
    testResults.simulateBatchSizeSuccess = simulateBatchSizeResult.code === 0;
    testResults.batchSizeSimulationOutput = simulateBatchSizeResult.stdout;
    console.log(`Batch size simulation result: ${testResults.simulateBatchSizeSuccess ? '✅' : '❌'}`);

    if (!testResults.simulateBatchSizeSuccess) {
      console.log('Batch size simulation stderr:', simulateBatchSizeResult.stderr);
    }

    // Step 7: Analyze simulation outputs
    console.log('\n📊 T020 Distribution Simulation Analysis:');
    console.log(`Project initialization: ${testResults.initSuccess ? '✅' : '❌'}`);
    console.log(`Token holder collection: ${testResults.collectSuccess ? '✅' : '❌'}`);
    console.log(`Basic simulation: ${testResults.simulateBasicSuccess ? '✅' : '❌'}`);
    console.log(`Amount simulation: ${testResults.simulateAmountSuccess ? '✅' : '❌'}`);
    console.log(`Detail simulation: ${testResults.simulateDetailSuccess ? '✅' : '❌'}`);
    console.log(`Batch size simulation: ${testResults.simulateBatchSizeSuccess ? '✅' : '❌'}`);

    // Verify simulation output content
    console.log('\n📋 Simulation Output Analysis:');

    if (testResults.simulationOutput) {
      const basicOutput = testResults.simulationOutput.toLowerCase();
      const hasSimulationKeywords = basicOutput.includes('simulation') || basicOutput.includes('total') ||
                                   basicOutput.includes('recipients') || basicOutput.includes('amount');
      console.log(`Basic simulation content: ${hasSimulationKeywords ? '✅ Contains expected keywords' : '❌ Missing key information'}`);
    }

    if (testResults.amountSimulationOutput) {
      const amountOutput = testResults.amountSimulationOutput.toLowerCase();
      const hasAmountInfo = amountOutput.includes('100') || amountOutput.includes('total');
      console.log(`Amount simulation content: ${hasAmountInfo ? '✅ Contains amount information' : '❌ Missing amount information'}`);
    }

    if (testResults.detailSimulationOutput) {
      const detailOutput = testResults.detailSimulationOutput.toLowerCase();
      const hasDetailInfo = detailOutput.includes('detail') || detailOutput.includes('breakdown') ||
                           detailOutput.includes('gas') || detailOutput.includes('estimate');
      console.log(`Detail simulation content: ${hasDetailInfo ? '✅ Contains detailed information' : '❌ Missing detailed information'}`);
    }

    if (testResults.batchSizeSimulationOutput) {
      const batchOutput = testResults.batchSizeSimulationOutput.toLowerCase();
      const hasBatchInfo = batchOutput.includes('batch') || batchOutput.includes('5') || batchOutput.includes('total');
      console.log(`Batch size simulation content: ${hasBatchInfo ? '✅ Contains batch information' : '❌ Missing batch information'}`);
    }

    console.log('\n🎯 T020 Test Results:');
    const basicFunctionalityWorking = testResults.initSuccess &&
                                     testResults.collectSuccess &&
                                     testResults.simulateBasicSuccess;

    const advancedFeaturesWorking = testResults.simulateAmountSuccess &&
                                   testResults.simulateDetailSuccess &&
                                   testResults.simulateBatchSizeSuccess;

    const overallSuccess = basicFunctionalityWorking && advancedFeaturesWorking;

    if (overallSuccess) {
      console.log('✅ Basic distribution simulation working correctly');
      console.log('✅ All simulation options functional (basic, amount, detail, batch-size)');
      console.log('✅ Simulation output contains expected information');
    } else if (basicFunctionalityWorking) {
      console.log('⚠️ Basic distribution simulation partially working');
      console.log('✅ Core simulation functionality working');
      if (!testResults.simulateAmountSuccess) console.log('  - Amount parameter simulation issues');
      if (!testResults.simulateDetailSuccess) console.log('  - Detail mode simulation issues');
      if (!testResults.simulateBatchSizeSuccess) console.log('  - Batch size simulation issues');
    } else {
      console.log('❌ Basic distribution simulation has major issues');
      if (!testResults.initSuccess) console.log('  - Project initialization failed');
      if (!testResults.collectSuccess) console.log('  - Token holder collection failed');
      if (!testResults.simulateBasicSuccess) console.log('  - Basic simulation functionality failed');
    }

    return overallSuccess;

  } catch (error) {
    console.log('\n❌ T020 test failed:', error.message);
    return false;
  }
}

async function execCommand(command, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: cwd,
      stdio: 'pipe',
      shell: true
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    child.on('error', (error) => {
      resolve({ code: -1, stdout, stderr: error.message });
    });
  });
}

// Execute the test
runT020BasicDistributionSimulationTest().then((success) => {
  process.exit(success ? 0 : 1);
}).catch((error) => {
  console.error('Test execution failed:', error);
  process.exit(1);
});