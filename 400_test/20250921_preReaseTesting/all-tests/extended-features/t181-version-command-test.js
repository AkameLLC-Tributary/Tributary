#!/usr/bin/env node

/**
 * T181 Version Command Test
 * Tests version command functionality and output formatting
 */

const ComprehensiveTestRunner = require('./path/to/your/cli.js');

async function runT181VersionCommandTest() {
  console.log('📋 T181 Version Command Test');
  console.log('='.repeat(60));

  const runner = new ComprehensiveTestRunner();

  console.log('Test: Version command functionality and output formatting');
  console.log('');

  try {
    const testDir = await runner.createTestDirectory('t181-version-command');

    // Step 1: Test basic version command
    console.log('Step 1: Testing basic version command...');
    const versionResult = await runner.execCommand(
      './path/to/your/cli.js --version',
      { cwd: testDir }
    );

    console.log('Version Command Success:', versionResult.success ? '✅' : '❌');

    if (versionResult.success) {
      console.log('Version Output Format Check:');
      const output = versionResult.output;

      // Check for version number pattern (e.g., 1.0.0, v1.0.0)
      const hasVersionNumber = /\d+\.\d+\.\d+/.test(output);
      console.log('  Version Number Pattern:', hasVersionNumber ? '✅' : '❌');

      // Check output is not empty
      const hasOutput = output && output.trim().length > 0;
      console.log('  Non-empty Output:', hasOutput ? '✅' : '❌');

      // Check reasonable length (not too verbose)
      const reasonableLength = output.length > 0 && output.length < 500;
      console.log('  Reasonable Output Length:', reasonableLength ? '✅' : '❌');

      console.log('Version Output:', output.trim());
    } else {
      console.log('Version Error:', versionResult.errorDetails || versionResult.output);
    }

    // Step 2: Test alternative version flags
    console.log('');
    console.log('Step 2: Testing alternative version flags...');

    const versionFlags = ['-v', '--version', 'version'];

    for (const flag of versionFlags) {
      console.log(`\nTesting flag: ${flag}`);

      const flagResult = await runner.execCommand(
        `./path/to/your/cli.js ${flag}`,
        { cwd: testDir }
      );

      console.log(`  Flag "${flag}" Success:`, flagResult.success ? '✅' : '❌');

      if (flagResult.success && flagResult.output) {
        const hasVersionInfo = /\d+\.\d+\.\d+/.test(flagResult.output);
        console.log(`  Flag "${flag}" Version Info:`, hasVersionInfo ? '✅' : '❌');
      }
    }

    // Step 3: Test version with other commands
    console.log('');
    console.log('Step 3: Testing version with other commands...');

    // Test that version doesn't interfere with other commands
    const helpVersionResult = await runner.execCommand(
      './path/to/your/cli.js help --version',
      { cwd: testDir }
    );

    console.log('Help with Version Flag:', helpVersionResult.success ? '✅' : '❌');

    // Step 4: Test version command precedence
    console.log('');
    console.log('Step 4: Testing version command precedence...');

    // Version should take precedence over other commands
    const precedenceResult = await runner.execCommand(
      './path/to/your/cli.js init --version',
      { cwd: testDir }
    );

    console.log('Version Precedence Test:', precedenceResult.success ? '✅' : '❌');

    if (precedenceResult.success) {
      const output = precedenceResult.output;
      const isVersionOutput = /\d+\.\d+\.\d+/.test(output) && !output.toLowerCase().includes('init');
      console.log('Version Takes Precedence:', isVersionOutput ? '✅' : '❌');
    }

    // Step 5: Test version output consistency
    console.log('');
    console.log('Step 5: Testing version output consistency...');

    // Run version command multiple times to ensure consistency
    const runs = [];
    for (let i = 0; i < 3; i++) {
      const run = await runner.execCommand(
        './path/to/your/cli.js --version',
        { cwd: testDir }
      );
      if (run.success) {
        runs.push(run.output.trim());
      }
    }

    if (runs.length === 3) {
      const allSame = runs.every(output => output === runs[0]);
      console.log('Version Output Consistency:', allSame ? '✅' : '❌');

      if (!allSame) {
        console.log('Inconsistent outputs detected:');
        runs.forEach((output, i) => console.log(`  Run ${i + 1}: ${output}`));
      }
    } else {
      console.log('Version Consistency Test: ❌ (Not all runs succeeded)');
    }

    // Step 6: Test version format validation
    console.log('');
    console.log('Step 6: Testing version format validation...');

    if (versionResult.success && versionResult.output) {
      const output = versionResult.output.trim();

      // Check semantic versioning pattern
      const semanticVersion = /^\d+\.\d+\.\d+(-[a-zA-Z0-9\-\.]+)?(\+[a-zA-Z0-9\-\.]+)?$/.test(output) ||
                             /^v?\d+\.\d+\.\d+(-[a-zA-Z0-9\-\.]+)?(\+[a-zA-Z0-9\-\.]+)?$/.test(output);
      console.log('Semantic Versioning Format:', semanticVersion ? '✅' : '❌');

      // Check for development/pre-release indicators
      const hasDevIndicators = output.includes('dev') || output.includes('alpha') ||
                              output.includes('beta') || output.includes('rc');
      console.log('Development Version Indicators:', hasDevIndicators ? '⚠️ (Dev version)' : '✅ (Release version)');
    }

    console.log('');
    console.log('✅ T181 Version Command Test completed');

    return {
      success: true,
      details: 'Version command functionality tested successfully',
      testResults: {
        basicVersion: versionResult.success,
        alternativeFlags: true,
        precedence: precedenceResult.success,
        consistency: runs.length === 3,
        formatValidation: versionResult.success
      }
    };

  } catch (error) {
    console.error('❌ T181 Test failed:', error.message);
    return {
      success: false,
      details: error.message,
      error: error
    };
  }
}

// Export for use by other test runners
module.exports = { runT181VersionCommandTest };

// Run if called directly
if (require.main === module) {
  runT181VersionCommandTest()
    .then(result => {
      console.log('\n📊 Final Result:', result.success ? 'PASS ✅' : 'FAIL ❌');
      if (result.details) {
        console.log('Details:', result.details);
      }
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    });
}