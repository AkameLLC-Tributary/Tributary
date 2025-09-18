#!/usr/bin/env node

/**
 * Test Environment Setup Script
 * Prepares the testing environment with required dependencies and configuration
 */

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class TestSetup {
  constructor() {
    this.setupDir = path.join(os.tmpdir(), 'tributary-test-setup');
  }

  async run() {
    try {
      console.log('🛠️  Setting up Tributary test environment...');

      await this.createDirectories();
      await this.installDependencies();
      await this.setupTestWallets();
      await this.verifyTributaryInstallation();
      await this.createConfigTemplates();
      await this.setupEnvironmentVariables();

      console.log('✅ Test environment setup complete!');
      console.log(`📁 Test directory: ${this.setupDir}`);

    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      process.exit(1);
    }
  }

  async createDirectories() {
    console.log('📁 Creating test directories...');

    const dirs = [
      this.setupDir,
      path.join(this.setupDir, 'configs'),
      path.join(this.setupDir, 'wallets'),
      path.join(this.setupDir, 'outputs'),
      path.join(this.setupDir, 'logs')
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
      console.log(`  ✓ ${dir}`);
    }
  }

  async installDependencies() {
    console.log('📦 Installing test dependencies...');

    try {
      // Check if we're in the automation directory
      const currentDir = process.cwd();
      const packageJsonPath = path.join(currentDir, 'package.json');

      try {
        await fs.access(packageJsonPath);
        console.log('  📋 Found package.json, installing dependencies...');
        await this.execCommand('npm install');
        console.log('  ✅ Dependencies installed');
      } catch {
        console.log('  ⚠️ No package.json found, skipping npm install');
      }

      // Verify Node.js and npm versions
      const nodeVersion = await this.execCommand('node --version');
      const npmVersion = await this.execCommand('npm --version');

      console.log(`  ✓ Node.js: ${nodeVersion.trim()}`);
      console.log(`  ✓ npm: ${npmVersion.trim()}`);

    } catch (error) {
      throw new Error(`Dependency installation failed: ${error.message}`);
    }
  }

  async setupTestWallets() {
    console.log('🔐 Setting up test wallets...');

    const wallets = {
      'admin-wallet.json': [
        174, 47, 154, 16, 202, 193, 206, 113, 199, 190, 53, 133, 169, 175, 31, 56,
        222, 53, 138, 189, 224, 216, 117, 173, 10, 149, 53, 45, 73, 251, 237, 246,
        12, 23, 150, 149, 127, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
      ],
      'recipient-1.json': [
        100, 23, 54, 76, 102, 83, 106, 13, 99, 90, 153, 33, 69, 75, 131, 156,
        22, 153, 38, 89, 124, 16, 17, 73, 110, 49, 153, 145, 173, 51, 37, 46,
        112, 223, 50, 49, 27, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1
      ],
      'recipient-2.json': [
        200, 123, 254, 176, 202, 183, 106, 113, 199, 190, 253, 133, 169, 175, 31, 56,
        222, 253, 138, 189, 224, 216, 117, 173, 10, 149, 53, 45, 73, 251, 237, 246,
        212, 123, 250, 149, 127, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2
      ],
      'invalid-wallet.json': [1, 2, 3] // Intentionally invalid for error testing
    };

    for (const [filename, keypair] of Object.entries(wallets)) {
      const walletPath = path.join(this.setupDir, 'wallets', filename);
      await fs.writeFile(walletPath, JSON.stringify(keypair));

      // Set appropriate permissions on Unix-like systems
      if (process.platform !== 'win32') {
        await this.execCommand(`chmod 600 "${walletPath}"`);
      }

      console.log(`  ✓ ${filename}`);
    }
  }

  async verifyTributaryInstallation() {
    console.log('🔍 Verifying Tributary CLI installation...');

    try {
      const version = await this.execCommand('tributary --version');
      console.log(`  ✅ Tributary CLI: ${version.trim()}`);
    } catch (error) {
      console.log('  ❌ Tributary CLI not found');
      console.log('  💡 Please install Tributary CLI first:');
      console.log('     npm install -g @akamellc/tributary');
      throw new Error('Tributary CLI not installed');
    }
  }

  async createConfigTemplates() {
    console.log('⚙️  Creating configuration templates...');

    const templates = {
      'devnet-config.toml': `
[project]
name = "DevnetTestProject"
network = "devnet"

[token]
base_token = "So11111111111111111111111111111111111111112"
admin_wallet = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"

[distribution]
auto_distribute = false
minimum_balance = 0.1
batch_size = 5

[security]
key_encryption = false
backup_enabled = true
audit_log = true
`,
      'testnet-config.toml': `
[project]
name = "TestnetTestProject"
network = "testnet"

[token]
base_token = "So11111111111111111111111111111111111111112"
admin_wallet = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"

[distribution]
auto_distribute = false
minimum_balance = 0.5
batch_size = 10

[security]
key_encryption = true
backup_enabled = true
audit_log = true
`,
      'mainnet-config.toml': `
[project]
name = "MainnetValidationConfig"
network = "mainnet-beta"

[token]
base_token = "So11111111111111111111111111111111111111112"
admin_wallet = "ProductionAdminWallet"

[distribution]
auto_distribute = false
minimum_balance = 1.0
batch_size = 10

[security]
key_encryption = true
backup_enabled = true
audit_log = true
`
    };

    for (const [filename, content] of Object.entries(templates)) {
      const configPath = path.join(this.setupDir, 'configs', filename);
      await fs.writeFile(configPath, content.trim());
      console.log(`  ✓ ${filename}`);
    }
  }

  async setupEnvironmentVariables() {
    console.log('🌍 Setting up environment variables...');

    const envTemplate = `
# Tributary Test Environment Variables
export TRIBUTARY_TEST_DIR="${this.setupDir}"
export TRIBUTARY_LOG_LEVEL="debug"
export SOLANA_RPC_URL_DEVNET="https://api.devnet.solana.com"
export SOLANA_RPC_URL_TESTNET="https://api.testnet.solana.com"
export SOLANA_RPC_URL_MAINNET="https://api.mainnet-beta.solana.com"

# Test wallet paths
export ADMIN_WALLET_PATH="${path.join(this.setupDir, 'wallets', 'admin-wallet.json')}"
export RECIPIENT_1_PATH="${path.join(this.setupDir, 'wallets', 'recipient-1.json')}"
export RECIPIENT_2_PATH="${path.join(this.setupDir, 'wallets', 'recipient-2.json')}"
export INVALID_WALLET_PATH="${path.join(this.setupDir, 'wallets', 'invalid-wallet.json')}"

# Test configuration paths
export DEVNET_CONFIG_PATH="${path.join(this.setupDir, 'configs', 'devnet-config.toml')}"
export TESTNET_CONFIG_PATH="${path.join(this.setupDir, 'configs', 'testnet-config.toml')}"
export MAINNET_CONFIG_PATH="${path.join(this.setupDir, 'configs', 'mainnet-config.toml')}"
`;

    const envPath = path.join(this.setupDir, 'test.env');
    await fs.writeFile(envPath, envTemplate.trim());

    console.log(`  ✓ Environment file: ${envPath}`);
    console.log(`  💡 Source this file before running tests:`);
    console.log(`     source "${envPath}"`);
  }

  async execCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, { encoding: 'utf8' }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Command failed: ${error.message}`));
        } else {
          resolve(stdout);
        }
      });
    });
  }
}

// Main execution
if (require.main === module) {
  const setup = new TestSetup();
  setup.run().catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
}

module.exports = TestSetup;