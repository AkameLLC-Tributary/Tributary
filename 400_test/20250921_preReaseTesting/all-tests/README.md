# Tributary Test Suite - GitHub Public Version

This directory contains the test files for the Tributary token distribution CLI tool, organized by test phases and categories. All sensitive information has been masked with placeholder values for public GitHub distribution.

## Directory Structure

### Basic CLI Functions (Phase 1: T001-T030)
Tests fundamental CLI operations and core functionality:

- **T001-T005**: Core initialization and configuration tests
  - T001: Basic initialization
  - T002: Configuration show functionality
  - T003: Force overwrite functionality
  - T004: Invalid parameters validation
  - T005: Network-specific initialization

- **T010-T030**: Extended CLI testing
  - T010: Token 2022 fixes and re-testing
  - T020: Basic distribution simulation
  - T030: Dry run execution functionality

### Integration Testing (Phase 2: T031+)
Tests real distribution scenarios and end-to-end functionality:

- **T031**: Small distribution test with actual token execution

## Configuration Required

Before running these tests, you need to replace the following placeholders with your actual values:

### Required Replacements

1. **Token Addresses**:
   - `YOUR_TOKEN_ADDRESS_HERE` → Your actual token address for collection testing
   - `YOUR_DISTRIBUTION_TOKEN_ADDRESS_HERE` → Token address for distribution testing

2. **Wallet Addresses**:
   - `YOUR_ADMIN_WALLET_ADDRESS_HERE` → Your admin wallet public key

3. **Private Keys** (for execution tests):
   - `YOUR_PRIVATE_KEY_HERE` → Your private key (base58 encoded)

4. **CLI Path**:
   - `./path/to/your/cli.js` → Path to your tributary CLI executable

## Test Categories

### Phase 1: Basic CLI Functions (T001-T030)
- ✅ Core initialization and configuration
- ✅ Parameter validation and error handling
- ✅ Network configuration testing
- ✅ Simulation and dry-run functionality

### Phase 2: Integration Testing (T031+)
- ✅ Real token distribution (with test tokens)
- ✅ End-to-end workflow validation
- ✅ Production-ready testing scenarios

## Safety Notes

⚠️ **Important Security Considerations**:

1. **Never commit real private keys** to version control
2. **Use test tokens only** for actual distribution tests
3. **Always test with dry-run first** before real distributions
4. **Verify all addresses** before executing distribution commands

## Usage Instructions

1. **Setup**: Replace all placeholder values with your actual configuration
2. **Test Environment**: Ensure you're using testnet/devnet for testing
3. **Dependencies**: Install required Node.js packages (`bs58`, etc.)
4. **Execution**: Run individual test files or use the comprehensive test runner

## Test Execution Examples

```bash
# Run individual tests
node test-t001-only.js
node t020-basic-distribution-simulation-test.js

# For integration tests
node t031-small-distribution-test.js
```

## Contributing

When adding new tests:
1. Follow the existing naming convention (T### format)
2. Mask all sensitive information
3. Include comprehensive error handling
4. Add appropriate documentation
5. Categorize tests into correct phase directories

## License

These test files are provided as examples for the Tributary project. Ensure compliance with your project's license terms.