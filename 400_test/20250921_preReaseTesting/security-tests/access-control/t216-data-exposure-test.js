const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * T216: Sensitive Data Exposure Prevention Test
 *
 * Tests Tributary CLI's handling of sensitive data to prevent
 * accidental exposure in logs, outputs, or error messages.
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

async function testSensitiveDataExposurePrevention() {
    console.log('🧪 Testing Sensitive Data Exposure Prevention (T216)');
    console.log('====================================================');

    const results = [];

    // Setup base configuration
    console.log('\n🔧 Setting up test configuration...');

    const setupResult = await execCommand('node', [
        config.cliPath,
        'init',
        '--name', 'DataExposureTest',
        '--token', config.targetToken,
        '--admin', config.adminWallet,
        '--network', config.network,
        '--force'
    ]);

    if (!setupResult.success) {
        console.log('❌ Failed to create test configuration');
        return;
    }

    console.log('✅ Test configuration created');

    // Test 1: Configuration display masking
    console.log('\n🎯 Test 1: Configuration Display Masking');

    const configCommands = [
        { cmd: ['config', 'show'], desc: 'Full config display' },
        { cmd: ['config', 'show', '--section', 'token'], desc: 'Token section display' },
        { cmd: ['config', 'show', '--format', 'json'], desc: 'JSON format display' }
    ];

    for (const { cmd, desc } of configCommands) {
        console.log(`\n🔍 Testing ${desc}`);

        const result = await execCommand('node', [config.cliPath, ...cmd]);

        // Check for sensitive data exposure
        const tokenExposed = result.stdout.includes(config.targetToken);
        const walletExposed = result.stdout.includes(config.adminWallet);
        const partialMasking = result.stdout.includes('***') || result.stdout.includes('...');

        const dataProtected = !tokenExposed && !walletExposed;
        const maskingImplemented = partialMasking || dataProtected;

        results.push({
            category: 'Config Display',
            test: desc,
            command: cmd.join(' '),
            tokenExposed,
            walletExposed,
            dataProtected,
            maskingImplemented,
            success: result.success,
            timeout: result.timeout
        });

        const status = dataProtected ? '✅ PROTECTED' : '⚠️ EXPOSED';
        const masking = maskingImplemented ? '✅ MASKED' : '❌ PLAIN';

        console.log(`   Data Protection: ${status}, Masking: ${masking}`);

        if (tokenExposed) {
            console.log(`   ⚠️ Token address exposed in output`);
        }
        if (walletExposed) {
            console.log(`   ⚠️ Wallet address exposed in output`);
        }
    }

    // Test 2: Log file security
    console.log('\n🎯 Test 2: Log File Security');

    // Execute some operations to generate logs
    const logGeneratingCommands = [
        ['parameters', 'show'],
        ['config', 'validate'],
        ['collect', '--token', config.targetToken, '--threshold', '1.0', '--max-holders', '1']
    ];

    for (const cmd of logGeneratingCommands) {
        await execCommand('node', [config.cliPath, ...cmd], { timeout: 5000 });
    }

    // Check log files for sensitive data
    const logDir = path.join(process.cwd(), 'logs');
    const logFiles = [];

    if (fs.existsSync(logDir)) {
        const files = fs.readdirSync(logDir);
        logFiles.push(...files.map(f => path.join(logDir, f)));
    }

    // Also check for logs in current directory
    const currentDirLogs = ['tributary.log', 'error.log', 'combined.log'];
    currentDirLogs.forEach(logFile => {
        if (fs.existsSync(logFile)) {
            logFiles.push(logFile);
        }
    });

    console.log(`\n📄 Checking ${logFiles.length} log files for sensitive data...`);

    let logsSafe = true;
    let sensitiveDataInLogs = [];

    for (const logFile of logFiles) {
        try {
            const logContent = fs.readFileSync(logFile, 'utf8');

            const tokenInLog = logContent.includes(config.targetToken);
            const walletInLog = logContent.includes(config.adminWallet);

            if (tokenInLog) {
                sensitiveDataInLogs.push(`Token in ${path.basename(logFile)}`);
                logsSafe = false;
            }
            if (walletInLog) {
                sensitiveDataInLogs.push(`Wallet in ${path.basename(logFile)}`);
                logsSafe = false;
            }

            console.log(`   📋 ${path.basename(logFile)}: ${tokenInLog || walletInLog ? '⚠️ SENSITIVE DATA' : '✅ SAFE'}`);

        } catch (error) {
            console.log(`   📋 ${path.basename(logFile)}: ❌ READ ERROR`);
        }
    }

    results.push({
        category: 'Log File Security',
        test: 'Log file sensitive data check',
        command: 'log file analysis',
        tokenExposed: sensitiveDataInLogs.some(s => s.includes('Token')),
        walletExposed: sensitiveDataInLogs.some(s => s.includes('Wallet')),
        dataProtected: logsSafe,
        maskingImplemented: logsSafe,
        success: logsSafe,
        timeout: false
    });

    // Test 3: Error message security
    console.log('\n🎯 Test 3: Error Message Security');

    const errorTests = [
        {
            desc: 'Invalid token error',
            cmd: ['init', '--name', 'ErrorTest', '--token', 'invalid_token', '--admin', config.adminWallet, '--network', config.network, '--force']
        },
        {
            desc: 'Invalid wallet error',
            cmd: ['init', '--name', 'ErrorTest2', '--token', config.targetToken, '--admin', 'invalid_wallet', '--network', config.network, '--force']
        },
        {
            desc: 'Network connection error',
            cmd: ['collect', '--token', config.targetToken, '--threshold', '1.0']
        }
    ];

    for (const { desc, cmd } of errorTests) {
        console.log(`\n🚨 Testing ${desc}`);

        const result = await execCommand('node', [config.cliPath, ...cmd], { timeout: 5000 });

        // Check if error messages expose sensitive data
        const sensitiveInError = result.stderr.includes(config.targetToken) ||
                               result.stderr.includes(config.adminWallet);

        const errorSafe = !sensitiveInError;

        results.push({
            category: 'Error Message Security',
            test: desc,
            command: cmd.join(' '),
            tokenExposed: result.stderr.includes(config.targetToken),
            walletExposed: result.stderr.includes(config.adminWallet),
            dataProtected: errorSafe,
            maskingImplemented: errorSafe,
            success: result.success,
            timeout: result.timeout
        });

        console.log(`   Error Safety: ${errorSafe ? '✅ SAFE' : '⚠️ EXPOSED'}`);

        if (sensitiveInError) {
            console.log(`   ⚠️ Sensitive data found in error message`);
        }
    }

    // Test 4: Network transmission security
    console.log('\n🎯 Test 4: Network Transmission Security');

    // This would normally require network monitoring, but we'll test output sanitization
    const networkCommands = [
        { cmd: ['collect', '--token', config.targetToken, '--threshold', '1.0', '--max-holders', '1'], desc: 'Token collection' },
        { cmd: ['parameters', 'show', '--verbose'], desc: 'Verbose parameters' }
    ];

    for (const { cmd, desc } of networkCommands) {
        console.log(`\n🌐 Testing ${desc}`);

        const result = await execCommand('node', [config.cliPath, ...cmd], { timeout: 10000 });

        // Check output for unintended sensitive data exposure
        const networkSafe = !result.stdout.includes('private_key') &&
                          !result.stdout.includes('secret') &&
                          !result.stdout.includes('password');

        results.push({
            category: 'Network Security',
            test: desc,
            command: cmd.join(' '),
            tokenExposed: false, // Network commands shouldn't expose these directly
            walletExposed: false,
            dataProtected: networkSafe,
            maskingImplemented: networkSafe,
            success: result.success,
            timeout: result.timeout
        });

        console.log(`   Network Safety: ${networkSafe ? '✅ SAFE' : '⚠️ EXPOSED'}`);
    }

    // Analysis
    console.log('\n📊 Sensitive Data Exposure Prevention Analysis');
    console.log('==============================================');

    const totalTests = results.length;
    const protectedCount = results.filter(r => r.dataProtected).length;
    const maskedCount = results.filter(r => r.maskingImplemented).length;
    const tokenExposures = results.filter(r => r.tokenExposed).length;
    const walletExposures = results.filter(r => r.walletExposed).length;

    console.log(`🛡️ Data protection rate: ${protectedCount}/${totalTests} (${(protectedCount/totalTests*100).toFixed(1)}%)`);
    console.log(`🎭 Masking implementation: ${maskedCount}/${totalTests} (${(maskedCount/totalTests*100).toFixed(1)}%)`);
    console.log(`🔑 Token exposures: ${tokenExposures}`);
    console.log(`👛 Wallet exposures: ${walletExposures}`);

    // Category breakdown
    const categories = ['Config Display', 'Log File Security', 'Error Message Security', 'Network Security'];
    categories.forEach(category => {
        const categoryResults = results.filter(r => r.category === category);
        const categoryProtected = categoryResults.filter(r => r.dataProtected).length;
        console.log(`📁 ${category}: ${categoryProtected}/${categoryResults.length} protected`);
    });

    // Security Assessment
    const protectionRate = (protectedCount / totalTests * 100);
    const exposureCount = tokenExposures + walletExposures;

    if (protectionRate >= 90 && exposureCount === 0) {
        console.log('✅ Sensitive Data Exposure Prevention: EXCELLENT (robust data protection)');
    } else if (protectionRate >= 70 && exposureCount <= 2) {
        console.log('⚠️ Sensitive Data Exposure Prevention: GOOD (adequate protection with minor exposures)');
    } else {
        console.log('❌ Sensitive Data Exposure Prevention: WEAK (significant data exposure risks)');
    }

    // Recommendations
    if (exposureCount > 0) {
        console.log('\n💡 Recommendations:');
        if (tokenExposures > 0) {
            console.log('   • Implement token address masking in output displays');
        }
        if (walletExposures > 0) {
            console.log('   • Implement wallet address masking in output displays');
        }
        if (results.some(r => r.category === 'Log File Security' && !r.dataProtected)) {
            console.log('   • Remove sensitive data from log files');
        }
        if (results.some(r => r.category === 'Error Message Security' && !r.dataProtected)) {
            console.log('   • Sanitize error messages to prevent sensitive data leaks');
        }
    }

    return {
        protectedCount,
        totalCount: totalTests,
        protectionRate: parseFloat(protectionRate.toFixed(1)),
        tokenExposures,
        walletExposures,
        exposureCount
    };
}

if (require.main === module) {
    testSensitiveDataExposurePrevention().catch(console.error);
}

module.exports = { testSensitiveDataExposurePrevention };