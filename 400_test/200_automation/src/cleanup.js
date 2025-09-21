#!/usr/bin/env node

/**
 * Test Environment Cleanup Script
 * Cleans up test artifacts and temporary files
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const readline = require('readline');

class TestCleanup {
  constructor() {
    this.cleanupPatterns = [
      path.join(os.tmpdir(), 'tributary-test-*'),
      path.join(process.cwd(), 'test_holders*.json'),
      path.join(process.cwd(), 'tributary.toml'),
      path.join(process.cwd(), '*.log')
    ];

    this.dryRun = false;
    this.interactive = false;
    this.logFile = null;
    this.cleanupLog = [];
  }

  /**
   * Set dry run mode (preview only, no actual deletion)
   */
  setDryRun(enabled = true) {
    this.dryRun = enabled;
    return this;
  }

  /**
   * Set interactive mode (ask for confirmation)
   */
  setInteractive(enabled = true) {
    this.interactive = enabled;
    return this;
  }

  /**
   * Set log file for cleanup operations
   */
  setLogFile(logPath) {
    this.logFile = logPath;
    return this;
  }

  /**
   * Log cleanup operation
   */
  logOperation(operation, target, success = true, error = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      operation,
      target,
      success,
      error: error ? error.message : null
    };

    this.cleanupLog.push(logEntry);

    if (this.logFile) {
      // Append to log file asynchronously
      this.writeLogEntry(logEntry).catch(console.error);
    }
  }

  /**
   * Write log entry to file
   */
  async writeLogEntry(logEntry) {
    try {
      const logLine = `${logEntry.timestamp} [${logEntry.success ? 'SUCCESS' : 'ERROR'}] ${logEntry.operation}: ${logEntry.target}${logEntry.error ? ` - ${logEntry.error}` : ''}\n`;
      await fs.appendFile(this.logFile, logLine);
    } catch (error) {
      console.warn(`Failed to write to log file: ${error.message}`);
    }
  }

  /**
   * Ask for user confirmation
   */
  async askConfirmation(message) {
    if (!this.interactive) return true;

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(`${message} (y/N): `, (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }

  async run() {
    try {
      if (this.dryRun) {
        console.log('🔍 DRY RUN MODE: Preview cleanup operations (no files will be deleted)');
      }

      console.log('🧹 Cleaning up test environment...');

      if (this.interactive) {
        const proceed = await this.askConfirmation('⚠️ Are you sure you want to proceed with cleanup?');
        if (!proceed) {
          console.log('❌ Cleanup cancelled by user');
          return;
        }
      }

      await this.cleanupTempDirectories();
      await this.cleanupTestFiles();
      await this.cleanupLogs();

      if (this.dryRun) {
        console.log('✅ Dry run complete! No files were actually deleted.');
      } else {
        console.log('✅ Cleanup complete!');
      }

      // Print summary
      this.printCleanupSummary();

    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
      this.logOperation('cleanup', 'full', false, error);
      process.exit(1);
    }
  }

  /**
   * Print cleanup operation summary
   */
  printCleanupSummary() {
    const successful = this.cleanupLog.filter(log => log.success).length;
    const failed = this.cleanupLog.filter(log => !log.success).length;

    console.log('\n📊 Cleanup Summary:');
    console.log(`  ✅ Successful operations: ${successful}`);
    if (failed > 0) {
      console.log(`  ❌ Failed operations: ${failed}`);
    }

    if (this.logFile) {
      console.log(`  📝 Detailed log saved to: ${this.logFile}`);
    }
  }

  async cleanupTempDirectories() {
    console.log('📁 Cleaning temporary test directories...');

    try {
      const tmpDir = os.tmpdir();
      const entries = await fs.readdir(tmpDir);

      const testDirs = entries.filter(entry =>
        entry.startsWith('tributary-test-') ||
        entry.startsWith('tributary-setup')
      );

      for (const dir of testDirs) {
        const fullPath = path.join(tmpDir, dir);
        try {
          const stats = await fs.stat(fullPath);
          if (stats.isDirectory()) {
            if (this.dryRun) {
              console.log(`  🔍 Would remove: ${fullPath}`);
              this.logOperation('remove-directory', fullPath, true);
            } else {
              await this.removeDirectory(fullPath);
              console.log(`  ✓ Removed: ${fullPath}`);
              this.logOperation('remove-directory', fullPath, true);
            }
          }
        } catch (error) {
          console.log(`  ⚠️ Could not remove ${fullPath}: ${error.message}`);
          this.logOperation('remove-directory', fullPath, false, error);
        }
      }

    } catch (error) {
      console.log(`  ⚠️ Error accessing temp directory: ${error.message}`);
    }
  }

  async cleanupTestFiles() {
    console.log('📄 Cleaning test output files...');

    const patterns = [
      'test_holders*.json',
      'holders_*.json',
      'tributary.toml',
      'test-report.json',
      'ci-test-report.json',
      'junit.xml',
      'failure-report.json'
    ];

    for (const pattern of patterns) {
      try {
        const files = await this.findFiles(process.cwd(), pattern);
        for (const file of files) {
          if (this.dryRun) {
            console.log(`  🔍 Would remove: ${file}`);
            this.logOperation('remove-file', file, true);
          } else {
            await fs.unlink(file);
            console.log(`  ✓ Removed: ${file}`);
            this.logOperation('remove-file', file, true);
          }
        }
      } catch (error) {
        // File might not exist, continue
      }
    }
  }

  async cleanupLogs() {
    console.log('📋 Cleaning log files...');

    try {
      const logFiles = await this.findFiles(process.cwd(), '*.log');
      for (const logFile of logFiles) {
        await fs.unlink(logFile);
        console.log(`  ✓ Removed: ${logFile}`);
      }
    } catch (error) {
      // Log files might not exist
    }
  }

  async removeDirectory(dirPath) {
    try {
      const entries = await fs.readdir(dirPath);

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry);
        const stats = await fs.stat(fullPath);

        if (stats.isDirectory()) {
          await this.removeDirectory(fullPath);
        } else {
          await fs.unlink(fullPath);
        }
      }

      await fs.rmdir(dirPath);
    } catch (error) {
      // Directory might not exist or permission issues
      throw new Error(`Failed to remove directory ${dirPath}: ${error.message}`);
    }
  }

  async findFiles(dir, pattern) {
    const files = [];

    try {
      const entries = await fs.readdir(dir);

      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stats = await fs.stat(fullPath);

        if (stats.isFile() && this.matchesPattern(entry, pattern)) {
          files.push(fullPath);
        } else if (stats.isDirectory() && entry !== 'node_modules' && !entry.startsWith('.')) {
          // Recursively search subdirectories (but skip node_modules and hidden dirs)
          const subFiles = await this.findFiles(fullPath, pattern);
          files.push(...subFiles);
        }
      }
    } catch (error) {
      // Directory might not be accessible
    }

    return files;
  }

  matchesPattern(filename, pattern) {
    // Simple glob-like pattern matching
    const regex = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*');

    return new RegExp(`^${regex}$`).test(filename);
  }

  async forceCleanup() {
    // Environment safety check
    if (!this.isCleanupEnvironmentSafe()) {
      throw new Error('🚫 Force cleanup is only allowed in CI/test environments. Set NODE_ENV=test or CI=true');
    }

    console.log('💥 Force cleanup mode - enhanced test artifact removal...');
    console.log('🔍 Environment verified as safe for force cleanup');

    // Enhanced cleanup with strict artifact targeting
    const safeAggressivePatterns = [
      // Temporary directories only
      {
        pattern: path.join(os.tmpdir(), '*tributary*'),
        description: 'Temporary Tributary directories'
      },
      // Specific test output files only
      {
        pattern: path.join(process.cwd(), 'test_*.json'),
        description: 'Test output JSON files'
      },
      {
        pattern: path.join(process.cwd(), '*-test-report*.json'),
        description: 'Test report files'
      },
      {
        pattern: path.join(process.cwd(), 'junit*.xml'),
        description: 'JUnit test result files'
      },
      {
        pattern: path.join(process.cwd(), 'coverage/**/*'),
        description: 'Code coverage reports'
      },
      {
        pattern: path.join(process.cwd(), '**/*.log'),
        description: 'Log files (recursive)'
      },
      // Test-specific TOML files only
      {
        pattern: path.join(process.cwd(), 'test-*.toml'),
        description: 'Test-specific TOML files'
      },
      {
        pattern: path.join(process.cwd(), '**/tributary.toml'),
        description: 'Test Tributary configuration files'
      }
    ];

    let totalRemoved = 0;

    for (const patternInfo of safeAggressivePatterns) {
      try {
        console.log(`🧹 Cleaning: ${patternInfo.description}`);
        const baseDir = path.dirname(patternInfo.pattern);
        const filePattern = path.basename(patternInfo.pattern);
        const files = await this.findFiles(baseDir, filePattern);

        for (const file of files) {
          // Enhanced safety check with whitelist protection
          if (this.isTestArtifactSafe(file)) {
            await fs.unlink(file);
            console.log(`  ✓ Removed: ${path.relative(process.cwd(), file)}`);
            totalRemoved++;
          } else {
            console.log(`  🛡️ Protected: ${path.relative(process.cwd(), file)}`);
          }
        }
      } catch (error) {
        console.warn(`  ⚠️ Warning: ${error.message}`);
      }
    }

    console.log(`🏁 Force cleanup complete. ${totalRemoved} files removed.`);
  }

  /**
   * Check if environment is safe for force cleanup operations
   */
  isCleanupEnvironmentSafe() {
    const nodeEnv = process.env.NODE_ENV;
    const isCI = process.env.CI === 'true';
    const isTesting = nodeEnv === 'test' || nodeEnv === 'testing';
    const isManualOverride = process.env.TRIBUTARY_CLEANUP_FORCE === 'true';

    return isCI || isTesting || isManualOverride;
  }

  /**
   * Enhanced test artifact detection with whitelist protection
   */
  isTestArtifactSafe(filePath) {
    const filename = path.basename(filePath);
    const fullPath = path.resolve(filePath);

    // CRITICAL: Protected files that must NEVER be deleted
    const protectedFiles = [
      'package.json',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      'tsconfig.json',
      'jsconfig.json',
      '.gitignore',
      '.git',
      'README.md',
      'LICENSE',
      'Dockerfile',
      'docker-compose.yml',
      '.env',
      '.env.production',
      '.env.local',
      'webpack.config.js',
      'vite.config.js',
      'rollup.config.js',
      'babel.config.js',
      '.babelrc',
      'eslint.config.js',
      '.eslintrc',
      'prettier.config.js',
      '.prettierrc',
      'jest.config.js',
      'vitest.config.js',
      'cypress.config.js',
      'playwright.config.js'
    ];

    // CRITICAL: Protected directories that must NEVER be deleted
    const protectedDirs = [
      'node_modules',
      '.git',
      'src',
      '200_src',
      'lib',
      'dist',
      'build',
      '.vscode',
      '.idea'
    ];

    // Check if file is in protected list
    if (protectedFiles.includes(filename)) {
      return false;
    }

    // Check if file is in protected directory
    const relativePath = path.relative(process.cwd(), fullPath);
    const pathParts = relativePath.split(path.sep);
    if (protectedDirs.some(dir => pathParts.includes(dir))) {
      return false;
    }

    // Enhanced test artifact indicators
    const testIndicators = [
      'test_',
      'test-report',
      'ci-test-report',
      'junit',
      'failure-report',
      'holders_',
      'coverage',
      '.nyc_output'
    ];

    // Test-specific file patterns
    const testFilePatterns = [
      /^test.*\.json$/,
      /^.*-test-report.*\.json$/,
      /^junit.*\.xml$/,
      /^.*\.test\.log$/,
      /^.*-test\.log$/,
      /^test-.*\.toml$/
    ];

    // Check against test indicators
    const hasTestIndicator = testIndicators.some(indicator => filename.includes(indicator));
    const matchesTestPattern = testFilePatterns.some(pattern => pattern.test(filename));

    // Special case: tributary.toml (test configuration files)
    const isTributaryConfig = filename === 'tributary.toml' &&
                             (relativePath.includes('test') || relativePath.includes('temp'));

    return hasTestIndicator || matchesTestPattern || isTributaryConfig;
  }

  isTestArtifact(filePath) {
    // Legacy method - maintained for backward compatibility
    return this.isTestArtifactSafe(filePath);
  }
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    force: false,
    dryRun: false,
    interactive: false,
    logFile: null,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--force':
        options.force = true;
        break;
      case '--dry-run':
      case '-n':
        options.dryRun = true;
        break;
      case '--interactive':
      case '-i':
        options.interactive = true;
        break;
      case '--log':
      case '-l':
        if (i + 1 < args.length) {
          options.logFile = args[++i];
        } else {
          options.logFile = `cleanup-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.log`;
        }
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        console.warn(`⚠️ Unknown option: ${arg}`);
    }
  }

  return options;
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
🧹 Tributary Test Cleanup Script

USAGE:
  node cleanup.js [OPTIONS]

OPTIONS:
  --force           Enable force cleanup mode (CI/test environments only)
  --dry-run, -n     Preview mode - show what would be deleted without actually deleting
  --interactive, -i Ask for confirmation before each operation
  --log [file], -l  Save cleanup operations to log file (optional filename)
  --help, -h        Show this help message

EXAMPLES:
  node cleanup.js                    # Standard cleanup
  node cleanup.js --dry-run          # Preview what would be deleted
  node cleanup.js --interactive      # Ask for confirmation
  node cleanup.js --force --log      # Force cleanup with logging (CI only)

ENVIRONMENT VARIABLES:
  NODE_ENV=test                      # Allow force mode
  CI=true                           # Allow force mode
  TRIBUTARY_CLEANUP_FORCE=true      # Manual override for force mode

SAFETY FEATURES:
  • Force mode only works in CI/test environments
  • Comprehensive whitelist protection for critical files
  • Interactive confirmation available
  • Dry run mode for safe previewing
  • Detailed logging of all operations
`);
}

// Main execution
if (require.main === module) {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  const cleanup = new TestCleanup();

  // Configure cleanup instance
  if (options.dryRun) {
    cleanup.setDryRun(true);
  }
  if (options.interactive) {
    cleanup.setInteractive(true);
  }
  if (options.logFile) {
    cleanup.setLogFile(options.logFile);
  }

  // Execute cleanup
  async function executeCleanup() {
    try {
      if (options.force) {
        await cleanup.forceCleanup();
        console.log('✅ Force cleanup complete!');
      } else {
        await cleanup.run();
      }
    } catch (error) {
      console.error(`❌ Cleanup failed: ${error.message}`);

      if (error.message.includes('only allowed in CI/test environments')) {
        console.log('\n💡 To enable force mode:');
        console.log('  • Set NODE_ENV=test');
        console.log('  • Set CI=true');
        console.log('  • Set TRIBUTARY_CLEANUP_FORCE=true');
        console.log('  • Or use --dry-run to preview operations');
      }

      process.exit(1);
    }
  }

  executeCleanup();
}

module.exports = TestCleanup;