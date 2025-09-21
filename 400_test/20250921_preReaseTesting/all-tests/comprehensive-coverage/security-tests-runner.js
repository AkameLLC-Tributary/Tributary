#!/usr/bin/env node

/**
 * Security Tests Runner for Comprehensive Coverage (T210-T220)
 * This script runs all security tests and provides a comprehensive report
 */

const path = require('path');
const { execSync } = require('child_process');

// Define security test categories and their test files
const securityTestCategories = {
  'Input Validation': [
    { id: 'T210', name: 'Input Sanitization Test', path: '../../../security-tests/input-validation/t210-input-sanitization-test.js' },
    { id: 'T214', name: 'Environment Validation Test', path: '../../../security-tests/input-validation/t214-environment-validation-test.js' }
  ],
  'Injection Prevention': [
    { id: 'T211', name: 'SQL Injection Test', path: '../../../security-tests/injection-prevention/t211-sql-injection-test.js' },
    { id: 'T212', name: 'Command Injection Test', path: '../../../security-tests/injection-prevention/t212-command-injection-test.js' },
    { id: 'T213', name: 'Path Traversal Test', path: '../../../security-tests/injection-prevention/t213-path-traversal-test.js' }
  ],
  'Access Control': [
    { id: 'T215', name: 'Config Tampering Test', path: '../../../security-tests/access-control/t215-config-tampering-test.js' },
    { id: 'T216', name: 'Data Exposure Test', path: '../../../security-tests/access-control/t216-data-exposure-test.js' },
    { id: 'T217', name: 'Audit Trail Test', path: '../../../security-tests/access-control/t217-audit-trail-test.js' },
    { id: 'T218', name: 'Access Control Test', path: '../../../security-tests/access-control/t218-access-control-test.js' },
    { id: 'T219', name: 'Cryptographic Validation Test', path: '../../../security-tests/access-control/t219-cryptographic-validation-test.js' }
  ]
};

async function runSecurityTestsRunner() {
  console.log('🔒 Comprehensive Security Tests Runner (T210-T220)');
  console.log('='.repeat(70));
  console.log('');

  const results = {
    categories: {},
    summary: {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0
    }
  };

  console.log('📋 Security Test Categories:');
  Object.keys(securityTestCategories).forEach(category => {
    console.log(`  • ${category} (${securityTestCategories[category].length} tests)`);
  });
  console.log('');

  // Run tests by category
  for (const [categoryName, tests] of Object.entries(securityTestCategories)) {
    console.log(`🔍 Running ${categoryName} Tests:`);
    console.log('-'.repeat(50));

    results.categories[categoryName] = {
      tests: [],
      passed: 0,
      failed: 0,
      skipped: 0
    };

    for (const test of tests) {
      console.log(`\n${test.id}: ${test.name}`);
      results.summary.totalTests++;

      try {
        // Check if test file exists
        const testPath = path.resolve(__dirname, test.path);

        try {
          require.resolve(testPath);
        } catch (resolveError) {
          console.log(`  Status: SKIPPED ⚠️ (File not found)`);
          console.log(`  Path: ${test.path}`);

          results.categories[categoryName].tests.push({
            id: test.id,
            name: test.name,
            status: 'SKIPPED',
            reason: 'File not found',
            path: test.path
          });
          results.categories[categoryName].skipped++;
          results.summary.skippedTests++;
          continue;
        }

        // Run the test
        console.log(`  Running: ${test.path}`);

        try {
          // Execute test with timeout
          const output = execSync(`node "${testPath}"`, {
            cwd: __dirname,
            timeout: 60000, // 1 minute timeout per test
            encoding: 'utf8'
          });

          console.log(`  Status: PASSED ✅`);
          console.log(`  Output: Test completed successfully`);

          results.categories[categoryName].tests.push({
            id: test.id,
            name: test.name,
            status: 'PASSED',
            output: output.slice(-200) // Last 200 chars of output
          });
          results.categories[categoryName].passed++;
          results.summary.passedTests++;

        } catch (execError) {
          console.log(`  Status: FAILED ❌`);
          console.log(`  Error: ${execError.message.slice(0, 200)}...`);

          results.categories[categoryName].tests.push({
            id: test.id,
            name: test.name,
            status: 'FAILED',
            error: execError.message,
            exitCode: execError.status
          });
          results.categories[categoryName].failed++;
          results.summary.failedTests++;
        }

      } catch (error) {
        console.log(`  Status: ERROR ❌`);
        console.log(`  Error: ${error.message}`);

        results.categories[categoryName].tests.push({
          id: test.id,
          name: test.name,
          status: 'ERROR',
          error: error.message
        });
        results.categories[categoryName].failed++;
        results.summary.failedTests++;
      }
    }

    // Category summary
    const categoryResults = results.categories[categoryName];
    console.log(`\n${categoryName} Summary:`);
    console.log(`  Passed: ${categoryResults.passed} ✅`);
    console.log(`  Failed: ${categoryResults.failed} ❌`);
    console.log(`  Skipped: ${categoryResults.skipped} ⚠️`);
    console.log('');
  }

  // Overall summary
  console.log('📊 COMPREHENSIVE SECURITY TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total Tests: ${results.summary.totalTests}`);
  console.log(`Passed: ${results.summary.passedTests} ✅`);
  console.log(`Failed: ${results.summary.failedTests} ❌`);
  console.log(`Skipped: ${results.summary.skippedTests} ⚠️`);

  const passRate = results.summary.totalTests > 0 ?
    Math.round((results.summary.passedTests / results.summary.totalTests) * 100) : 0;
  console.log(`Pass Rate: ${passRate}%`);

  // Security assessment
  console.log('');
  console.log('🔒 SECURITY ASSESSMENT:');

  if (results.summary.failedTests === 0 && results.summary.skippedTests === 0) {
    console.log('  Status: SECURE ✅');
    console.log('  All security tests passed successfully');
  } else if (results.summary.failedTests === 0) {
    console.log('  Status: MOSTLY SECURE ⚠️');
    console.log(`  Some tests were skipped (${results.summary.skippedTests})`);
  } else {
    console.log('  Status: SECURITY ISSUES DETECTED ❌');
    console.log(`  Failed tests: ${results.summary.failedTests}`);
    console.log('  IMMEDIATE ATTENTION REQUIRED');
  }

  // Recommendations
  console.log('');
  console.log('💡 RECOMMENDATIONS:');

  if (results.summary.failedTests > 0) {
    console.log('  • Review and fix all failed security tests immediately');
    console.log('  • Do not deploy to production until all security tests pass');
    console.log('  • Consider additional security hardening measures');
  }

  if (results.summary.skippedTests > 0) {
    console.log('  • Implement missing security test files');
    console.log('  • Ensure all test categories have complete coverage');
  }

  if (results.summary.failedTests === 0 && results.summary.skippedTests === 0) {
    console.log('  • Security posture is good, continue regular testing');
    console.log('  • Consider periodic security audits');
    console.log('  • Keep security tests updated with new threats');
  }

  console.log('');
  console.log('🔗 For detailed test information, see individual test files in:');
  console.log('   ../../../security-tests/');
  console.log('');

  // Exit with appropriate code
  const exitCode = results.summary.failedTests > 0 ? 1 : 0;
  process.exit(exitCode);
}

// Export for use by other scripts
module.exports = { runSecurityTestsRunner, securityTestCategories };

// Run if called directly
if (require.main === module) {
  runSecurityTestsRunner()
    .catch(error => {
      console.error('💥 Security test runner failed:', error);
      process.exit(1);
    });
}