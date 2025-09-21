const path = require('path');

/**
 * Comprehensive Security Test Runner for Tributary CLI
 *
 * This script runs all security tests (T210-T220) in sequence and
 * generates a comprehensive security report.
 *
 * IMPORTANT: Before running these tests, please update the configuration
 * in each test file with your actual values:
 * - targetToken: Your actual token address
 * - adminWallet: Your actual admin wallet address
 * - cliPath: Path to your Tributary CLI executable
 */

// Import all test modules
const { testInputSanitization } = require('./input-validation/t210-input-sanitization-test');
const { testSQLInjectionPrevention } = require('./injection-prevention/t211-sql-injection-test');
const { testCommandInjectionPrevention } = require('./injection-prevention/t212-command-injection-test');
const { testPathTraversalPrevention } = require('./injection-prevention/t213-path-traversal-test');
const { testEnvironmentVariableValidation } = require('./input-validation/t214-environment-validation-test');
const { testConfigurationTamperingDetection } = require('./access-control/t215-config-tampering-test');
const { testSensitiveDataExposurePrevention } = require('./access-control/t216-data-exposure-test');
const { testAuditTrailVerification } = require('./access-control/t217-audit-trail-test');
const { testAccessControlValidation } = require('./access-control/t218-access-control-test');
const { testCryptographicValidation } = require('./access-control/t219-cryptographic-validation-test');
const { testVulnerabilityScanning } = require('./vulnerability-scanning/t220-vulnerability-scanning-test');

// Test configuration
const testSuite = [
    { id: 'T210', name: 'Input Sanitization', fn: testInputSanitization, category: 'Input Validation' },
    { id: 'T211', name: 'SQL Injection Prevention', fn: testSQLInjectionPrevention, category: 'Injection Prevention' },
    { id: 'T212', name: 'Command Injection Prevention', fn: testCommandInjectionPrevention, category: 'Injection Prevention' },
    { id: 'T213', name: 'Path Traversal Prevention', fn: testPathTraversalPrevention, category: 'Injection Prevention' },
    { id: 'T214', name: 'Environment Variable Validation', fn: testEnvironmentVariableValidation, category: 'Input Validation' },
    { id: 'T215', name: 'Configuration Tampering Detection', fn: testConfigurationTamperingDetection, category: 'Access Control' },
    { id: 'T216', name: 'Sensitive Data Exposure Prevention', fn: testSensitiveDataExposurePrevention, category: 'Access Control' },
    { id: 'T217', name: 'Audit Trail Verification', fn: testAuditTrailVerification, category: 'Access Control' },
    { id: 'T218', name: 'Access Control Validation', fn: testAccessControlValidation, category: 'Access Control' },
    { id: 'T219', name: 'Cryptographic Validation', fn: testCryptographicValidation, category: 'Access Control' },
    { id: 'T220', name: 'Vulnerability Scanning', fn: testVulnerabilityScanning, category: 'Vulnerability Scanning' }
];

class SecurityTestRunner {
    constructor() {
        this.results = [];
        this.startTime = new Date();
        this.categories = {};
    }

    async runAllTests() {
        console.log('🔒 Tributary CLI Security Test Suite');
        console.log('====================================');
        console.log(`📅 Started: ${this.startTime.toISOString()}`);
        console.log(`🧪 Total Tests: ${testSuite.length}`);
        console.log('');

        // Check configuration before starting
        if (!this.checkConfiguration()) {
            console.log('❌ Configuration check failed. Please update test configurations before running.');
            return;
        }

        // Run each test
        for (let i = 0; i < testSuite.length; i++) {
            const test = testSuite[i];

            console.log(`\n${'='.repeat(80)}`);
            console.log(`🧪 Running ${test.id}: ${test.name}`);
            console.log(`📂 Category: ${test.category}`);
            console.log(`⏱️  Progress: ${i + 1}/${testSuite.length}`);
            console.log(`${'='.repeat(80)}`);

            try {
                const startTestTime = Date.now();
                const result = await test.fn();
                const endTestTime = Date.now();
                const duration = endTestTime - startTestTime;

                this.results.push({
                    id: test.id,
                    name: test.name,
                    category: test.category,
                    result,
                    success: true,
                    duration,
                    error: null
                });

                console.log(`\n✅ ${test.id} completed successfully in ${duration}ms`);

            } catch (error) {
                console.log(`\n❌ ${test.id} failed: ${error.message}`);

                this.results.push({
                    id: test.id,
                    name: test.name,
                    category: test.category,
                    result: null,
                    success: false,
                    duration: 0,
                    error: error.message
                });
            }
        }

        // Generate comprehensive report
        await this.generateSecurityReport();
    }

    checkConfiguration() {
        console.log('🔧 Checking test configuration...');

        // This is a simplified check - in practice, you'd verify actual configuration
        const configItems = [
            'Target Token Address',
            'Admin Wallet Address',
            'CLI Path',
            'Network Configuration'
        ];

        configItems.forEach(item => {
            console.log(`   📋 ${item}: ⚠️ Please verify in test files`);
        });

        console.log('\n💡 Before running tests, ensure all test files have been updated with:');
        console.log('   • Your actual token address (replace YOUR_TOKEN_ADDRESS_HERE)');
        console.log('   • Your actual admin wallet address (replace YOUR_ADMIN_WALLET_ADDRESS_HERE)');
        console.log('   • Correct path to your CLI executable (replace ./path/to/your/cli.js)');
        console.log('');

        return true; // Return true to allow tests to run - user should manually verify
    }

    async generateSecurityReport() {
        const endTime = new Date();
        const totalDuration = endTime - this.startTime;

        console.log(`\n${'='.repeat(80)}`);
        console.log('🔒 COMPREHENSIVE SECURITY TEST REPORT');
        console.log(`${'='.repeat(80)}`);
        console.log(`📅 Test Run: ${this.startTime.toISOString()} - ${endTime.toISOString()}`);
        console.log(`⏱️  Total Duration: ${totalDuration}ms (${(totalDuration/1000).toFixed(2)}s)`);
        console.log(`🧪 Tests Executed: ${this.results.length}`);

        // Overall Statistics
        const successfulTests = this.results.filter(r => r.success).length;
        const failedTests = this.results.filter(r => !r.success).length;
        const successRate = (successfulTests / this.results.length * 100).toFixed(1);

        console.log(`\n📊 OVERALL STATISTICS`);
        console.log(`${'='.repeat(40)}`);
        console.log(`✅ Successful Tests: ${successfulTests}/${this.results.length} (${successRate}%)`);
        console.log(`❌ Failed Tests: ${failedTests}/${this.results.length}`);

        // Category Breakdown
        console.log(`\n📂 CATEGORY BREAKDOWN`);
        console.log(`${'='.repeat(40)}`);

        const categories = {};
        this.results.forEach(result => {
            if (!categories[result.category]) {
                categories[result.category] = { total: 0, successful: 0, failed: 0 };
            }
            categories[result.category].total++;
            if (result.success) {
                categories[result.category].successful++;
            } else {
                categories[result.category].failed++;
            }
        });

        Object.keys(categories).forEach(category => {
            const cat = categories[category];
            const rate = (cat.successful / cat.total * 100).toFixed(1);
            console.log(`📁 ${category}: ${cat.successful}/${cat.total} (${rate}%)`);
        });

        // Individual Test Results
        console.log(`\n🧪 INDIVIDUAL TEST RESULTS`);
        console.log(`${'='.repeat(40)}`);
        console.log('Test ID | Test Name                          | Status   | Duration');
        console.log('--------|------------------------------------|-----------|---------');

        this.results.forEach(result => {
            const status = result.success ? '✅ PASS' : '❌ FAIL';
            const duration = `${result.duration}ms`;
            const testName = result.name.length > 34 ? result.name.substring(0, 31) + '...' : result.name;

            console.log(`${result.id.padEnd(7)} | ${testName.padEnd(34)} | ${status.padEnd(9)} | ${duration}`);

            if (!result.success && result.error) {
                console.log(`        | Error: ${result.error.substring(0, 50)}...`);
            }
        });

        // Security Assessment
        console.log(`\n🛡️ SECURITY ASSESSMENT`);
        console.log(`${'='.repeat(40)}`);

        if (successRate >= 90) {
            console.log('🟢 Overall Security Level: EXCELLENT');
            console.log('   Your CLI application demonstrates robust security practices');
            console.log('   across all tested categories.');
        } else if (successRate >= 75) {
            console.log('🟡 Overall Security Level: GOOD');
            console.log('   Your CLI application has good security practices with');
            console.log('   some areas that may need attention.');
        } else if (successRate >= 50) {
            console.log('🟠 Overall Security Level: MODERATE');
            console.log('   Your CLI application has basic security measures but');
            console.log('   significant improvements are recommended.');
        } else {
            console.log('🔴 Overall Security Level: WEAK');
            console.log('   Your CLI application has significant security vulnerabilities');
            console.log('   that should be addressed immediately.');
        }

        // Recommendations
        if (failedTests > 0) {
            console.log(`\n💡 RECOMMENDATIONS`);
            console.log(`${'='.repeat(40)}`);

            const failedResults = this.results.filter(r => !r.success);
            failedResults.forEach(result => {
                console.log(`❌ ${result.id}: Review and fix issues in ${result.name}`);
            });
        }

        // Security Score Summary
        console.log(`\n🏆 SECURITY SCORE SUMMARY`);
        console.log(`${'='.repeat(40)}`);
        console.log(`Overall Score: ${successfulTests}/${this.results.length} tests passed`);
        console.log(`Success Rate: ${successRate}%`);
        console.log(`Security Level: ${this.getSecurityLevel(parseFloat(successRate))}`);

        console.log(`\n📋 Test completed. Review individual test outputs above for detailed results.`);
    }

    getSecurityLevel(successRate) {
        if (successRate >= 90) return 'EXCELLENT';
        if (successRate >= 75) return 'GOOD';
        if (successRate >= 50) return 'MODERATE';
        return 'WEAK';
    }
}

// Run all tests if this script is executed directly
if (require.main === module) {
    const runner = new SecurityTestRunner();
    runner.runAllTests().catch(error => {
        console.error('❌ Security test suite failed:', error);
        process.exit(1);
    });
}

module.exports = { SecurityTestRunner };