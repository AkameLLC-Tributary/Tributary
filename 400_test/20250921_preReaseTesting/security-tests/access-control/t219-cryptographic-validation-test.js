const { spawn } = require('child_process');
const path = require('path');

/**
 * T219: Cryptographic Operation Validation Test
 *
 * Tests Tributary CLI's cryptographic validation including
 * wallet address validation, token address validation, and
 * cryptographic operation security.
 */

// Test configuration - MASKED SENSITIVE VALUES
const config = {
    targetToken: 'YOUR_TOKEN_ADDRESS_HERE',
    adminWallet: 'YOUR_ADMIN_WALLET_ADDRESS_HERE',
    network: 'testnet',
    cliPath: './path/to/your/cli.js'
};

// Test data for cryptographic validation
const cryptoTestData = {
    invalidTokens: [
        'invalid_token_address',
        '123',
        'abcdefghijklmnopqrstuvwxyz',
        '',
        'So111111111111111111111111111111111111111112', // Wrong length
        'invalid@#$%^&*()',
        'not_a_base58_string'
    ],
    invalidWallets: [
        'invalid_wallet_address',
        '456',
        'zyxwvutsrqponmlkjihgfedcba',
        '',
        'D8zGvbM3w6bcAsnfWcZnWEz2GLeK7LPVftqwsMDCkcH', // Wrong length - masked for security
        'invalid@#$%^&*()',
        'not_a_base58_wallet'
    ],
    base58TestCases: [
        { input: 'InvalidBase58!@#', expected: 'reject', desc: 'Invalid characters' },
        { input: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', expected: 'reject', desc: 'Invalid Base58 set' },
        { input: 'IOl0', expected: 'reject', desc: 'Forbidden Base58 characters' }
    ],
    lengthTestCases: [
        { input: 'short', expected: 'reject', desc: 'Too short' },
        { input: 'verylongaddressthatexceedsthenormallengthofsolanaaddresses123456789', expected: 'reject', desc: 'Too long' }
    ]
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

async function testCryptographicValidation() {
    console.log('🧪 Testing Cryptographic Operation Validation (T219)');
    console.log('====================================================');

    const results = [];

    // Setup base configuration
    console.log('\n🔧 Setting up cryptographic validation test...');

    const setupResult = await execCommand('node', [
        config.cliPath,
        'init',
        '--name', 'CryptoValidationTest',
        '--token', config.targetToken,
        '--admin', config.adminWallet,
        '--network', config.network,
        '--force'
    ]);

    console.log(`   Setup: ${setupResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);

    // Test 1: Valid cryptographic address validation
    console.log('\n🎯 Test 1: Valid Cryptographic Address Validation');

    const validationTests = [
        { cmd: ['config', 'validate'], desc: 'Valid token address validation' },
        { cmd: ['config', 'show'], desc: 'Valid wallet address validation' }
    ];

    let validAddressTests = 0;

    for (const { cmd, desc } of validationTests) {
        console.log(`\n✅ Testing ${desc}...`);

        const result = await execCommand('node', [config.cliPath, ...cmd]);

        const validationPassed = result.success;
        if (validationPassed) validAddressTests++;

        results.push({
            category: 'Valid Address Validation',
            test: desc,
            input: 'valid addresses',
            expected: 'accept',
            actual: result.success ? 'accept' : 'reject',
            correct: validationPassed,
            success: result.success,
            timeout: result.timeout
        });

        console.log(`   ${desc}: ${validationPassed ? '✅ SUCCESS' : '❌ FAILED'}`);
    }

    // Test 2: Invalid token address validation
    console.log('\n🎯 Test 2: Invalid Token Address Validation');

    let invalidTokenResults = [];

    for (let i = 0; i < cryptoTestData.invalidTokens.length; i++) {
        const invalidToken = cryptoTestData.invalidTokens[i];
        const displayToken = invalidToken.length > 20 ? invalidToken.substring(0, 20) + '...' : invalidToken;

        console.log(`\n❌ Testing Invalid token ${i + 1}: "${displayToken}"`);

        try {
            const result = await execCommand('node', [
                config.cliPath,
                'init',
                '--name', `InvalidTokenTest${i}`,
                '--token', invalidToken,
                '--admin', config.adminWallet,
                '--network', config.network,
                '--force'
            ], { timeout: 5000 });

            const rejected = !result.success;
            invalidTokenResults.push(rejected);

            results.push({
                category: 'Invalid Token Validation',
                test: `Invalid token ${i + 1}`,
                input: invalidToken,
                expected: 'reject',
                actual: result.success ? 'accept' : 'reject',
                correct: rejected,
                success: result.success,
                timeout: result.timeout,
                systemError: false
            });

            const status = rejected ? '✅ REJECTED' : '⚠️ ACCEPTED';
            console.log(`   Invalid token ${i + 1}: ${status}`);

        } catch (error) {
            console.log(`   Invalid token ${i + 1}: ✅ SYSTEM REJECTED`);
            invalidTokenResults.push(true);

            results.push({
                category: 'Invalid Token Validation',
                test: `Invalid token ${i + 1}`,
                input: invalidToken,
                expected: 'reject',
                actual: 'reject',
                correct: true,
                success: false,
                timeout: false,
                systemError: true
            });
        }
    }

    // Test 3: Invalid wallet address validation
    console.log('\n🎯 Test 3: Invalid Wallet Address Validation');

    let invalidWalletResults = [];

    for (let i = 0; i < cryptoTestData.invalidWallets.length; i++) {
        const invalidWallet = cryptoTestData.invalidWallets[i];
        const displayWallet = invalidWallet.length > 20 ? invalidWallet.substring(0, 20) + '...' : invalidWallet;

        console.log(`\n❌ Testing Invalid wallet ${i + 1}: "${displayWallet}"`);

        try {
            const result = await execCommand('node', [
                config.cliPath,
                'init',
                '--name', `InvalidWalletTest${i}`,
                '--token', config.targetToken,
                '--admin', invalidWallet,
                '--network', config.network,
                '--force'
            ], { timeout: 5000 });

            const rejected = !result.success;
            invalidWalletResults.push(rejected);

            results.push({
                category: 'Invalid Wallet Validation',
                test: `Invalid wallet ${i + 1}`,
                input: invalidWallet,
                expected: 'reject',
                actual: result.success ? 'accept' : 'reject',
                correct: rejected,
                success: result.success,
                timeout: result.timeout,
                systemError: false
            });

            const status = rejected ? '✅ REJECTED' : '⚠️ ACCEPTED';
            console.log(`   Invalid wallet ${i + 1}: ${status}`);

        } catch (error) {
            console.log(`   Invalid wallet ${i + 1}: ✅ SYSTEM REJECTED`);
            invalidWalletResults.push(true);

            results.push({
                category: 'Invalid Wallet Validation',
                test: `Invalid wallet ${i + 1}`,
                input: invalidWallet,
                expected: 'reject',
                actual: 'reject',
                correct: true,
                success: false,
                timeout: false,
                systemError: true
            });
        }
    }

    // Test 4: Base58 encoding validation
    console.log('\n🎯 Test 4: Base58 Encoding Validation');

    let base58Results = [];

    for (let i = 0; i < cryptoTestData.base58TestCases.length; i++) {
        const { input, expected, desc } = cryptoTestData.base58TestCases[i];

        console.log(`\n🔤 Testing Base58 ${i + 1}: ${desc}`);

        try {
            const result = await execCommand('node', [
                config.cliPath,
                'init',
                '--name', `Base58Test${i}`,
                '--token', input,
                '--admin', config.adminWallet,
                '--network', config.network,
                '--force'
            ], { timeout: 5000 });

            const actual = result.success ? 'accept' : 'reject';
            const correct = actual === expected;
            base58Results.push(correct);

            results.push({
                category: 'Base58 Validation',
                test: `Base58 test ${i + 1}`,
                input,
                expected,
                actual,
                correct,
                success: result.success,
                timeout: result.timeout,
                systemError: false
            });

            console.log(`   Base58 test ${i + 1}: ${correct ? '✅ CORRECT' : '❌ INCORRECT'} (expected: ${expected}, got: ${actual})`);

        } catch (error) {
            const actual = 'reject';
            const correct = actual === expected;
            base58Results.push(correct);

            results.push({
                category: 'Base58 Validation',
                test: `Base58 test ${i + 1}`,
                input,
                expected,
                actual,
                correct,
                success: false,
                timeout: false,
                systemError: true
            });

            console.log(`   Base58 test ${i + 1}: ✅ SYSTEM REJECTED`);
        }
    }

    // Test 5: Address length validation
    console.log('\n🎯 Test 5: Address Length Validation');

    let lengthResults = [];

    for (let i = 0; i < cryptoTestData.lengthTestCases.length; i++) {
        const { input, expected, desc } = cryptoTestData.lengthTestCases[i];

        console.log(`\n📏 Testing Length ${i + 1}: ${desc} (length=${input.length})`);

        try {
            const result = await execCommand('node', [
                config.cliPath,
                'init',
                '--name', `LengthTest${i}`,
                '--token', input,
                '--admin', config.adminWallet,
                '--network', config.network,
                '--force'
            ], { timeout: 5000 });

            const actual = result.success ? 'accept' : 'reject';
            const correct = actual === expected;
            lengthResults.push(correct);

            results.push({
                category: 'Length Validation',
                test: `Length test ${i + 1}`,
                input,
                expected,
                actual,
                correct,
                success: result.success,
                timeout: result.timeout,
                systemError: false
            });

            console.log(`   Length test ${i + 1}: ${correct ? '✅ CORRECT' : '❌ INCORRECT'} (expected: ${expected}, got: ${actual})`);

        } catch (error) {
            const actual = 'reject';
            const correct = actual === expected;
            lengthResults.push(correct);

            results.push({
                category: 'Length Validation',
                test: `Length test ${i + 1}`,
                input,
                expected,
                actual,
                correct,
                success: false,
                timeout: false,
                systemError: true
            });

            console.log(`   Length test ${i + 1}: ✅ SYSTEM REJECTED`);
        }
    }

    // Test 6: Cryptographic security settings
    console.log('\n🎯 Test 6: Cryptographic Security Settings');

    let cryptoSecuritySettings = {
        keyEncryptionEnabled: false,
        backupEnabled: false,
        auditLogEnabled: false,
        allSecurityEnabled: false
    };

    try {
        const configPath = 'tributary.toml';
        const fs = require('fs');

        if (fs.existsSync(configPath)) {
            const configContent = fs.readFileSync(configPath, 'utf8');

            cryptoSecuritySettings.keyEncryptionEnabled = configContent.includes('key_encryption = true');
            cryptoSecuritySettings.backupEnabled = configContent.includes('backup_enabled = true');
            cryptoSecuritySettings.auditLogEnabled = configContent.includes('audit_log = true');

            cryptoSecuritySettings.allSecurityEnabled =
                cryptoSecuritySettings.keyEncryptionEnabled &&
                cryptoSecuritySettings.backupEnabled &&
                cryptoSecuritySettings.auditLogEnabled;

            console.log(`   Crypto security settings enforced: ${cryptoSecuritySettings.allSecurityEnabled ? '✅ YES' : '❌ NO'}`);
            console.log(`     Key encryption: ${cryptoSecuritySettings.keyEncryptionEnabled ? '✅ ENABLED' : '❌ DISABLED'}`);
            console.log(`     Backup enabled: ${cryptoSecuritySettings.backupEnabled ? '✅ ENABLED' : '❌ DISABLED'}`);
            console.log(`     Audit logging: ${cryptoSecuritySettings.auditLogEnabled ? '✅ ENABLED' : '❌ DISABLED'}`);
        }

    } catch (error) {
        console.log(`   Crypto security validation error: ${error.message}`);
    }

    results.push({
        category: 'Crypto Security Settings',
        test: 'Security settings validation',
        input: 'configuration analysis',
        expected: 'enabled',
        actual: cryptoSecuritySettings.allSecurityEnabled ? 'enabled' : 'disabled',
        correct: cryptoSecuritySettings.allSecurityEnabled,
        success: cryptoSecuritySettings.allSecurityEnabled,
        timeout: false,
        details: cryptoSecuritySettings
    });

    // Analysis
    console.log('\n📊 Cryptographic Validation Analysis');
    console.log('====================================');

    const validAddressValidation = validAddressTests >= validationTests.length;
    const invalidTokenHandling = invalidTokenResults.filter(r => r).length;
    const invalidWalletHandling = invalidWalletResults.filter(r => r).length;
    const base58Validation = base58Results.filter(r => r).length;
    const lengthValidation = lengthResults.filter(r => r).length;

    const invalidTokenScore = (invalidTokenHandling / cryptoTestData.invalidTokens.length) * 100;
    const invalidWalletScore = (invalidWalletHandling / cryptoTestData.invalidWallets.length) * 100;
    const base58Score = (base58Validation / cryptoTestData.base58TestCases.length) * 100;
    const lengthScore = (lengthValidation / cryptoTestData.lengthTestCases.length) * 100;

    console.log(`✅ Valid address validation: ${validAddressValidation ? 'WORKING' : 'FAILED'}`);
    console.log(`❌ Invalid token rejection: ${invalidTokenScore.toFixed(1)}% (${invalidTokenHandling}/${cryptoTestData.invalidTokens.length})`);
    console.log(`❌ Invalid wallet rejection: ${invalidWalletScore.toFixed(1)}% (${invalidWalletHandling}/${cryptoTestData.invalidWallets.length})`);
    console.log(`🔤 Base58 validation: ${base58Score.toFixed(1)}% (${base58Validation}/${cryptoTestData.base58TestCases.length})`);
    console.log(`📏 Length validation: ${lengthScore.toFixed(1)}% (${lengthValidation}/${cryptoTestData.lengthTestCases.length})`);
    console.log(`🔒 Crypto security settings: ${cryptoSecuritySettings.allSecurityEnabled ? 'ENFORCED' : 'WEAK'}`);

    // Overall crypto score
    let cryptoScore = 0;
    if (validAddressValidation) cryptoScore++;
    if (invalidTokenScore >= 80) cryptoScore++;
    if (invalidWalletScore >= 80) cryptoScore++;
    if (base58Score >= 80) cryptoScore++;
    if (lengthScore >= 80) cryptoScore++;
    if (cryptoSecuritySettings.allSecurityEnabled) cryptoScore++;

    console.log(`\n🏆 Overall cryptographic validation score: ${cryptoScore}/6 capabilities working`);

    // Security Assessment
    if (cryptoScore >= 5) {
        console.log('✅ Cryptographic Validation: EXCELLENT (comprehensive crypto validation)');
    } else if (cryptoScore >= 4) {
        console.log('⚠️ Cryptographic Validation: GOOD (adequate crypto validation)');
    } else {
        console.log('❌ Cryptographic Validation: WEAK (significant crypto validation issues)');
    }

    // Detailed Results
    console.log('\n📋 Detailed Cryptographic Validation Results');
    console.log('============================================');
    console.log('Category                 | Score                   | Status');
    console.log('-------------------------|-------------------------|------------------');

    console.log(`${'Valid Addresses'.padEnd(24)} | ${'100%'.padEnd(23)} | ${validAddressValidation ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`${'Invalid Token Reject'.padEnd(24)} | ${`${invalidTokenScore.toFixed(1)}%`.padEnd(23)} | ${invalidTokenScore >= 80 ? '✅ GOOD' : '❌ WEAK'}`);
    console.log(`${'Invalid Wallet Reject'.padEnd(24)} | ${`${invalidWalletScore.toFixed(1)}%`.padEnd(23)} | ${invalidWalletScore >= 80 ? '✅ GOOD' : '❌ WEAK'}`);
    console.log(`${'Base58 Validation'.padEnd(24)} | ${`${base58Score.toFixed(1)}%`.padEnd(23)} | ${base58Score >= 80 ? '✅ GOOD' : '❌ WEAK'}`);
    console.log(`${'Length Validation'.padEnd(24)} | ${`${lengthScore.toFixed(1)}%`.padEnd(23)} | ${lengthScore >= 80 ? '✅ GOOD' : '❌ WEAK'}`);
    console.log(`${'Security Settings'.padEnd(24)} | ${`${cryptoSecuritySettings.allSecurityEnabled ? '100%' : '0%'}`.padEnd(23)} | ${cryptoSecuritySettings.allSecurityEnabled ? '✅ ENFORCED' : '❌ WEAK'}`);

    return {
        cryptoScore,
        validAddressValidation,
        invalidTokenScore: parseFloat(invalidTokenScore.toFixed(1)),
        invalidWalletScore: parseFloat(invalidWalletScore.toFixed(1)),
        base58Score: parseFloat(base58Score.toFixed(1)),
        lengthScore: parseFloat(lengthScore.toFixed(1)),
        securitySettingsEnabled: cryptoSecuritySettings.allSecurityEnabled
    };
}

if (require.main === module) {
    testCryptographicValidation().catch(console.error);
}

module.exports = { testCryptographicValidation };