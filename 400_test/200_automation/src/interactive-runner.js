#!/usr/bin/env node

/**
 * Interactive Test Runner Entry Point
 * Provides an easy way to run comprehensive tests with interactive configuration
 */

const ComprehensiveTestRunner = require('./comprehensive-test-runner');

async function main() {
  const runner = new ComprehensiveTestRunner();

  // Enable interactive mode
  runner.enableInteractiveMode();

  // Run comprehensive tests with user configuration
  await runner.run();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Interactive test runner failed:', error.message);
    process.exit(1);
  });
}

module.exports = main;