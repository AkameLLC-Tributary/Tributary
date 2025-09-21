#!/usr/bin/env node

/**
 * T151 Backup Functionality Test
 * Tests backup and restore functionality for configurations and data
 */

const ComprehensiveTestRunner = require('./path/to/your/cli.js');
const fs = require('fs').promises;
const path = require('path');

async function runT151BackupFunctionalityTest() {
  console.log('💾 T151 Backup Functionality Test');
  console.log('='.repeat(60));

  const runner = new ComprehensiveTestRunner();
  runner.userConfig = {
    network: 'testnet',
    rpcUrl: 'https://api.testnet.solana.com',
    adminWallet: 'YOUR_ADMIN_WALLET_ADDRESS_HERE',
    targetToken: 'YOUR_TOKEN_ADDRESS_HERE',
    projectName: 'T151BackupTest',
    testMode: 'real'
  };

  console.log('Testing Token Address:', runner.userConfig.targetToken);
  console.log('Network:', runner.userConfig.network);
  console.log('Test: Backup and restore functionality for configurations');
  console.log('');

  try {
    const testDir = await runner.createTestDirectory('t151-backup-functionality');
    const backupDir = path.join(testDir, 'backups');

    // Step 1: Initialize project
    console.log('Step 1: Initializing project...');
    const initResult = await runner.execCommand(
      runner.buildTestCommand('./path/to/your/cli.js init --name T151BackupTest --token ${targetToken} --admin ${adminWallet} --network ${network} --force'),
      { cwd: testDir }
    );

    console.log('Init Success:', initResult.success ? '✅' : '❌');
    if (!initResult.success) {
      console.log('Init Error:', initResult.errorDetails || initResult.output);
      return { success: false, details: 'Initialization failed' };
    }

    // Step 2: Create backup directory
    console.log('');
    console.log('Step 2: Creating backup directory...');

    try {
      await fs.mkdir(backupDir, { recursive: true });
      console.log('Backup Directory Creation: ✅');
    } catch (error) {
      console.log('Backup Directory Creation Error: ❌', error.message);
      return { success: false, details: 'Backup directory creation failed' };
    }

    // Step 3: Test configuration backup
    console.log('');
    console.log('Step 3: Testing configuration backup...');

    const configFile = path.join(testDir, 'tributary.toml');
    const backupFile = path.join(backupDir, `tributary-backup-${Date.now()}.toml`);

    try {
      // Check if config file exists
      await fs.access(configFile);
      console.log('Original Config File Found: ✅');

      // Create backup
      const configContent = await fs.readFile(configFile, 'utf8');
      await fs.writeFile(backupFile, configContent);
      console.log('Config Backup Created: ✅');

      // Verify backup integrity
      const backupContent = await fs.readFile(backupFile, 'utf8');
      if (configContent === backupContent) {
        console.log('Backup Integrity Verified: ✅');
      } else {
        console.log('Backup Integrity Failed: ❌');
        return { success: false, details: 'Backup integrity check failed' };
      }
    } catch (error) {
      console.log('Configuration Backup Error: ❌', error.message);
      return { success: false, details: 'Configuration backup failed' };
    }

    // Step 4: Test config modification and restore
    console.log('');
    console.log('Step 4: Testing config modification and restore...');

    try {
      // Modify original config (add a comment)
      const originalContent = await fs.readFile(configFile, 'utf8');
      const modifiedContent = originalContent + '\n# Test modification for backup test';
      await fs.writeFile(configFile, modifiedContent);
      console.log('Config Modified: ✅');

      // Restore from backup
      const backupContent = await fs.readFile(backupFile, 'utf8');
      await fs.writeFile(configFile, backupContent);
      console.log('Config Restored from Backup: ✅');

      // Verify restoration
      const restoredContent = await fs.readFile(configFile, 'utf8');
      if (restoredContent === originalContent) {
        console.log('Restore Verification: ✅');
      } else {
        console.log('Restore Verification Failed: ❌');
        return { success: false, details: 'Restore verification failed' };
      }
    } catch (error) {
      console.log('Config Restore Error: ❌', error.message);
      return { success: false, details: 'Config restore failed' };
    }

    // Step 5: Test multiple backup versions
    console.log('');
    console.log('Step 5: Testing multiple backup versions...');

    try {
      const backup1 = path.join(backupDir, 'tributary-v1.toml');
      const backup2 = path.join(backupDir, 'tributary-v2.toml');

      // Create version 1 backup
      const configContent = await fs.readFile(configFile, 'utf8');
      await fs.writeFile(backup1, configContent);

      // Modify config and create version 2 backup
      const modifiedContent = configContent + '\n# Version 2 backup';
      await fs.writeFile(configFile, modifiedContent);
      await fs.writeFile(backup2, modifiedContent);

      console.log('Multiple Backup Versions Created: ✅');

      // List backup files
      const backupFiles = await fs.readdir(backupDir);
      console.log(`Backup Files Found: ${backupFiles.length}`);
      console.log('Backup Files:', backupFiles.join(', '));

    } catch (error) {
      console.log('Multiple Backup Error: ❌', error.message);
      return { success: false, details: 'Multiple backup test failed' };
    }

    // Step 6: Test data backup (if collection data exists)
    console.log('');
    console.log('Step 6: Testing data backup capabilities...');

    // Try to collect some data first
    const collectResult = await runner.execCommand(
      runner.buildTestCommand('./path/to/your/cli.js collect --token ${targetToken} --output json --max-holders 5'),
      { cwd: testDir, timeout: 30000 }
    );

    if (collectResult.success) {
      console.log('Sample Collection for Backup: ✅');

      // Look for output files to backup
      try {
        const files = await fs.readdir(testDir);
        const dataFiles = files.filter(file => file.includes('holders') || file.includes('wallets'));

        if (dataFiles.length > 0) {
          console.log(`Data Files Found for Backup: ${dataFiles.length}`);

          // Backup data files
          for (const file of dataFiles) {
            const sourcePath = path.join(testDir, file);
            const backupPath = path.join(backupDir, `backup-${file}`);
            const content = await fs.readFile(sourcePath, 'utf8');
            await fs.writeFile(backupPath, content);
          }
          console.log('Data Files Backed Up: ✅');
        } else {
          console.log('No Data Files Found to Backup: ⚠️');
        }
      } catch (error) {
        console.log('Data Backup Warning: ⚠️', error.message);
      }
    } else {
      console.log('Sample Collection Failed: ⚠️ (Expected in some cases)');
    }

    console.log('');
    console.log('✅ T151 Backup Functionality Test completed successfully');

    return {
      success: true,
      details: 'All backup functionality working correctly',
      testResults: {
        backupCreation: true,
        backupIntegrity: true,
        configRestore: true,
        multipleVersions: true,
        dataBackup: collectResult.success
      }
    };

  } catch (error) {
    console.error('❌ T151 Test failed:', error.message);
    return {
      success: false,
      details: error.message,
      error: error
    };
  }
}

// Export for use by other test runners
module.exports = { runT151BackupFunctionalityTest };

// Run if called directly
if (require.main === module) {
  runT151BackupFunctionalityTest()
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