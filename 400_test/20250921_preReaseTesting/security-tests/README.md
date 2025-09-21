# Tributary CLI Security Test Suite

A comprehensive security testing framework for the Tributary CLI application, covering all major security domains including input validation, injection prevention, access control, and vulnerability scanning.

## Overview

This test suite implements **11 comprehensive security tests (T210-T220)** designed to validate the security posture of the Tributary CLI application. The tests are organized into logical categories and include both automated vulnerability detection and security best practice verification.

## Test Categories

### 🔍 Input Validation
- **T210**: Input Sanitization Tests
- **T214**: Environment Variable Validation

### 🛡️ Injection Prevention
- **T211**: SQL Injection Prevention
- **T212**: Command Injection Prevention
- **T213**: Path Traversal Prevention

### 🔐 Access Control
- **T215**: Configuration Tampering Detection
- **T216**: Sensitive Data Exposure Prevention
- **T217**: Audit Trail Verification
- **T218**: Access Control Validation
- **T219**: Cryptographic Operation Validation

### 🚨 Vulnerability Scanning
- **T220**: Vulnerability Scanning Simulation

## Test Details

### T210: Input Sanitization Tests
- **Purpose**: Validates input sanitization against XSS, command injection, SQL injection, and path traversal attacks
- **Coverage**: 7 malicious input types, normal input acceptance, configuration command security
- **Output**: Multi-layer protection analysis with system-level and application-level security scoring

### T211: SQL Injection Prevention
- **Purpose**: Tests resilience against SQL injection attacks
- **Coverage**: Classic SQL drops, tautology attacks, insert injections, union-based attacks, command execution attempts
- **Output**: Protection rate percentage and attack vector analysis

### T212: Command Injection Prevention
- **Purpose**: Validates protection against command injection attacks
- **Coverage**: Semicolon injection, command substitution, backtick execution, conditional execution, pipe commands
- **Output**: Comprehensive injection resistance analysis with detailed protection levels

### T213: Path Traversal Prevention
- **Purpose**: Tests file system access restrictions and path validation
- **Coverage**: Unix/Windows path traversal, absolute path access, URL encoding, mixed separators
- **Output**: Path security analysis across multiple attack categories

### T214: Environment Variable Validation
- **Purpose**: Validates handling of malicious environment variables
- **Coverage**: Command injection via env vars, TRIBUTARY_ prefixed variables, environment sanitization
- **Output**: Environment variable handling safety assessment

### T215: Configuration Tampering Detection
- **Purpose**: Tests detection of configuration file tampering and malicious modifications
- **Coverage**: Invalid TOML, script injection, path traversal configs, binary data injection
- **Output**: Tampering detection rate and output safety analysis

### T216: Sensitive Data Exposure Prevention
- **Purpose**: Validates prevention of sensitive data leaks in outputs, logs, and error messages
- **Coverage**: Configuration display masking, log file security, error message safety, network transmission
- **Output**: Data protection rate and exposure risk assessment

### T217: Audit Trail Verification
- **Purpose**: Tests audit logging capabilities and trail completeness
- **Coverage**: Log infrastructure, content verification, retention policies, trail completeness
- **Output**: Comprehensive audit capability assessment

### T218: Access Control Validation
- **Purpose**: Tests access control mechanisms and authorization
- **Coverage**: Admin operations, file permissions, command authorization, wallet access, security policies
- **Output**: Access control score and authorization analysis

### T219: Cryptographic Operation Validation
- **Purpose**: Validates cryptographic address validation and security
- **Coverage**: Valid address validation, invalid token/wallet rejection, Base58 validation, length checking
- **Output**: Cryptographic validation score and security settings analysis

### T220: Vulnerability Scanning Simulation
- **Purpose**: Tests resilience against various vulnerability attacks
- **Coverage**: Buffer overflow, format string attacks, memory corruption, unicode attacks
- **Output**: Vulnerability resistance score across multiple attack vectors

## Prerequisites

Before running the tests, ensure you have:

1. **Node.js** (version 12 or higher)
2. **Tributary CLI** application built and accessible
3. **Test Environment** with appropriate permissions
4. **Configuration Values** (see Configuration section below)

## Configuration

**IMPORTANT**: Before running any tests, you must update the configuration in each test file:

1. Replace `YOUR_TOKEN_ADDRESS_HERE` with your actual token address
2. Replace `YOUR_ADMIN_WALLET_ADDRESS_HERE` with your actual admin wallet address
3. Update `./path/to/your/cli.js` with the correct path to your Tributary CLI executable
4. Verify the network setting matches your test environment

### Example Configuration Update

```javascript
const config = {
    targetToken: '4kmRpPn15Wn8Kgn65MLEMP291RLmV9wVX4ihBwNWbyvJ', // Your actual token
    adminWallet: 'D8zGvbM3w6bcAsnfWcZnWEz2GLeK7LPVftqwsMDCkcHk', // Your actual wallet
    network: 'testnet',
    cliPath: '../../../200_src/dist/cli.js' // Correct path to your CLI
};
```

## Usage

### Running All Tests

Execute the complete security test suite:

```bash
npm install
node run-all-security-tests.js
```

### Running Individual Tests

Execute specific test categories:

```bash
# Input validation tests
node input-validation/t210-input-sanitization-test.js
node input-validation/t214-environment-validation-test.js

# Injection prevention tests
node injection-prevention/t211-sql-injection-test.js
node injection-prevention/t212-command-injection-test.js
node injection-prevention/t213-path-traversal-test.js

# Access control tests
node access-control/t215-config-tampering-test.js
node access-control/t216-data-exposure-test.js
node access-control/t217-audit-trail-test.js
node access-control/t218-access-control-test.js
node access-control/t219-cryptographic-validation-test.js

# Vulnerability scanning tests
node vulnerability-scanning/t220-vulnerability-scanning-test.js
```

## Output and Reporting

### Test Output Format

Each test provides:
- **Real-time progress** with detailed step-by-step execution
- **Security analysis** with protection rates and vulnerability assessments
- **Categorized results** with pass/fail status for each security domain
- **Detailed recommendations** for security improvements

### Security Report

The comprehensive test runner generates:
- **Overall security score** across all test categories
- **Category breakdown** showing performance per security domain
- **Individual test results** with execution times and status
- **Security level assessment** (EXCELLENT/GOOD/MODERATE/WEAK)
- **Actionable recommendations** for security improvements

### Example Output

```
🔒 COMPREHENSIVE SECURITY TEST REPORT
================================================================================
📅 Test Run: 2024-01-XX - Total Duration: 45.2s
🧪 Tests Executed: 11

📊 OVERALL STATISTICS
========================================
✅ Successful Tests: 10/11 (90.9%)
❌ Failed Tests: 1/11

🛡️ SECURITY ASSESSMENT
========================================
🟢 Overall Security Level: EXCELLENT
   Your CLI application demonstrates robust security practices
   across all tested categories.
```

## Security Domains Tested

| Domain | Tests | Coverage |
|--------|-------|----------|
| **Input Validation** | T210, T214 | XSS, Command Injection, SQL Injection, Path Traversal, Environment Variables |
| **Injection Prevention** | T211, T212, T213 | SQL, Command, and Path Traversal injection attacks |
| **Access Control** | T215-T219 | Configuration security, data exposure, audit trails, access validation, cryptography |
| **Vulnerability Scanning** | T220 | Buffer overflow, format string, memory corruption, unicode attacks |

## Best Practices

### Test Environment

1. **Isolated Environment**: Run tests in an isolated environment to prevent interference with production systems
2. **Test Data**: Use test-specific tokens and wallets, never production credentials
3. **Network Isolation**: Use testnet or isolated network environments
4. **Resource Monitoring**: Monitor system resources during vulnerability tests

### Security Considerations

1. **Credential Management**: Never commit real credentials to version control
2. **Test Isolation**: Each test creates its own isolated environment
3. **Cleanup**: Tests clean up temporary files and configurations
4. **Logging**: Comprehensive logging for security analysis and debugging

## Troubleshooting

### Common Issues

1. **Configuration Errors**: Ensure all placeholder values are replaced with actual configuration
2. **Path Issues**: Verify the CLI path is correct and executable
3. **Permission Errors**: Ensure proper file system permissions for test execution
4. **Network Timeouts**: Some tests may timeout due to network issues - this is often expected behavior

### Debug Mode

Enable verbose output by setting environment variables:

```bash
DEBUG=true node run-all-security-tests.js
```

## Contributing

When adding new security tests:

1. Follow the existing test structure and naming conventions
2. Include comprehensive documentation and comments
3. Mask all sensitive values with placeholder constants
4. Provide detailed output analysis and recommendations
5. Update this README with test descriptions

## Security Disclaimer

These tests are designed to validate security implementations and may trigger security monitoring systems. Only run these tests on systems you own or have explicit permission to test. The tests include simulated attack vectors for validation purposes only.

## License

This security test suite is provided as-is for testing and validation purposes. Use responsibly and in accordance with applicable laws and regulations.

---

**Note**: This test suite is designed specifically for the Tributary CLI application and may require modifications for use with other applications. Always review and understand test code before execution in any environment.