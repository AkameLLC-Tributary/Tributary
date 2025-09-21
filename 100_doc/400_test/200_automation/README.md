# Tributary Test Automation

**Last Updated**: 2025-09-18
**Updated By**: akameGusya

## Overview

Comprehensive automated testing system for Tributary CLI. Automates quality assurance from development to production environments across all functionality.

## ⚠️ Prerequisites and Limitations

### 🔧 Required User Preparation

#### 1. Software Requirements
- **Node.js**: Version 18.0 or higher
- **npm**: Version 8.0 or higher
- **Git**: For repository operations
- **curl**: For network connectivity tests
- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)

#### 2. Solana Environment Setup
- **Solana CLI**: Must be installed and configured
- **Network Access**: Reliable internet connection for devnet/testnet
- **RPC Endpoints**: Access to Solana devnet and testnet RPCs

#### 3. Test Wallets and Tokens (For Real Distribution Tests Only)
- **testnet SOL Acquisition**: ⚠️ **CRITICAL LIMITATION**
  - **Solana Faucet Limit**: Maximum 5 SOL per 8 hours from official faucet
  - **Reality**: ❌ **Often unavailable** - Faucets frequently empty or restricted
  - **Required Balance**: Minimum 20 SOL needed for comprehensive real distribution tests
  - **Preparation Time**: ⚠️ **May be impossible** to accumulate sufficient testnet SOL from public faucets

- **💡 RECOMMENDED ALTERNATIVE: Custom Test Tokens**
  - **Custom SPL Tokens**: ✅ **Preferred approach** - Use your own created tokens
  - **Unlimited Supply**: Create as many tokens as needed for testing
  - **Full Control**: Complete control over token distribution and testing
  - **Realistic Testing**: Tests actual SPL token transfer functionality
  - **Zero Cost**: No dependency on limited faucet resources

- **Admin Wallet**: Valid Solana keypair file with sufficient balance (small amount of SOL for transaction fees)
- **Network Permissions**: Ability to send transactions on testnet
- **Token Configuration**: ⚠️ **Current tests configured for SOL but can be adapted**
  - **Custom Tokens**: ✅ **Easily configurable** - Update token addresses in test configuration
  - **USDT/USDC**: ❌ Not supported in current test implementation
  - **Token Creation**: Recommended to create dedicated test tokens for consistent testing

#### 4. System Resources
- **Memory**: Minimum 2GB RAM (4GB recommended)
- **Disk Space**: Minimum 1GB free space for test artifacts
- **CPU**: Multi-core processor recommended for parallel test execution

### 🚨 Test Limitations and Restrictions

#### 1. Network Limitations
- **mainnet Testing**: ❌ **NEVER TESTED** - All tests run on devnet/testnet only
- **Private Networks**: ❌ Cannot test custom Solana network configurations
- **Offline Mode**: ❌ Network connectivity required for most tests
- **Rate Limits**: May encounter RPC rate limiting during intensive testing

#### 2. Token and Wallet Limitations
- **Real Assets**: ❌ No mainnet tokens used (testnet only)
- **Token Types**: ⚠️ **LIMITATION**: Currently only tests SOL transfers
  - ❌ **USDT testing**: Not implemented in current test suite
  - ❌ **USDC testing**: Not implemented in current test suite
  - ❌ **Custom SPL tokens**: Limited support for standard SPL token testing
  - ❌ **NFT tokens**: No NFT (Non-Fungible Token) testing
- **Hardware Wallets**: ❌ Cannot test Ledger/Trezor integration
- **Multi-sig Wallets**: ❌ Multi-signature wallet testing not supported

#### 3. Functional Limitations
- **Interactive Commands**: ⚠️ Limited automation for user input prompts
- **GUI Testing**: ❌ CLI only - no graphical interface testing
- **Email Notifications**: ❌ No email/SMS notification testing
- **External Integrations**: ❌ Third-party API integrations not tested

#### 4. Performance Limitations
- **Load Testing**: ⚠️ Limited to medium-scale testing (max 1000 transactions)
- **Stress Testing**: ❌ No high-load stress testing capabilities
- **Concurrent Users**: ❌ Single-user operation testing only
- **Long-term Stability**: ❌ No extended duration testing (>6 hours)

#### 5. Security Limitations
- **Penetration Testing**: ❌ No security vulnerability scanning
- **Key Recovery**: ❌ No wallet recovery scenario testing
- **Encryption Testing**: ❌ No cryptographic security validation
- **Access Control**: ❌ No role-based access control testing

### 📋 Pre-Test Checklist

Before running comprehensive tests, ensure:

- [ ] **Tributary CLI installed**: `tributary --version` works
- [ ] **Network connectivity**: Can reach devnet/testnet endpoints
- [ ] **Sufficient disk space**: At least 1GB free
- [ ] **Dependencies installed**: `npm install` completed successfully

#### For Real Distribution Tests (Optional):
- [ ] **Admin wallet prepared**: Valid Solana keypair file
- [ ] **Token selection decided**:
  - [ ] **Option A**: Attempt to acquire testnet SOL (may be impossible due to faucet limitations)
  - [ ] **Option B**: ✅ **RECOMMENDED** - Use custom SPL tokens that you've created
- [ ] **Token configuration**: Update test configuration with your custom token addresses
- [ ] **Minimal SOL for fees**: Small amount of SOL for transaction fees (0.1-0.5 SOL sufficient)
- [ ] **Environment variables**: Test directory paths configured

### 🚫 What Cannot Be Tested

#### 1. Production Environment Operations
- **mainnet transactions**: Real production token transfers
- **Live user data**: Actual user wallet interactions
- **Production APIs**: Live exchange or DeFi protocol integrations
- **Regulatory compliance**: Legal or compliance workflow testing

#### 1.5. Token-Specific Limitations
- **USDT distributions**: ⚠️ **Major Limitation** - Current test suite does not test USDT transfers
- **USDC distributions**: ⚠️ **Major Limitation** - Current test suite does not test USDC transfers
- **Stablecoin testing**: ❌ No comprehensive stablecoin distribution testing
- **Token swap operations**: ❌ No testing of token exchange or swap functionality
- **Cross-token operations**: ❌ No testing of multi-token distribution scenarios

#### 2. Hardware-Dependent Features
- **Hardware wallets**: Ledger, Trezor, or similar device integration
- **Mobile devices**: Smartphone or tablet compatibility
- **Specific hardware**: Platform-specific hardware features

#### 3. External Service Integrations
- **Email services**: SMTP or email provider integrations
- **SMS services**: Text message notification systems
- **Cloud storage**: AWS S3, Google Cloud, or similar integrations
- **Analytics platforms**: Third-party analytics or monitoring tools

#### 4. Advanced Solana Features
- **Program deployment**: Smart contract deployment testing
- **Custom instructions**: Non-standard transaction types
- **Validator operations**: Staking, delegation, or validator setup
- **Governance**: DAO voting or governance token operations

### ⚠️ Important Warnings

#### Real Distribution Tests
- **🚨 TESTNET ONLY**: Never executes on mainnet
- **💰 REAL TOKENS**: Uses actual tokens for real transactions on testnet
- **🔧 TOKEN OPTIONS**:
  - **Option A**: testnet SOL (❌ **Limited by faucet restrictions** - often unavailable)
  - **Option B**: ✅ **RECOMMENDED** - Custom SPL tokens (unlimited supply, full control)
- **⏰ IRREVERSIBLE**: Cannot undo token transfers once executed
- **📊 SCOPE LIMITATIONS**:
  - **With testnet SOL**: Maximum 5 SOL per test session (if obtainable)
  - **With custom tokens**: Unlimited testing scope based on your token supply

#### Test Environment
- **🗑️ TEMPORARY FILES**: Test creates temporary files that must be cleaned up
- **🌐 NETWORK DEPENDENT**: Requires stable internet connection
- **⚡ RESOURCE INTENSIVE**: May consume significant CPU/memory during execution
- **📝 LOG FILES**: Generates detailed logs that may contain sensitive information

## Test Script Architecture

### 🚀 Main Test Runners
- **test-runner.js** - Full-featured test suite
- **ci-runner.js** - CI/CD optimized version
- **comprehensive-test-runner.js** - Complete test coverage (all 71 items)
- **real-distribution-runner.js** - Real token distribution tests with safety measures
- **setup.js** - Test environment setup
- **cleanup.js** - Post-test cleanup

### 📋 Execution Phases

#### Phase 1: devnet Basic Functions (30 minutes)
- Project initialization
- Configuration management
- Error handling
- Input validation

#### Phase 2: testnet Integration (2 hours)
- Token holder collection
- Distribution simulation
- Dry run execution
- Small amount distributions

#### Phase 3: Performance Testing (1 hour)
- Large data processing
- Memory usage monitoring
- Execution time measurement

#### Phase 4: Production Preparation (30 minutes)
- mainnet configuration validation
- Production parameter verification

#### Phase 5: Advanced Features (1.5 hours)
- Distribution history management
- Logging and audit functions
- Advanced output formats
- Network switching
- Enhanced error handling
- File operations

#### Phase 6: Real Distribution (30 minutes) 🚨
- Actual token transfers on testnet
- Real transaction verification
- Balance confirmations

## Usage

### 1. Environment Setup

```bash
cd 400_test/200_automation
npm install
node setup.js
```

### 2. Test Execution

```bash
# Comprehensive test suite (all 71 items)
npm run test:comprehensive

# All tests + real distribution
npm run test:all

# Real distribution only
npm run test:real-distribution

# Phase-specific execution
npm run test:phase1    # Basic functions
npm run test:phase2    # Integration tests
npm run test:phase3    # Performance tests
npm run test:phase4    # Production preparation
npm run test:phase5    # Advanced features

# Traditional test suite
npm test               # Original test suite
npm run test:ci        # CI optimized
```

### 3. Platform-Specific Scripts

```bash
# Windows
run-tests.bat comprehensive
run-tests.bat all
run-tests.bat phase1

# Unix/Linux/macOS
./run-tests.sh comprehensive
./run-tests.sh all
./run-tests.sh phase1
```

### 4. Cleanup

```bash
npm run cleanup
node cleanup.js --force  # Force cleanup
```

## Configuration Options

### Test Runner Configuration

```javascript
{
  devnetTimeout: 60000,           // devnet test timeout
  testnetTimeout: 300000,         // testnet test timeout
  comprehensiveTimeout: 900000,   // comprehensive test timeout
  maxRetries: 3,                  // maximum retry attempts
  enableAllTests: true,           // enable all test items
  includeRealDistribution: false, // include real distributions
  testCoverageTarget: 100         // coverage target percentage
}
```

### Environment Variables

```bash
# Test environment variables (auto-generated)
source /tmp/tributary-test-setup/test.env

# Key variables
TRIBUTARY_TEST_DIR="/tmp/tributary-test-setup"
ADMIN_WALLET_PATH="/tmp/tributary-test-setup/wallets/admin-wallet.json"
DEVNET_CONFIG_PATH="/tmp/tributary-test-setup/configs/devnet-config.toml"
```

## Test Coverage Matrix

### Complete Test Item List (71 Total)

| Phase | Test Count | Coverage | Priority High | Real Tokens |
|-------|------------|----------|---------------|-------------|
| Phase 1 | 17 items | 100% | 12 items | No |
| Phase 2 | 17 items | 100% | 11 items | No |
| Phase 3 | 6 items | 100% | 3 items | No |
| Phase 4 | 3 items | 100% | 2 items | No |
| Phase 5 | 24 items | 100% | 8 items | No |
| Phase 6 | 4 items | 100% | 3 items | **Yes** |
| **Total** | **71 items** | **100%** | **39 items** | **Optional** |

### Test Categories

#### ✅ Basic CLI Functions (T001-T005, T040-T044, T050-T063)
- Project initialization and configuration
- Error handling and validation
- Network connectivity and timeouts

#### ✅ Integration Testing (T010-T035)
- Token holder collection and filtering
- Distribution simulation and execution
- Transaction history and batch processing

#### ✅ Performance & Security (T070-T082)
- Large data processing capabilities
- Memory usage and execution time
- Private key management and security

#### ✅ Production Preparation (T090-T092)
- mainnet configuration validation
- Production settings verification
- Warning message systems

#### ✅ Advanced Features (T100-T152)
- Distribution history management
- Comprehensive logging and audit trails
- Advanced output formats (YAML, CSV)
- Network switching across all commands
- Enhanced error handling with proper exit codes
- File operations and backup functionality

#### ✅ Real Distribution (RD001-RD004) 🚨
- Micro distributions (0.1 SOL)
- Small distributions (0.5 SOL)
- Medium distributions (1.0 SOL)
- Batch distributions (2.0 SOL)

## Safety and Risk Management

### Real Distribution Safety Measures

- **Maximum Distribution**: 5.0 SOL per session
- **Network Restriction**: testnet only
- **User Confirmation**: Required before execution
- **Balance Verification**: Pre-execution balance checks
- **Transaction Logging**: Complete audit trail
- **Error Recovery**: Partial execution state preservation

### Error Handling

- **Automatic Retry**: 1 attempt (excluded for real distributions)
- **State Preservation**: Error state maintenance
- **Detailed Logging**: Complete operation audit trail
- **Recovery Procedures**: Failure response guidelines

## Output and Reports

### Execution Results

```
🚀 Tributary Comprehensive Test Suite Starting...
📊 Coverage Target: 100% of all identified test items
📅 Start Time: 2025-09-18T10:00:00.000Z

🏁 Phase 1: Comprehensive Basic Functions
🧪 Running T001: Basic initialization (attempt 1)
✅ T001 PASSED (1205ms)
...

=====================================
📋 COMPREHENSIVE TEST SUMMARY
=====================================
⏱️  Total Duration: 6h 15m
📊 Test Coverage: 100% (71/71)
✅ Passed: 68
❌ Failed: 2
⏭️  Skipped: 1
📈 Success Rate: 97.1%
📄 Report: /tmp/tributary-test-xxx/comprehensive-test-report.json
=====================================
```

### Generated Files

- **comprehensive-test-report.json** - Complete test results with coverage analysis
- **real-distribution-report.json** - Real distribution results with transaction hashes
- **junit.xml** - JUnit format for CI/CD integration
- **failure-report.json** - Detailed failure information and recovery suggestions

## GitHub Actions Integration

### Workflow Configuration

```yaml
# Copy to .github/workflows/test.yml
name: Tributary Comprehensive Test Suite
on: [push, pull_request]
jobs:
  comprehensive-test:
    runs-on: ubuntu-latest
    # ... (see github-workflow.yml for details)
```

### Automated Triggers

- **Push**: main/develop branch pushes
- **Pull Request**: main branch PRs
- **Schedule**: Daily at 2 AM UTC
- **Manual**: Workflow dispatch for comprehensive testing

## Performance Standards

### Pass Criteria
- **Success Rate**: 95% or higher
- **Phase 1 Execution**: Within 30 minutes
- **Phase 2 Execution**: Within 2.5 hours
- **Memory Usage**: Within 1GB limit
- **Error Handling**: 100% coverage

### Benchmark Targets
- 1000 wallet collection: Within 5 minutes
- 100 distribution simulation: Within 30 seconds
- Configuration validation: Within 1 second

## Troubleshooting

### Common Errors

#### 1. Tributary CLI not found
```bash
npm install -g @akamellc/tributary
# or
cd ../../200_src && npm link
```

#### 2. Network connection error
```bash
# Manual network verification
curl -s https://api.devnet.solana.com -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' -H "Content-Type: application/json"
```

#### 3. Permission errors (Unix systems)
```bash
chmod +x *.js *.sh
```

#### 4. Test timeout
- Increase timeout values in configuration for slow networks
- Adjust `devnetTimeout`, `testnetTimeout`, `comprehensiveTimeout`

### Debug and Logging

```bash
# Debug mode execution
DEBUG=1 node comprehensive-test-runner.js

# Enable detailed logging
TRIBUTARY_LOG_LEVEL=debug node comprehensive-test-runner.js
```

## Contributing and Maintenance

### Adding New Tests
1. Add test method to `comprehensive-test-runner.js`
2. Register test in appropriate phase matrix
3. Define expected values and error cases
4. Update documentation and coverage metrics

### CI/CD Improvements
- testnet execution optimization
- Parallel execution expansion
- Enhanced security scanning
- Performance regression testing

---

**Note**: This comprehensive test suite executes on devnet and testnet only. mainnet execution is never performed. Production environment operations require manual verification.

For Japanese documentation, see [Ja_README.md](./Ja_README.md) and [Ja_Test_Matrix.md](./Ja_Test_Matrix.md).