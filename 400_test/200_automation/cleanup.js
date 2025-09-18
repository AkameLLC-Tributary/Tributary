#!/usr/bin/env node

/**
 * Test Environment Cleanup Script
 * Cleans up test artifacts and temporary files
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class TestCleanup {
  constructor() {
    this.cleanupPatterns = [
      path.join(os.tmpdir(), 'tributary-test-*'),
      path.join(process.cwd(), 'test_holders*.json'),
      path.join(process.cwd(), 'tributary.toml'),
      path.join(process.cwd(), '*.log')
    ];
  }

  async run() {
    try {
      console.log('🧹 Cleaning up test environment...');

      await this.cleanupTempDirectories();
      await this.cleanupTestFiles();
      await this.cleanupLogs();

      console.log('✅ Cleanup complete!');

    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
      process.exit(1);
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
            await this.removeDirectory(fullPath);
            console.log(`  ✓ Removed: ${fullPath}`);
          }
        } catch (error) {
          console.log(`  ⚠️ Could not remove ${fullPath}: ${error.message}`);
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
          await fs.unlink(file);
          console.log(`  ✓ Removed: ${file}`);
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
    console.log('💥 Force cleanup mode - removing all test artifacts...');

    // More aggressive cleanup for CI environments
    const aggressivePatterns = [
      path.join(os.tmpdir(), '*tributary*'),
      path.join(process.cwd(), '*test*'),
      path.join(process.cwd(), '*.json'),
      path.join(process.cwd(), '*.toml'),
      path.join(process.cwd(), '*.log'),
      path.join(process.cwd(), '*.xml')
    ];

    for (const pattern of aggressivePatterns) {
      try {
        const baseDir = path.dirname(pattern);
        const filePattern = path.basename(pattern);
        const files = await this.findFiles(baseDir, filePattern);

        for (const file of files) {
          // Only remove files that look like test artifacts
          if (this.isTestArtifact(file)) {
            await fs.unlink(file);
            console.log(`  ✓ Force removed: ${file}`);
          }
        }
      } catch (error) {
        // Continue with cleanup
      }
    }
  }

  isTestArtifact(filePath) {
    const filename = path.basename(filePath);
    const testIndicators = [
      'test_',
      'tributary.toml',
      'test-report',
      'ci-test-report',
      'junit.xml',
      'failure-report',
      'holders_'
    ];

    return testIndicators.some(indicator => filename.includes(indicator));
  }
}

// Command line options
const args = process.argv.slice(2);
const forceMode = args.includes('--force');

// Main execution
if (require.main === module) {
  const cleanup = new TestCleanup();

  if (forceMode) {
    cleanup.forceCleanup().then(() => {
      console.log('✅ Force cleanup complete!');
    }).catch(error => {
      console.error('Cleanup failed:', error);
      process.exit(1);
    });
  } else {
    cleanup.run().catch(error => {
      console.error('Cleanup failed:', error);
      process.exit(1);
    });
  }
}

module.exports = TestCleanup;