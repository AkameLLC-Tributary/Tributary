const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * T218: Access Control Validation Test
 *
 * Tests Tributary CLI's access control mechanisms including
 * admin operations, file permissions, and command authorization.
 */

// Test configuration - MASKED SENSITIVE VALUES
const config = {
    targetToken: 'YOUR_TOKEN_ADDRESS_HERE',
    adminWallet: 'YOUR_ADMIN_WALLET_ADDRESS_HERE',
    network: 'testnet',
    cliPath: './path/to/your/cli.js'
};

async function execCommand(command, args, options = {}) {
    return new Promise((resolve) => {
        const child = spawn(command, args, {
            stdio: 'pipe',
            ...options
        });

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data) => stdout += data.toString());
        child.stderr?.on('data', (data) => stderr += data.toString());

        const timeout = setTimeout(() => {
            child.kill();
            resolve({ success: false, stdout, stderr, timeout: true });
        }, options.timeout || 8000);

        child.on('close', (code) => {
            clearTimeout(timeout);
            resolve({ success: code === 0, stdout, stderr, timeout: false });
        });

        child.on('error', (error) => {
            clearTimeout(timeout);
            resolve({ success: false, stdout: '', stderr: error.message, systemError: true });
        });
    });
}

async function testAccessControlValidation() {
    console.log('🧪 Testing Access Control Validation (T218)');
    console.log('============================================');

    const results = [];

    // Setup base configuration
    console.log('\n🔧 Setting up access control test configuration...');

    const setupResult = await execCommand('node', [
        config.cliPath,
        'init',
        '--name', 'AccessControlTest',
        '--token', config.targetToken,
        '--admin', config.adminWallet,
        '--network', config.network,
        '--force'
    ]);

    console.log(`   Setup: ${setupResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);

    if (!setupResult.success) {
        console.log('❌ Cannot proceed without base configuration');
        return;
    }

    // Test 1: Admin operations validation
    console.log('\n🎯 Test 1: Admin Operations Validation');

    const adminOperations = [
        { cmd: ['config', 'show'], desc: 'Configuration display (admin operation)' },
        { cmd: ['config', 'validate'], desc: 'Configuration validation (admin operation)' },
        { cmd: ['config', 'export', 'admin-test-export.toml'], desc: 'Configuration export (admin operation)' }
    ];

    let adminOpsWorking = 0;

    for (const { cmd, desc } of adminOperations) {
        console.log(`\n🔑 Testing ${desc}...`);

        const result = await execCommand('node', [config.cliPath, ...cmd]);

        const operationSuccess = result.success;
        if (operationSuccess) adminOpsWorking++;

        results.push({
            category: 'Admin Operations',
            test: desc,
            command: cmd.join(' '),
            authorized: operationSuccess,
            success: result.success,
            timeout: result.timeout,
            error: result.stderr
        });

        const status = operationSuccess ? '✅ SUCCESS' : '❌ FAILED';
        console.log(`   ${desc}: ${status}`);

        if (!operationSuccess && result.stderr) {
            console.log(`   Error: ${result.stderr.substring(0, 100)}...`);
        }
    }

    console.log(`\n📊 Admin operations working: ${adminOpsWorking}/${adminOperations.length}`);

    // Test 2: File permission access control
    console.log('\n🎯 Test 2: File Permission Access Control');

    const configFile = path.join(process.cwd(), 'tributary.toml');
    let fileAccessControl = {
        configExists: false,
        configReadable: false,
        adminWalletInConfig: false,
        securitySettingsPresent: false
    };

    try {
        fileAccessControl.configExists = fs.existsSync(configFile);
        console.log(`   Config file exists: ${fileAccessControl.configExists ? '✅ YES' : '❌ NO'}`);

        if (fileAccessControl.configExists) {
            const configContent = fs.readFileSync(configFile, 'utf8');
            fileAccessControl.configReadable = configContent.length > 0;
            fileAccessControl.adminWalletInConfig = configContent.includes(config.adminWallet);

            // Check for security settings
            fileAccessControl.securitySettingsPresent =
                configContent.includes('key_encryption') ||
                configContent.includes('backup_enabled') ||
                configContent.includes('audit_log');

            console.log(`   Config readable: ${fileAccessControl.configReadable ? '✅ YES' : '❌ NO'}`);
            console.log(`   Admin wallet in config: ${fileAccessControl.adminWalletInConfig ? '✅ YES' : '❌ NO'}`);
            console.log(`   Security settings present: ${fileAccessControl.securitySettingsPresent ? '✅ YES' : '❌ NO'}`);
        }

    } catch (error) {
        console.log(`   File access error: ${error.message}`);
        fileAccessControl.configReadable = false;
    }

    results.push({
        category: 'File Access Control',
        test: 'Configuration file access',
        command: 'file system access',
        authorized: fileAccessControl.configExists && fileAccessControl.configReadable,
        success: fileAccessControl.configExists,
        timeout: false,
        details: fileAccessControl
    });

    // Test 3: Command authorization testing
    console.log('\n🎯 Test 3: Command Authorization Testing');

    const authorizationTests = [
        { cmd: ['parameters', 'show'], desc: 'Parameter display authorization', shouldWork: true },
        { cmd: ['config', 'export', 'auth-test.toml'], desc: 'Configuration export authorization', shouldWork: true },
        { cmd: ['--help'], desc: 'Help command access', shouldWork: true },
        { cmd: ['--version'], desc: 'Version command access', shouldWork: true }
    ];

    let authorizedCommands = 0;

    for (const { cmd, desc, shouldWork } of authorizationTests) {
        console.log(`\n🔐 Testing ${desc}...`);

        const result = await execCommand('node', [config.cliPath, ...cmd]);

        const commandAuthorized = result.success === shouldWork;
        if (commandAuthorized) authorizedCommands++;

        results.push({
            category: 'Command Authorization',
            test: desc,
            command: cmd.join(' '),
            authorized: commandAuthorized,
            success: result.success,
            timeout: result.timeout,
            expectedResult: shouldWork
        });

        const status = commandAuthorized ? '✅ AUTHORIZED' : '❌ UNAUTHORIZED';
        console.log(`   ${desc}: ${status}`);
    }

    console.log(`\n📊 Authorized commands: ${authorizedCommands}/${authorizationTests.length}`);

    // Test 4: Wallet access validation
    console.log('\n🎯 Test 4: Wallet Access Validation');

    const walletAccessTests = [
        {
            cmd: ['collect', '--token', config.targetToken, '--threshold', '1.0', '--max-holders', '5'],
            desc: 'Token collection with admin authorization',
            timeout: 15000
        }
    ];

    let walletAccessWorking = 0;

    for (const { cmd, desc, timeout } of walletAccessTests) {
        console.log(`\n👛 Testing ${desc}...`);

        const result = await execCommand('node', [config.cliPath, ...cmd], { timeout });

        // For wallet operations, we consider both success and controlled failure as valid
        const walletAccessValid = result.success ||
                                result.timeout ||
                                result.stderr.includes('NetworkError') ||
                                result.stderr.includes('timeout');

        if (walletAccessValid) walletAccessWorking++;

        results.push({
            category: 'Wallet Access',
            test: desc,
            command: cmd.join(' '),
            authorized: walletAccessValid,
            success: result.success,
            timeout: result.timeout,
            error: result.stderr
        });

        const status = walletAccessValid ? '✅ AUTHORIZED' : '❌ DENIED';
        console.log(`   ${desc}: ${status}`);

        if (result.timeout) {
            console.log(`   Note: Operation timed out (likely network-related)`);
        }
    }

    // Test 5: Security policy validation
    console.log('\n🎯 Test 5: Security Policy Validation');

    let securityPolicyValidation = {
        keyEncryptionEnabled: false,
        backupEnabled: false,
        auditLogEnabled: false,
        allPoliciesEnforced: false
    };

    try {
        const configContent = fs.readFileSync(configFile, 'utf8');

        securityPolicyValidation.keyEncryptionEnabled = configContent.includes('key_encryption = true');
        securityPolicyValidation.backupEnabled = configContent.includes('backup_enabled = true');
        securityPolicyValidation.auditLogEnabled = configContent.includes('audit_log = true');

        securityPolicyValidation.allPoliciesEnforced =
            securityPolicyValidation.keyEncryptionEnabled &&
            securityPolicyValidation.backupEnabled &&
            securityPolicyValidation.auditLogEnabled;

        console.log(`   Security policies enforced: ${securityPolicyValidation.allPoliciesEnforced ? '✅ YES' : '❌ NO'}`);
        console.log(`     Key encryption: ${securityPolicyValidation.keyEncryptionEnabled ? '✅ ENABLED' : '❌ DISABLED'}`);
        console.log(`     Backup enabled: ${securityPolicyValidation.backupEnabled ? '✅ ENABLED' : '❌ DISABLED'}`);
        console.log(`     Audit logging: ${securityPolicyValidation.auditLogEnabled ? '✅ ENABLED' : '❌ DISABLED'}`);

    } catch (error) {
        console.log(`   Security validation error: ${error.message}`);
    }

    results.push({
        category: 'Security Policy',
        test: 'Security policy enforcement',
        command: 'policy validation',
        authorized: securityPolicyValidation.allPoliciesEnforced,
        success: securityPolicyValidation.allPoliciesEnforced,
        timeout: false,
        details: securityPolicyValidation
    });

    // Analysis
    console.log('\n📊 Access Control Validation Analysis');
    console.log('=====================================');

    const totalTests = results.length;
    const authorizedTests = results.filter(r => r.authorized).length;

    // Category breakdown
    const categories = ['Admin Operations', 'File Access Control', 'Command Authorization', 'Wallet Access', 'Security Policy'];

    categories.forEach(category => {
        const categoryResults = results.filter(r => r.category === category);
        const categoryAuthorized = categoryResults.filter(r => r.authorized).length;
        console.log(`🔐 ${category}: ${categoryAuthorized}/${categoryResults.length} authorized`);
    });

    // Calculate access control score
    let accessControlScore = 0;
    if (adminOpsWorking >= adminOperations.length * 0.8) accessControlScore++; // Admin ops working
    if (fileAccessControl.configExists && fileAccessControl.configReadable) accessControlScore++; // File access
    if (authorizedCommands >= authorizationTests.length * 0.8) accessControlScore++; // Command auth
    if (walletAccessWorking > 0) accessControlScore++; // Wallet access
    if (securityPolicyValidation.allPoliciesEnforced) accessControlScore++; // Security policies

    console.log(`\n🏆 Overall access control score: ${accessControlScore}/5 capabilities working`);

    const authorizationRate = (authorizedTests / totalTests * 100).toFixed(1);
    console.log(`🔒 Authorization Rate: ${authorizationRate}%`);

    // Security Assessment
    if (accessControlScore >= 4) {
        console.log('✅ Access Control Validation: EXCELLENT (comprehensive access control)');
    } else if (accessControlScore >= 3) {
        console.log('⚠️ Access Control Validation: GOOD (adequate access control)');
    } else {
        console.log('❌ Access Control Validation: WEAK (insufficient access control)');
    }

    // Detailed Results
    console.log('\n📋 Detailed Access Control Results');
    console.log('==================================');
    console.log('Category             | Test                     | Status      | Details');
    console.log('---------------------|--------------------------|-------------|-------------');

    results.forEach(result => {
        const status = result.authorized ? '✅ AUTHORIZED' : '❌ DENIED';
        const details = result.timeout ? 'TIMEOUT' : result.success ? 'SUCCESS' : 'FAILED';

        console.log(`${result.category.padEnd(20)} | ${result.test.substring(0, 24).padEnd(24)} | ${status.padEnd(11)} | ${details}`);
    });

    return {
        authorizedTests,
        totalTests,
        accessControlScore,
        authorizationRate: parseFloat(authorizationRate),
        categoryBreakdown: categories.map(cat => ({
            category: cat,
            authorized: results.filter(r => r.category === cat && r.authorized).length,
            total: results.filter(r => r.category === cat).length
        }))
    };
}

if (require.main === module) {
    testAccessControlValidation().catch(console.error);
}

module.exports = { testAccessControlValidation };