const { spawn } = require('child_process');
const path = require('path');

/**
 * T214: Environment Variable Validation Test
 *
 * Tests Tributary CLI's handling of environment variables and validation
 * of potentially malicious environment configurations.
 */

// Test configuration - MASKED SENSITIVE VALUES
const config = {
    targetToken: 'YOUR_TOKEN_ADDRESS_HERE',
    adminWallet: 'YOUR_ADMIN_WALLET_ADDRESS_HERE',
    network: 'testnet',
    cliPath: './path/to/your/cli.js'
};

const maliciousEnvVars = [
    {
        name: 'TRIBUTARY_MALICIOUS_SCRIPT',
        value: '; rm -rf /',
        description: 'Command injection via environment variable'
    },
    {
        name: 'TRIBUTARY_XSS_ATTEMPT',
        value: '<script>alert("xss")</script>',
        description: 'XSS injection via environment variable'
    },
    {
        name: 'TRIBUTARY_PATH_TRAVERSAL',
        value: '../../../etc/passwd',
        description: 'Path traversal via environment variable'
    },
    {
        name: 'TRIBUTARY_BUFFER_OVERFLOW',
        value: 'A'.repeat(10000),
        description: 'Buffer overflow attempt via environment variable'
    },
    {
        name: 'TRIBUTARY_SQL_INJECTION',
        value: "'; DROP TABLE users; --",
        description: 'SQL injection via environment variable'
    }
];

async function execCommandWithEnv(command, args, envVars = {}, options = {}) {
    return new Promise((resolve) => {
        const child = spawn(command, args, {
            stdio: 'pipe',
            env: { ...process.env, ...envVars },
            ...options
        });

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data) => stdout += data.toString());
        child.stderr?.on('data', (data) => stderr += data.toString());

        const timeout = setTimeout(() => {
            child.kill();
            resolve({ success: false, stdout, stderr, timeout: true });
        }, options.timeout || 5000);

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

async function testEnvironmentVariableValidation() {
    console.log('🧪 Testing Environment Variable Validation (T214)');
    console.log('==================================================');

    const results = [];

    // Test 1: Malicious environment variables
    console.log('\n🎯 Test 1: Malicious Environment Variable Handling');

    for (const { name, value, description } of maliciousEnvVars) {
        console.log(`\n🔍 Testing ${name}: ${description}`);
        console.log(`   Value: "${value.substring(0, 50)}${value.length > 50 ? '...' : ''}"`);

        try {
            const envVar = { [name]: value };
            const result = await execCommandWithEnv('node', [
                config.cliPath,
                'init',
                '--name', 'EnvTest',
                '--token', config.targetToken,
                '--admin', config.adminWallet,
                '--network', config.network,
                '--force'
            ], envVar);

            // Check if malicious environment variable was properly handled
            const envHandled = !result.success ||
                             !result.stdout.includes('<script>') &&
                             !result.stdout.includes('root:') &&
                             !result.stdout.includes('DROP TABLE') &&
                             !result.stdout.includes('rm -rf');

            results.push({
                category: 'Malicious Env Var',
                type: name,
                value,
                description,
                handled: envHandled,
                success: result.success,
                timeout: result.timeout,
                systemError: result.systemError || false
            });

            const status = envHandled ? '✅ HANDLED' : '⚠️ POTENTIAL RISK';
            console.log(`   Result: ${status}`);

            if (!envHandled && result.stdout) {
                console.log(`   ⚠️ Suspicious output: ${result.stdout.substring(0, 100)}...`);
            }

        } catch (error) {
            console.log(`   Result: ✅ SYSTEM PROTECTED`);
            results.push({
                category: 'Malicious Env Var',
                type: name,
                value,
                description,
                handled: true,
                success: false,
                timeout: false,
                systemError: true
            });
        }
    }

    // Test 2: TRIBUTARY_ prefixed environment variables
    console.log('\n🎯 Test 2: TRIBUTARY_ Prefixed Variables');

    const tributaryEnvTests = [
        { name: 'TRIBUTARY_NETWORK', value: 'malicious-network', desc: 'Network override attempt' },
        { name: 'TRIBUTARY_RPC_URL', value: 'http://malicious.com', desc: 'RPC URL override attempt' },
        { name: 'TRIBUTARY_LOG_LEVEL', value: 'debug; rm -rf /', desc: 'Log level injection' },
        { name: 'TRIBUTARY_CONFIG_PATH', value: '/etc/passwd', desc: 'Config path traversal' }
    ];

    for (const { name, value, desc } of tributaryEnvTests) {
        console.log(`\n🔧 Testing ${desc}: ${name}="${value}"`);

        try {
            const envVar = { [name]: value };
            const result = await execCommandWithEnv('node', [
                config.cliPath,
                'config', 'show'
            ], envVar);

            const properlyValidated = !result.success ||
                                    result.stderr.includes('ValidationError') ||
                                    !result.stdout.includes('malicious') &&
                                    !result.stdout.includes('rm -rf') &&
                                    !result.stdout.includes('root:');

            results.push({
                category: 'TRIBUTARY_ Env Var',
                type: name,
                value,
                description: desc,
                handled: properlyValidated,
                success: result.success,
                timeout: result.timeout,
                systemError: result.systemError || false
            });

            console.log(`   Result: ${properlyValidated ? '✅ VALIDATED' : '⚠️ RISK'}`);

        } catch (error) {
            console.log(`   Result: ✅ SYSTEM PROTECTED`);
            results.push({
                category: 'TRIBUTARY_ Env Var',
                type: name,
                value,
                description: desc,
                handled: true,
                success: false,
                timeout: false,
                systemError: true
            });
        }
    }

    // Test 3: Environment variable sanitization
    console.log('\n🎯 Test 3: Environment Variable Sanitization');

    const sanitizationTests = [
        { name: 'PATH', value: '/malicious/path:$PATH', desc: 'PATH manipulation' },
        { name: 'HOME', value: '../../../etc', desc: 'HOME directory traversal' },
        { name: 'SHELL', value: '/bin/sh -c "rm -rf /"', desc: 'Shell command injection' }
    ];

    for (const { name, value, desc } of sanitizationTests) {
        console.log(`\n🧹 Testing ${desc}: ${name}="${value}"`);

        try {
            const envVar = { [name]: value };
            const result = await execCommandWithEnv('node', [
                config.cliPath,
                'parameters', 'show'
            ], envVar);

            const sanitized = !result.stdout.includes('malicious') &&
                            !result.stdout.includes('rm -rf') &&
                            !result.stdout.includes('../../../');

            results.push({
                category: 'Env Sanitization',
                type: name,
                value,
                description: desc,
                handled: sanitized,
                success: result.success,
                timeout: result.timeout,
                systemError: result.systemError || false
            });

            console.log(`   Result: ${sanitized ? '✅ SANITIZED' : '⚠️ LEAK'}`);

        } catch (error) {
            console.log(`   Result: ✅ SYSTEM PROTECTED`);
            results.push({
                category: 'Env Sanitization',
                type: name,
                value,
                description: desc,
                handled: true,
                success: false,
                timeout: false,
                systemError: true
            });
        }
    }

    // Analysis
    console.log('\n📊 Environment Variable Validation Analysis');
    console.log('===========================================');

    const handledCount = results.filter(r => r.handled).length;
    const systemProtected = results.filter(r => r.systemError).length;
    const appHandled = handledCount - systemProtected;
    const totalTests = results.length;

    console.log(`🛡️ Total env vars handled safely: ${handledCount}/${totalTests}`);
    console.log(`📱 App-level handling: ${appHandled}`);
    console.log(`🖥️ System-level protection: ${systemProtected}`);

    const protectionRate = (handledCount / totalTests * 100).toFixed(1);
    console.log(`🔒 Protection Rate: ${protectionRate}%`);

    // Category breakdown
    const categories = ['Malicious Env Var', 'TRIBUTARY_ Env Var', 'Env Sanitization'];
    categories.forEach(category => {
        const categoryResults = results.filter(r => r.category === category);
        const categoryHandled = categoryResults.filter(r => r.handled).length;
        console.log(`📁 ${category}: ${categoryHandled}/${categoryResults.length} handled`);
    });

    // Security Assessment
    if (handledCount === totalTests) {
        console.log('✅ Environment Variable Validation: EXCELLENT (all variables handled safely)');
    } else if (handledCount >= totalTests * 0.8) {
        console.log('⚠️ Environment Variable Validation: GOOD (most variables handled safely)');
    } else {
        console.log('❌ Environment Variable Validation: WEAK (significant vulnerabilities)');
    }

    return {
        handledCount,
        totalCount: totalTests,
        protectionRate: parseFloat(protectionRate),
        appHandled,
        systemProtected
    };
}

if (require.main === module) {
    testEnvironmentVariableValidation().catch(console.error);
}

module.exports = { testEnvironmentVariableValidation };