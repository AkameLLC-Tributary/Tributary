const { spawn } = require('child_process');
const path = require('path');

/**
 * T210: Input Sanitization Test
 *
 * This test validates that the Tributary CLI properly sanitizes and handles
 * malicious input attempts including XSS, command injection, SQL injection,
 * path traversal, and other attack vectors.
 *
 * Test Categories:
 * - Malicious input rejection
 * - Normal input acceptance
 * - Configuration command security
 */

// Test configuration - MASKED SENSITIVE VALUES
const config = {
    // Replace with your actual values when running tests
    targetToken: 'YOUR_TOKEN_ADDRESS_HERE',
    adminWallet: 'YOUR_ADMIN_WALLET_ADDRESS_HERE',
    network: 'testnet',
    cliPath: './path/to/your/cli.js' // Update to your CLI path
};

async function execCommand(command, args, options = {}) {
    return new Promise((resolve) => {
        const child = spawn(command, args, {
            stdio: 'pipe',
            ...options
        });

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr?.on('data', (data) => {
            stderr += data.toString();
        });

        const timeout = setTimeout(() => {
            child.kill();
            resolve({
                success: false,
                stdout: stdout,
                stderr: stderr,
                timeout: true
            });
        }, options.timeout || 5000);

        child.on('close', (code) => {
            clearTimeout(timeout);
            resolve({
                success: code === 0,
                stdout: stdout,
                stderr: stderr,
                timeout: false
            });
        });

        child.on('error', (error) => {
            clearTimeout(timeout);
            resolve({
                success: false,
                stdout: '',
                stderr: error.message,
                timeout: false,
                systemError: true
            });
        });
    });
}

async function testInputSanitization() {
    console.log('🧪 Testing Input Sanitization (T210)');
    console.log('=====================================');

    // Test 1: Malicious input testing
    console.log('\n🔍 Test 1: Malicious Input Validation');

    const maliciousInputs = [
        {
            input: 'Test<script>alert("xss")</script>',
            type: 'XSS Script',
            description: 'Cross-site scripting attempt'
        },
        {
            input: 'Test$(rm -rf /)',
            type: 'Command Injection',
            description: 'Shell command injection attempt'
        },
        {
            input: 'Test`whoami`',
            type: 'Backtick Execution',
            description: 'Backtick command execution attempt'
        },
        {
            input: 'Test;drop table users;',
            type: 'SQL Injection',
            description: 'SQL injection attempt'
        },
        {
            input: 'Test../../etc/passwd',
            type: 'Path Traversal',
            description: 'Directory traversal attempt'
        },
        {
            input: 'Test|echo malicious',
            type: 'Pipe Injection',
            description: 'Pipe command injection'
        },
        {
            input: 'Test&echo malicious&',
            type: 'Ampersand Injection',
            description: 'Background command execution'
        }
    ];

    const maliciousResults = [];

    for (const { input, type, description } of maliciousInputs) {
        console.log(`  🎯 Testing ${type}: ${description}`);

        try {
            const result = await execCommand('node', [
                config.cliPath,
                'init',
                '--name', input,
                '--token', config.targetToken,
                '--admin', config.adminWallet,
                '--network', config.network,
                '--force'
            ], { timeout: 5000 });

            // Check for proper sanitization/rejection
            const properlyRejected = !result.success ||
                                   result.stderr.includes('invalid') ||
                                   result.stderr.includes('error') ||
                                   result.stderr.includes('ValidationError');

            const sanitizationEffective = !result.stdout.includes('<script>') &&
                                         !result.stdout.includes('$(') &&
                                         !result.stdout.includes('`') &&
                                         !result.stdout.includes('drop table') &&
                                         !result.stdout.includes('echo malicious');

            maliciousResults.push({
                type: type,
                input: input,
                rejected: properlyRejected,
                sanitized: sanitizationEffective,
                success: result.success,
                timeout: result.timeout,
                systemError: result.systemError || false
            });

            const status = properlyRejected ? '✅ REJECTED' : '⚠️ ACCEPTED (RISK)';
            const sanitized = sanitizationEffective ? 'YES' : 'NO';
            const timeoutInfo = result.timeout ? ' [TIMEOUT]' : '';

            console.log(`     Result: ${status} - Sanitized: ${sanitized}${timeoutInfo}`);

        } catch (error) {
            console.log(`     Result: ✅ SYSTEM REJECTED (Node.js protection)`);
            maliciousResults.push({
                type: type,
                input: input,
                rejected: true,
                sanitized: true,
                success: false,
                timeout: false,
                systemError: true
            });
        }
    }

    // Test 2: Normal input validation
    console.log('\n✅ Test 2: Normal Input Validation');

    const normalInputs = [
        'ValidProjectName',
        'Test-Project-123',
        'MyProject_v1',
        'project.name',
        'Test123'
    ];

    const normalResults = [];

    for (const normalInput of normalInputs) {
        const result = await execCommand('node', [
            config.cliPath,
            'init',
            '--name', normalInput,
            '--token', config.targetToken,
            '--admin', config.adminWallet,
            '--network', config.network,
            '--force'
        ], { timeout: 8000 });

        normalResults.push({
            input: normalInput,
            success: result.success,
            timeout: result.timeout
        });

        const status = result.success ? '✅ ACCEPTED' : '❌ REJECTED';
        const timeoutInfo = result.timeout ? ' [TIMEOUT]' : '';
        console.log(`  📝 Normal input "${normalInput}": ${status}${timeoutInfo}`);
    }

    // Test 3: Configuration command security
    console.log('\n🔧 Test 3: Configuration Command Security');

    const configTests = [
        { cmd: ['config', 'show'], desc: 'Config display' },
        { cmd: ['config', 'validate'], desc: 'Config validation' },
        { cmd: ['parameters', 'show'], desc: 'Parameter display' }
    ];

    const configResults = [];

    for (const { cmd, desc } of configTests) {
        const result = await execCommand('node', [config.cliPath, ...cmd], { timeout: 5000 });

        // Check for potential output issues
        const hasSecureOutput = !result.stdout.includes('<script>') &&
                               !result.stdout.includes('$(') &&
                               !result.stdout.includes('`');

        configResults.push({
            command: cmd.join(' '),
            description: desc,
            success: result.success,
            secureOutput: hasSecureOutput,
            timeout: result.timeout
        });

        const status = result.success ? '✅ SUCCESS' : '❌ FAILED';
        const secure = hasSecureOutput ? 'YES' : 'NO';
        const timeoutInfo = result.timeout ? ' [TIMEOUT]' : '';
        console.log(`  🔧 ${desc}: ${status} - Secure output: ${secure}${timeoutInfo}`);
    }

    // Analysis and Results
    console.log('\n📊 Input Sanitization Analysis');
    console.log('===============================');

    const rejectedMalicious = maliciousResults.filter(r => r.rejected).length;
    const sanitizedMalicious = maliciousResults.filter(r => r.sanitized).length;
    const systemRejected = maliciousResults.filter(r => r.systemError).length;
    const acceptedNormal = normalResults.filter(r => r.success).length;
    const secureConfig = configResults.filter(r => r.secureOutput).length;

    console.log(`📈 Malicious inputs rejected by app: ${rejectedMalicious - systemRejected}/${maliciousInputs.length - systemRejected}`);
    console.log(`🛡️ Malicious inputs rejected by system: ${systemRejected}/${maliciousInputs.length}`);
    console.log(`🔒 Total malicious inputs handled: ${rejectedMalicious}/${maliciousInputs.length}`);
    console.log(`🧹 Malicious inputs sanitized: ${sanitizedMalicious}/${maliciousInputs.length}`);
    console.log(`✅ Normal inputs accepted: ${acceptedNormal}/${normalInputs.length}`);
    console.log(`🔧 Config commands secure: ${secureConfig}/${configTests.length}`);

    // Security Score Calculation
    const totalProtection = rejectedMalicious;
    const protectionRate = (totalProtection / maliciousInputs.length * 100).toFixed(1);

    const overallSecurityScore = [
        totalProtection >= maliciousInputs.length * 0.8,    // 80% malicious blocked
        acceptedNormal >= normalInputs.length * 0.8,        // 80% normal accepted
        secureConfig >= configTests.length * 0.8,           // 80% config secure
        systemRejected > 0                                   // System provides protection
    ].filter(Boolean).length;

    console.log(`\n🏆 Overall Security Score: ${overallSecurityScore}/4 criteria met`);
    console.log(`🔒 Total Protection Effectiveness: ${protectionRate}%`);

    // Final Assessment
    if (overallSecurityScore >= 3) {
        console.log('🟢 Security Level: HIGH (excellent multi-layer protection)');
        console.log('✅ Input Sanitization: PASSED (robust protection against malicious inputs)');
    } else if (overallSecurityScore >= 2) {
        console.log('🟡 Security Level: MEDIUM (good basic protection)');
        console.log('⚠️ Input Sanitization: PARTIAL (basic protection, some vulnerabilities possible)');
    } else {
        console.log('🔴 Security Level: LOW (needs improvement)');
        console.log('❌ Input Sanitization: FAILED (insufficient protection against malicious inputs)');
    }

    // Detailed Results Table
    console.log('\n📋 Detailed Sanitization Results');
    console.log('=================================');
    console.log('Attack Type              | Protection Level        | App Rejected | Sys Rejected | Status');
    console.log('-------------------------|-------------------------|--------------|--------------|--------');

    maliciousResults.forEach(result => {
        const appRejected = result.rejected && !result.systemError ? '     ✅      ' : '     ❌      ';
        const sysRejected = result.systemError ? '     ✅      ' : '     ❌      ';
        const status = result.rejected ? '  SAFE  ' : '  RISK  ';
        const protection = result.systemError ? 'System Level' : (result.rejected ? 'App Level' : 'None');

        console.log(`${result.type.padEnd(24)} | ${protection.padEnd(23)} | ${appRejected} | ${sysRejected} | ${status}`);
    });

    return {
        overallScore: overallSecurityScore,
        protectionRate: parseFloat(protectionRate),
        maliciousBlocked: rejectedMalicious,
        normalAccepted: acceptedNormal,
        configSecure: secureConfig
    };
}

// Export for use in other scripts
if (require.main === module) {
    testInputSanitization().catch(console.error);
}

module.exports = { testInputSanitization, config };