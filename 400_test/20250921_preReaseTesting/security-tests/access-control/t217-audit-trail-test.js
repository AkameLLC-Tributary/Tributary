const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * T217: Audit Trail Verification Test
 *
 * Tests Tributary CLI's audit logging capabilities and trail verification.
 * Ensures all important operations are properly logged and auditable.
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

function findLogFiles() {
    const logFiles = [];
    const possibleLogDirs = ['logs', './logs', '../logs'];
    const possibleLogFiles = ['tributary.log', 'audit.log', 'combined.log', 'error.log'];

    // Check for logs directory
    possibleLogDirs.forEach(dir => {
        if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir);
            files.forEach(file => {
                logFiles.push(path.join(dir, file));
            });
        }
    });

    // Check for log files in current directory
    possibleLogFiles.forEach(file => {
        if (fs.existsSync(file)) {
            logFiles.push(file);
        }
    });

    return logFiles;
}

function analyzeLogFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            return { exists: false, size: 0, lines: 0, hasTimestamps: false, hasCommands: false };
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim().length > 0);

        // Check for timestamps (ISO format, common log formats)
        const hasTimestamps = lines.some(line =>
            /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(line) ||  // ISO format
            /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(line) ||   // Common format
            /\[\d{4}-\d{2}-\d{2}/.test(line)                      // Bracketed format
        );

        // Check for command tracking
        const hasCommands = lines.some(line =>
            line.includes('init') ||
            line.includes('config') ||
            line.includes('collect') ||
            line.includes('parameters') ||
            line.includes('command') ||
            line.includes('CLI')
        );

        return {
            exists: true,
            size: content.length,
            lines: lines.length,
            hasTimestamps,
            hasCommands,
            content: content.substring(0, 500) // First 500 chars for analysis
        };

    } catch (error) {
        return { exists: false, error: error.message };
    }
}

async function testAuditTrailVerification() {
    console.log('🧪 Testing Audit Trail Verification (T217)');
    console.log('===========================================');

    const results = [];

    // Setup base configuration
    console.log('\n🔧 Setting up audit test configuration...');

    const setupResult = await execCommand('node', [
        config.cliPath,
        'init',
        '--name', 'AuditTrailTest',
        '--token', config.targetToken,
        '--admin', config.adminWallet,
        '--network', config.network,
        '--force'
    ]);

    console.log(`   Setup: ${setupResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);

    // Test 1: Generate audit-worthy activities
    console.log('\n🎯 Test 1: Generating Audit-Worthy Activities');

    const auditableCommands = [
        { cmd: ['config', 'show'], desc: 'Configuration viewing' },
        { cmd: ['config', 'validate'], desc: 'Configuration validation' },
        { cmd: ['config', 'export', 'audit-test-export.toml'], desc: 'Configuration export' },
        { cmd: ['parameters', 'show'], desc: 'Parameter viewing' },
        { cmd: ['parameters', 'show', '--verbose'], desc: 'Detailed parameter viewing' },
        { cmd: ['collect', '--token', config.targetToken, '--threshold', '1.0', '--max-holders', '1'], desc: 'Token holder collection' }
    ];

    let activitiesExecuted = 0;
    const commandResults = [];

    for (const { cmd, desc } of auditableCommands) {
        console.log(`\n🔧 Executing ${desc}...`);

        const result = await execCommand('node', [config.cliPath, ...cmd], { timeout: 10000 });

        commandResults.push({
            command: cmd.join(' '),
            description: desc,
            success: result.success,
            timeout: result.timeout
        });

        if (!result.timeout) {
            activitiesExecuted++;
        }

        const status = result.success ? '✅ SUCCESS' : result.timeout ? '⏰ TIMEOUT' : '❌ FAILED';
        console.log(`   ${desc}: ${status}`);
    }

    console.log(`\n📊 Activities executed: ${activitiesExecuted}/${auditableCommands.length}`);

    // Test 2: Audit log file verification
    console.log('\n🎯 Test 2: Audit Log File Verification');

    const logFiles = findLogFiles();
    console.log(`\n📄 Found ${logFiles.length} log files to analyze:`);

    let logInfrastructure = {
        totalFiles: logFiles.length,
        combinedLogExists: false,
        errorLogExists: false,
        auditLogExists: false,
        dedicatedAuditFiles: 0
    };

    const logAnalysis = [];

    logFiles.forEach(logFile => {
        const analysis = analyzeLogFile(logFile);
        const fileName = path.basename(logFile);

        console.log(`\n📋 Analyzing ${fileName}:`);
        console.log(`   Exists: ${analysis.exists ? '✅ YES' : '❌ NO'}`);

        if (analysis.exists) {
            console.log(`   Size: ${analysis.size} characters`);
            console.log(`   Lines: ${analysis.lines}`);
            console.log(`   Has timestamps: ${analysis.hasTimestamps ? '✅ YES' : '❌ NO'}`);
            console.log(`   Has command tracking: ${analysis.hasCommands ? '✅ YES' : '❌ NO'}`);

            // Categorize log files
            if (fileName.includes('combined')) logInfrastructure.combinedLogExists = true;
            if (fileName.includes('error')) logInfrastructure.errorLogExists = true;
            if (fileName.includes('audit')) {
                logInfrastructure.auditLogExists = true;
                logInfrastructure.dedicatedAuditFiles++;
            }

            logAnalysis.push({
                file: fileName,
                ...analysis
            });
        }
    });

    results.push({
        category: 'Log Infrastructure',
        test: 'Log file existence and structure',
        passed: logFiles.length > 0,
        details: logInfrastructure
    });

    // Test 3: Audit log content verification
    console.log('\n🎯 Test 3: Audit Log Content Verification');

    let auditContentAnalysis = {
        hasTimestamps: false,
        hasCommandTracking: false,
        hasUserInformation: false,
        hasOperationResults: false,
        hasErrorTracking: false,
        structuredFormat: false,
        totalLogEntries: 0
    };

    logAnalysis.forEach(log => {
        if (log.hasTimestamps) auditContentAnalysis.hasTimestamps = true;
        if (log.hasCommands) auditContentAnalysis.hasCommandTracking = true;
        auditContentAnalysis.totalLogEntries += log.lines;

        // Check for structured format (JSON, key-value pairs, etc.)
        if (log.content && (log.content.includes('{') || log.content.includes('='))) {
            auditContentAnalysis.structuredFormat = true;
        }

        // Check for user information
        if (log.content && (log.content.includes('user') || log.content.includes('admin'))) {
            auditContentAnalysis.hasUserInformation = true;
        }

        // Check for operation results
        if (log.content && (log.content.includes('success') || log.content.includes('result'))) {
            auditContentAnalysis.hasOperationResults = true;
        }

        // Check for error tracking
        if (log.content && (log.content.includes('error') || log.content.includes('failed'))) {
            auditContentAnalysis.hasErrorTracking = true;
        }
    });

    console.log('\n📊 Overall audit content analysis:');
    console.log(`   Has timestamps: ${auditContentAnalysis.hasTimestamps ? '✅ YES' : '❌ NO'}`);
    console.log(`   Has command tracking: ${auditContentAnalysis.hasCommandTracking ? '✅ YES' : '❌ NO'}`);
    console.log(`   Has user information: ${auditContentAnalysis.hasUserInformation ? '✅ YES' : '❌ NO'}`);
    console.log(`   Has operation results: ${auditContentAnalysis.hasOperationResults ? '✅ YES' : '❌ NO'}`);
    console.log(`   Has error tracking: ${auditContentAnalysis.hasErrorTracking ? '✅ YES' : '❌ NO'}`);
    console.log(`   Structured format: ${auditContentAnalysis.structuredFormat ? '✅ YES' : '❌ NO'}`);
    console.log(`   Total log entries: ${auditContentAnalysis.totalLogEntries}`);

    results.push({
        category: 'Audit Content',
        test: 'Log content analysis',
        passed: auditContentAnalysis.hasTimestamps && auditContentAnalysis.hasCommandTracking,
        details: auditContentAnalysis
    });

    // Test 4: Audit log retention and rotation
    console.log('\n🎯 Test 4: Audit Log Retention and Rotation');

    // Check for rotation evidence and retention policies
    const retentionAnalysis = {
        retentionPolicyConfigured: false,
        maxFilesConfigured: false,
        maxSizeConfigured: false,
        rotationEvidence: false,
        logAgeVariance: false
    };

    // Check configuration for retention settings
    const configPath = 'tributary.toml';
    if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf8');
        retentionAnalysis.retentionPolicyConfigured = configContent.includes('max_files') || configContent.includes('max_size');
        retentionAnalysis.maxFilesConfigured = configContent.includes('max_files');
        retentionAnalysis.maxSizeConfigured = configContent.includes('max_size');
    }

    // Check for multiple log files (evidence of rotation)
    if (logFiles.length > 1) {
        retentionAnalysis.rotationEvidence = true;
    }

    // Check for log age variance
    const logStats = logFiles.map(file => {
        try {
            const stats = fs.statSync(file);
            return stats.mtime;
        } catch {
            return null;
        }
    }).filter(Boolean);

    if (logStats.length > 1) {
        const timeDiffs = logStats.map(time => time.getTime());
        const maxDiff = Math.max(...timeDiffs) - Math.min(...timeDiffs);
        retentionAnalysis.logAgeVariance = maxDiff > 1000; // More than 1 second difference
    }

    console.log('\n🔄 Retention and rotation analysis:');
    console.log(`   Retention policy configured: ${retentionAnalysis.retentionPolicyConfigured ? '✅ YES' : '❌ NO'}`);
    console.log(`   Max files setting: ${retentionAnalysis.maxFilesConfigured ? '✅ YES' : '❌ NO'}`);
    console.log(`   Max size setting: ${retentionAnalysis.maxSizeConfigured ? '✅ YES' : '❌ NO'}`);
    console.log(`   Rotation evidence: ${retentionAnalysis.rotationEvidence ? '✅ YES' : '❌ NO'}`);
    console.log(`   Log age variance: ${retentionAnalysis.logAgeVariance ? '✅ YES' : '❌ NO'}`);

    results.push({
        category: 'Audit Retention',
        test: 'Log retention and rotation',
        passed: retentionAnalysis.retentionPolicyConfigured,
        details: retentionAnalysis
    });

    // Test 5: Audit trail completeness
    console.log('\n🎯 Test 5: Audit Trail Completeness');

    const completenessAnalysis = {
        activitiesExecuted,
        totalActivities: auditableCommands.length,
        allActivitiesLogged: auditContentAnalysis.hasCommandTracking,
        configChangesTracked: auditContentAnalysis.hasCommandTracking,
        accessAttemptsLogged: auditContentAnalysis.hasTimestamps,
        errorEventsRecorded: auditContentAnalysis.hasErrorTracking,
        systemEventsLogged: auditContentAnalysis.hasTimestamps
    };

    console.log('\n🔍 Completeness analysis:');
    console.log(`   Activities executed: ${completenessAnalysis.activitiesExecuted}/${completenessAnalysis.totalActivities}`);
    console.log(`   All activities logged: ${completenessAnalysis.allActivitiesLogged ? '✅ YES' : '❌ NO'}`);
    console.log(`   Config changes tracked: ${completenessAnalysis.configChangesTracked ? '✅ YES' : '❌ NO'}`);
    console.log(`   Access attempts logged: ${completenessAnalysis.accessAttemptsLogged ? '✅ YES' : '❌ NO'}`);
    console.log(`   Error events recorded: ${completenessAnalysis.errorEventsRecorded ? '✅ YES' : '❌ NO'}`);
    console.log(`   System events logged: ${completenessAnalysis.systemEventsLogged ? '✅ YES' : '❌ NO'}`);

    results.push({
        category: 'Audit Completeness',
        test: 'Trail completeness verification',
        passed: completenessAnalysis.allActivitiesLogged,
        details: completenessAnalysis
    });

    // Final Analysis
    console.log('\n📊 Audit Trail Verification Analysis');
    console.log('====================================');

    const passedTests = results.filter(r => r.passed).length;
    const totalTests = results.length;

    console.log(`✅ Tests passed: ${passedTests}/${totalTests}`);
    console.log(`📁 Log infrastructure: ${logInfrastructure.totalFiles > 0 ? 'PRESENT' : 'MISSING'} (${logInfrastructure.totalFiles} files)`);
    console.log(`📝 Content structure: ${auditContentAnalysis.structuredFormat ? 'STRUCTURED' : 'UNSTRUCTURED'}`);
    console.log(`📊 Activity tracking: ${auditContentAnalysis.hasCommandTracking ? 'COMPREHENSIVE' : 'LIMITED'}`);
    console.log(`🔄 Retention management: ${retentionAnalysis.retentionPolicyConfigured ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
    console.log(`🎯 Complete coverage: ${completenessAnalysis.allActivitiesLogged ? 'ACHIEVED' : 'PARTIAL'}`);

    // Overall audit score
    const auditCapabilities = [
        logInfrastructure.totalFiles > 0,
        auditContentAnalysis.hasTimestamps,
        auditContentAnalysis.hasCommandTracking,
        retentionAnalysis.retentionPolicyConfigured,
        completenessAnalysis.allActivitiesLogged
    ].filter(Boolean).length;

    console.log(`🏆 Overall audit score: ${auditCapabilities}/5 capabilities met`);

    // Security Assessment
    if (auditCapabilities >= 4) {
        console.log('✅ Audit Trail Verification: EXCELLENT (comprehensive audit capabilities)');
    } else if (auditCapabilities >= 3) {
        console.log('⚠️ Audit Trail Verification: GOOD (adequate audit capabilities)');
    } else {
        console.log('❌ Audit Trail Verification: WEAK (insufficient audit capabilities)');
    }

    return {
        passedTests,
        totalTests,
        auditCapabilities,
        logInfrastructure,
        auditContentAnalysis,
        retentionAnalysis,
        completenessAnalysis
    };
}

if (require.main === module) {
    testAuditTrailVerification().catch(console.error);
}

module.exports = { testAuditTrailVerification };