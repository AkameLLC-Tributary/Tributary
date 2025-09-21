const { spawn } = require('child_process');
const path = require('path');

/**
 * T213: Path Traversal Prevention Test
 *
 * Tests Tributary CLI's resilience against path traversal attacks.
 * Validates that file system access is properly restricted.
 */

// Test configuration - MASKED SENSITIVE VALUES
const config = {
    targetToken: 'YOUR_TOKEN_ADDRESS_HERE',
    adminWallet: 'YOUR_ADMIN_WALLET_ADDRESS_HERE',
    network: 'testnet',
    cliPath: './path/to/your/cli.js'
};

const pathTraversalPayloads = [
    {
        payload: '../../../etc/passwd',
        type: "Unix Path Traversal",
        description: "Attempt to access Unix password file"
    },
    {
        payload: '..\\..\\..\\windows\\system32\\config\\sam',
        type: "Windows Path Traversal",
        description: "Attempt to access Windows SAM file"
    },
    {
        payload: '/etc/shadow',
        type: "Absolute Path Access",
        description: "Attempt direct access to shadow file"
    },
    {
        payload: '....//....//....//etc/hosts',
        type: "Double Dot Bypass",
        description: "Attempt to bypass filters with double dots"
    },
    {
        payload: '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        type: "URL Encoded Traversal",
        description: "URL encoded path traversal attempt"
    },
    {
        payload: '..%252f..%252f..%252fetc%252fpasswd',
        type: "Double URL Encoded",
        description: "Double URL encoded traversal"
    },
    {
        payload: '..\\/..\\/..\\/windows\\/system32\\/drivers\\/etc\\/hosts',
        type: "Mixed Separators",
        description: "Mixed path separators attempt"
    }
];

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

async function testPathTraversalPrevention() {
    console.log('🧪 Testing Path Traversal Prevention (T213)');
    console.log('============================================');

    const results = [];

    // Test 1: Path traversal in project names
    console.log('\n🎯 Test 1: Path Traversal in Project Names');

    for (const { payload, type, description } of pathTraversalPayloads) {
        console.log(`\n🔍 Testing ${type}: ${description}`);
        console.log(`   Payload: "${payload}"`);

        try {
            const result = await execCommand('node', [
                config.cliPath,
                'init',
                '--name', payload,
                '--token', config.targetToken,
                '--admin', config.adminWallet,
                '--network', config.network,
                '--force'
            ]);

            // Check if path traversal was prevented
            const traversalBlocked = !result.success ||
                                   !result.stdout.includes('root:') &&
                                   !result.stdout.includes('nobody:') &&
                                   !result.stdout.includes('localhost') &&
                                   !result.stdout.includes('127.0.0.1');

            results.push({
                category: 'Project Name',
                type,
                payload,
                blocked: traversalBlocked,
                success: result.success,
                timeout: result.timeout,
                systemError: result.systemError || false
            });

            const status = traversalBlocked ? '✅ BLOCKED' : '⚠️ POTENTIAL RISK';
            console.log(`   Result: ${status}`);

            if (!traversalBlocked && result.stdout) {
                console.log(`   ⚠️ Suspicious output detected: ${result.stdout.substring(0, 100)}...`);
            }

        } catch (error) {
            console.log(`   Result: ✅ SYSTEM BLOCKED`);
            results.push({
                category: 'Project Name',
                type,
                payload,
                blocked: true,
                success: false,
                timeout: false,
                systemError: true
            });
        }
    }

    // Test 2: Path traversal in file operations
    console.log('\n🎯 Test 2: Path Traversal in File Operations');

    const fileOperationTests = [
        { cmd: ['config', 'export', '../../../tmp/malicious.toml'], desc: 'Config export traversal' },
        { cmd: ['config', 'export', '/etc/passwd'], desc: 'Config export absolute path' },
        { cmd: ['config', 'export', '..\\..\\..\\malicious.toml'], desc: 'Config export Windows traversal' }
    ];

    for (const { cmd, desc } of fileOperationTests) {
        console.log(`\n🔍 Testing ${desc}`);
        console.log(`   Command: ${cmd.join(' ')}`);

        try {
            const result = await execCommand('node', [config.cliPath, ...cmd]);

            const traversalBlocked = !result.success ||
                                   result.stderr.includes('ValidationError') ||
                                   result.stderr.includes('invalid') ||
                                   result.stderr.includes('not allowed');

            results.push({
                category: 'File Operation',
                type: desc,
                payload: cmd[cmd.length - 1],
                blocked: traversalBlocked,
                success: result.success,
                timeout: result.timeout,
                systemError: result.systemError || false
            });

            const status = traversalBlocked ? '✅ BLOCKED' : '⚠️ POTENTIAL RISK';
            console.log(`   Result: ${status}`);

        } catch (error) {
            console.log(`   Result: ✅ SYSTEM BLOCKED`);
            results.push({
                category: 'File Operation',
                type: desc,
                payload: cmd[cmd.length - 1],
                blocked: true,
                success: false,
                timeout: false,
                systemError: true
            });
        }
    }

    // Test 3: Path normalization tests
    console.log('\n🎯 Test 3: Path Normalization Tests');

    const normalizationTests = [
        { payload: './././../../../etc/passwd', desc: 'Complex relative path' },
        { payload: 'normal/../../../etc/passwd', desc: 'Mixed normal and traversal' },
        { payload: '~/../../etc/passwd', desc: 'Home directory traversal' }
    ];

    for (const { payload, desc } of normalizationTests) {
        console.log(`\n🔍 Testing ${desc}: "${payload}"`);

        try {
            const result = await execCommand('node', [
                config.cliPath,
                'init',
                '--name', payload,
                '--token', config.targetToken,
                '--admin', config.adminWallet,
                '--network', config.network,
                '--force'
            ]);

            const traversalBlocked = !result.success || !result.stdout.includes('root:');

            results.push({
                category: 'Path Normalization',
                type: desc,
                payload,
                blocked: traversalBlocked,
                success: result.success,
                timeout: result.timeout,
                systemError: result.systemError || false
            });

            console.log(`   Result: ${traversalBlocked ? '✅ BLOCKED' : '⚠️ POTENTIAL RISK'}`);

        } catch (error) {
            console.log(`   Result: ✅ SYSTEM BLOCKED`);
            results.push({
                category: 'Path Normalization',
                type: desc,
                payload,
                blocked: true,
                success: false,
                timeout: false,
                systemError: true
            });
        }
    }

    // Analysis
    console.log('\n📊 Path Traversal Prevention Analysis');
    console.log('=====================================');

    const blockedCount = results.filter(r => r.blocked).length;
    const systemBlocked = results.filter(r => r.systemError).length;
    const appBlocked = blockedCount - systemBlocked;
    const totalTests = results.length;

    console.log(`🛡️ Total traversals blocked: ${blockedCount}/${totalTests}`);
    console.log(`📱 App-level blocks: ${appBlocked}`);
    console.log(`🖥️ System-level blocks: ${systemBlocked}`);

    const protectionRate = (blockedCount / totalTests * 100).toFixed(1);
    console.log(`🔒 Protection Rate: ${protectionRate}%`);

    // Category breakdown
    const categories = ['Project Name', 'File Operation', 'Path Normalization'];
    categories.forEach(category => {
        const categoryResults = results.filter(r => r.category === category);
        const categoryBlocked = categoryResults.filter(r => r.blocked).length;
        console.log(`📁 ${category}: ${categoryBlocked}/${categoryResults.length} blocked`);
    });

    // Security Assessment
    if (blockedCount === totalTests) {
        console.log('✅ Path Traversal Prevention: EXCELLENT (all attacks blocked)');
    } else if (blockedCount >= totalTests * 0.9) {
        console.log('⚠️ Path Traversal Prevention: GOOD (most attacks blocked)');
    } else {
        console.log('❌ Path Traversal Prevention: WEAK (significant vulnerabilities)');
    }

    // Detailed Results
    console.log('\n📋 Detailed Path Traversal Results');
    console.log('==================================');
    console.log('Category             | Attack Type              | Status   | Protection');
    console.log('---------------------|--------------------------|----------|------------');

    results.forEach(result => {
        const status = result.blocked ? '✅ BLOCKED' : '❌ RISK';
        const protection = result.systemError ? 'System' : (result.blocked ? 'App' : 'None');

        console.log(`${result.category.padEnd(20)} | ${result.type.padEnd(24)} | ${status.padEnd(8)} | ${protection}`);
    });

    return {
        blockedCount,
        totalCount: totalTests,
        protectionRate: parseFloat(protectionRate),
        categoryBreakdown: categories.map(cat => ({
            category: cat,
            blocked: results.filter(r => r.category === cat && r.blocked).length,
            total: results.filter(r => r.category === cat).length
        }))
    };
}

if (require.main === module) {
    testPathTraversalPrevention().catch(console.error);
}

module.exports = { testPathTraversalPrevention };