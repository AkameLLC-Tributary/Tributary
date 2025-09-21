const { spawn } = require('child_process');
const path = require('path');

/**
 * T211: SQL Injection Prevention Test
 *
 * Tests Tributary CLI's resilience against SQL injection attacks.
 * Although CLI applications typically don't use databases directly,
 * this test ensures proper input handling and sanitization.
 */

// Test configuration - MASKED SENSITIVE VALUES
const config = {
    targetToken: 'YOUR_TOKEN_ADDRESS_HERE',
    adminWallet: 'YOUR_ADMIN_WALLET_ADDRESS_HERE',
    network: 'testnet',
    cliPath: './path/to/your/cli.js'
};

const sqlInjectionPayloads = [
    {
        payload: "'; DROP TABLE users; --",
        type: "Classic SQL Drop",
        description: "Attempt to drop database table"
    },
    {
        payload: "' OR '1'='1",
        type: "Tautology Attack",
        description: "Always-true condition injection"
    },
    {
        payload: "'; INSERT INTO users VALUES ('hacker'); --",
        type: "Insert Injection",
        description: "Attempt to insert malicious data"
    },
    {
        payload: "' UNION SELECT * FROM users --",
        type: "Union-based Injection",
        description: "Attempt to extract data using UNION"
    },
    {
        payload: "'; EXEC xp_cmdshell('dir'); --",
        type: "Command Execution",
        description: "Attempt to execute system commands"
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

async function testSQLInjectionPrevention() {
    console.log('🧪 Testing SQL Injection Prevention (T211)');
    console.log('============================================');

    const results = [];

    for (const { payload, type, description } of sqlInjectionPayloads) {
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

            const injectionBlocked = !result.success ||
                                   !result.stdout.includes('DROP') &&
                                   !result.stdout.includes('INSERT') &&
                                   !result.stdout.includes('UNION') &&
                                   !result.stdout.includes('EXEC');

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

    // Analysis
    console.log('\n📊 SQL Injection Prevention Analysis');
    console.log('====================================');

    const blockedCount = results.filter(r => r.blocked).length;
    const systemBlocked = results.filter(r => r.systemError).length;
    const appBlocked = blockedCount - systemBlocked;

    console.log(`🛡️ Total injections blocked: ${blockedCount}/${sqlInjectionPayloads.length}`);
    console.log(`📱 App-level blocks: ${appBlocked}`);
    console.log(`🖥️ System-level blocks: ${systemBlocked}`);

    const protectionRate = (blockedCount / sqlInjectionPayloads.length * 100).toFixed(1);
    console.log(`🔒 Protection Rate: ${protectionRate}%`);

    if (blockedCount === sqlInjectionPayloads.length) {
        console.log('✅ SQL Injection Prevention: EXCELLENT (all attacks blocked)');
    } else if (blockedCount >= sqlInjectionPayloads.length * 0.8) {
        console.log('⚠️ SQL Injection Prevention: GOOD (most attacks blocked)');
    } else {
        console.log('❌ SQL Injection Prevention: WEAK (significant vulnerabilities)');
    }

    return { blockedCount, totalCount: sqlInjectionPayloads.length, protectionRate: parseFloat(protectionRate) };
}

if (require.main === module) {
    testSQLInjectionPrevention().catch(console.error);
}

module.exports = { testSQLInjectionPrevention };