#!/usr/bin/env node

/**
 * T150 File Operations Test
 * Tests file read/write operations and data persistence
 */

const ComprehensiveTestRunner = require('./path/to/your/cli.js');
const fs = require('fs').promises;
const path = require('path');

async function runT150FileOperationsTest() {
  console.log('📁 T150 File Operations Test');
  console.log('='.repeat(60));

  const runner = new ComprehensiveTestRunner();
  runner.userConfig = {
    network: 'testnet',
    rpcUrl: 'https://api.testnet.solana.com',
    adminWallet: 'YOUR_ADMIN_WALLET_ADDRESS_HERE',
    targetToken: 'YOUR_TOKEN_ADDRESS_HERE',
    projectName: 'T150FileOpsTest',
    testMode: 'real'
  };

  console.log('Testing Token Address:', runner.userConfig.targetToken);
  console.log('Network:', runner.userConfig.network);
  console.log('Test: File operations - read/write/create/delete capabilities');
  console.log('');

  try {
    const testDir = await runner.createTestDirectory('t150-file-operations');

    // Step 1: Initialize project
    console.log('Step 1: Initializing project...');
    const initResult = await runner.execCommand(
      runner.buildTestCommand('./path/to/your/cli.js init --name T150FileOpsTest --token ${targetToken} --admin ${adminWallet} --network ${network} --force'),
      { cwd: testDir }
    );

    console.log('Init Success:', initResult.success ? '✅' : '❌');
    if (!initResult.success) {
      console.log('Init Error:', initResult.errorDetails || initResult.output);
      return { success: false, details: 'Initialization failed' };
    }

    // Step 2: Test file creation and writing
    console.log('');
    console.log('Step 2: Testing file creation and writing...');

    const testFile = path.join(testDir, 'test-data.json');
    const testData = {
      testId: 'T150',
      timestamp: new Date().toISOString(),
      testData: { holders: 100, threshold: 1.5 }
    };

    try {
      await fs.writeFile(testFile, JSON.stringify(testData, null, 2));
      console.log('File Write Success: ✅');
    } catch (error) {
      console.log('File Write Error: ❌', error.message);
      return { success: false, details: 'File write failed' };
    }

    // Step 3: Test file reading
    console.log('');
    console.log('Step 3: Testing file reading...');

    try {
      const readData = await fs.readFile(testFile, 'utf8');
      const parsedData = JSON.parse(readData);

      if (parsedData.testId === 'T150') {
        console.log('File Read Success: ✅');
        console.log('Data integrity verified: ✅');
      } else {
        console.log('Data integrity failed: ❌');
        return { success: false, details: 'Data integrity check failed' };
      }
    } catch (error) {
      console.log('File Read Error: ❌', error.message);
      return { success: false, details: 'File read failed' };
    }

    // Step 4: Test subdirectory operations
    console.log('');
    console.log('Step 4: Testing subdirectory operations...');

    const subDir = path.join(testDir, 'subdir');
    try {
      await fs.mkdir(subDir, { recursive: true });
      console.log('Directory Creation Success: ✅');

      // Test file in subdirectory
      const subFile = path.join(subDir, 'sub-test.txt');
      await fs.writeFile(subFile, 'Test content for subdirectory file');
      console.log('Subdirectory File Creation Success: ✅');

      // Verify file exists
      const stats = await fs.stat(subFile);
      if (stats.isFile()) {
        console.log('Subdirectory File Verification: ✅');
      }
    } catch (error) {
      console.log('Subdirectory Operations Error: ❌', error.message);
      return { success: false, details: 'Subdirectory operations failed' };
    }

    // Step 5: Test config file operations
    console.log('');
    console.log('Step 5: Testing config file operations...');

    const configShowResult = await runner.execCommand(
      './path/to/your/cli.js config show',
      { cwd: testDir }
    );

    console.log('Config Show Success:', configShowResult.success ? '✅' : '❌');
    if (configShowResult.success) {
      console.log('Config file readable: ✅');
    }

    // Step 6: Test file cleanup
    console.log('');
    console.log('Step 6: Testing file cleanup...');

    try {
      await fs.unlink(testFile);
      await fs.unlink(path.join(subDir, 'sub-test.txt'));
      await fs.rmdir(subDir);
      console.log('File Cleanup Success: ✅');
    } catch (error) {
      console.log('File Cleanup Warning: ⚠️', error.message);
    }

    console.log('');
    console.log('✅ T150 File Operations Test completed successfully');

    return {
      success: true,
      details: 'All file operations working correctly',
      testResults: {
        fileWrite: true,
        fileRead: true,
        directoryOps: true,
        configAccess: configShowResult.success,
        cleanup: true
      }
    };

  } catch (error) {
    console.error('❌ T150 Test failed:', error.message);
    return {
      success: false,
      details: error.message,
      error: error
    };
  }
}

// Export for use by other test runners
module.exports = { runT150FileOperationsTest };

// Run if called directly
if (require.main === module) {
  runT150FileOperationsTest()
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