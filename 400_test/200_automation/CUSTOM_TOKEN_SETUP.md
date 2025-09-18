# Custom Token Setup Guide
# Using Your Own SPL Tokens for Tributary Testing

**Last Updated**: 2025-09-18
**Updated By**: akameGusya

## Overview

Due to severe limitations with Solana testnet faucets (maximum 5 SOL per 8 hours, often unavailable), using custom SPL tokens is the **recommended approach** for comprehensive Tributary testing. This guide explains how to configure and use your own tokens.

## 🎯 Why Custom Tokens Are Better

### ✅ Advantages of Custom Tokens
- **Unlimited Supply**: Create as many tokens as needed for testing
- **Always Available**: No dependency on unreliable faucets
- **Full Control**: Complete control over token distribution
- **Realistic Testing**: Tests actual SPL token functionality
- **Consistent Results**: Reproducible test conditions
- **Zero External Dependencies**: No waiting for faucet availability

### ❌ Problems with testnet SOL
- **Faucet Limitations**: 5 SOL per 8 hours maximum
- **Frequent Unavailability**: Faucets often empty or restricted
- **Insufficient for Testing**: Need 20+ SOL for comprehensive tests
- **Time Consuming**: May take days to accumulate needed amounts
- **Unreliable**: Cannot guarantee availability when needed

## 🔧 Custom Token Configuration

### Step 1: Prepare Your Token Information

Collect the following information about your custom SPL token:

```json
{
  "tokenName": "YourTestToken",
  "tokenSymbol": "YTT",
  "tokenAddress": "YourTokenMintAddressHere",
  "decimals": 9,
  "totalSupply": 1000000000,
  "network": "testnet"
}
```

### Step 2: Update Test Configuration

#### Option A: Environment Variables
```bash
# Set your custom token as the test token
export CUSTOM_TEST_TOKEN="YourTokenMintAddressHere"
export TEST_TOKEN_SYMBOL="YTT"
export TEST_TOKEN_DECIMALS="9"
export TEST_TOKEN_NAME="YourTestToken"
```

#### Option B: Configuration File
Create `custom-token-config.json`:
```json
{
  "testToken": {
    "address": "YourTokenMintAddressHere",
    "symbol": "YTT",
    "name": "YourTestToken",
    "decimals": 9,
    "network": "testnet"
  },
  "testAmounts": {
    "micro": 0.1,
    "small": 1.0,
    "medium": 10.0,
    "large": 100.0
  },
  "safetyLimits": {
    "maxAmountPerTest": 1000,
    "maxRecipientsPerTest": 50
  }
}
```

### Step 3: Update Test Runner

Modify the test configuration in `comprehensive-test-runner.js`:

```javascript
// In comprehensive-test-runner.js
constructor() {
  super();
  this.customTokenConfig = {
    useCustomToken: true,
    tokenAddress: process.env.CUSTOM_TEST_TOKEN || "YourTokenMintAddressHere",
    tokenSymbol: process.env.TEST_TOKEN_SYMBOL || "YTT",
    tokenDecimals: parseInt(process.env.TEST_TOKEN_DECIMALS) || 9,
    tokenName: process.env.TEST_TOKEN_NAME || "YourTestToken"
  };

  // Update safety limits for custom tokens
  this.config.safetyLimits = {
    maxTotalAmount: 10000,        // Increased for custom tokens
    maxSingleAmount: 1000,        // Increased for custom tokens
    maxRecipients: 100,           // Increased for custom tokens
    minBalance: 50                // Reduced requirement
  };
}
```

## 🧪 Modified Test Scenarios

### Updated Distribution Tests

```javascript
// Modified real distribution tests for custom tokens
const distributionTests = [
  { id: 'RD001', name: 'Micro distribution (1 YTT)', amount: 1, recipients: 2 },
  { id: 'RD002', name: 'Small distribution (10 YTT)', amount: 10, recipients: 5 },
  { id: 'RD003', name: 'Medium distribution (100 YTT)', amount: 100, recipients: 10 },
  { id: 'RD004', name: 'Large distribution (1000 YTT)', amount: 1000, recipients: 20 },
  { id: 'RD005', name: 'Batch distribution (500 YTT)', amount: 500, recipients: 25, batchSize: 5 }
];
```

### Updated Test Commands

```bash
# Use custom token in test commands
tributary distribute execute \
  --amount 100 \
  --token "YourTokenMintAddressHere" \
  --network testnet \
  --wallet-file "./admin-keypair.json" \
  --batch-size 5 \
  --confirm
```

## 📊 Token Requirements

### Minimum Token Supply for Testing

| Test Phase | Token Amount Needed | Purpose |
|------------|-------------------|---------|
| Phase 1 | 0 tokens | Basic function tests (no real distribution) |
| Phase 2 | 0 tokens | Integration tests (simulation only) |
| Phase 3 | 0 tokens | Performance tests (simulation only) |
| Phase 4 | 0 tokens | Production preparation (validation only) |
| Phase 5 | 0 tokens | Advanced features (mostly simulation) |
| Phase 6 | 2,000+ tokens | Real distribution tests |
| **Total** | **2,000+ tokens** | **For complete test coverage** |

### Recommended Token Distribution

```javascript
{
  "adminWallet": 10000,      // Main test wallet
  "testRecipients": 5000,    // Pre-fund test recipients
  "emergencyReserve": 2000,  // For unexpected tests
  "totalRecommended": 17000
}
```

## 🔄 Integration Steps

### Step 1: Update Test Setup Script

Modify `setup.js` to handle custom tokens:

```javascript
async setupCustomTokenEnvironment() {
  console.log('🪙 Setting up custom token environment...');

  const tokenConfig = {
    address: process.env.CUSTOM_TEST_TOKEN,
    symbol: process.env.TEST_TOKEN_SYMBOL,
    decimals: parseInt(process.env.TEST_TOKEN_DECIMALS),
    name: process.env.TEST_TOKEN_NAME
  };

  if (!tokenConfig.address) {
    console.log('⚠️ No custom token configured. Using default SOL configuration.');
    return;
  }

  console.log(`✅ Custom token configured: ${tokenConfig.name} (${tokenConfig.symbol})`);
  console.log(`📍 Token address: ${tokenConfig.address}`);

  // Validate token exists on testnet
  await this.validateCustomToken(tokenConfig);
}
```

### Step 2: Update Distribution Functions

Modify real distribution tests to use custom tokens:

```javascript
async executeCustomTokenDistribution(test, recipients) {
  const tokenAddress = this.customTokenConfig.tokenAddress;
  const command = [
    'tributary distribute execute',
    `--amount ${test.amount}`,
    `--token "${tokenAddress}"`,
    `--network testnet`,
    `--wallet-file "${this.adminWalletPath}"`,
    `--recipients-file "${this.recipientFile}"`,
    test.batchSize ? `--batch-size ${test.batchSize}` : '',
    '--confirm',
    '--real-distribution'
  ].filter(Boolean).join(' ');

  console.log(`🚀 Executing custom token distribution: ${command}`);
  return await this.executeDistribution(command);
}
```

### Step 3: Update Safety Validations

```javascript
async validateCustomTokenBalance() {
  console.log('💰 Checking custom token balance...');

  const tokenAddress = this.customTokenConfig.tokenAddress;
  const adminWallet = this.adminWalletAddress;

  // Check token account balance
  const balance = await this.getTokenAccountBalance(adminWallet, tokenAddress);

  if (balance < this.config.safetyLimits.minBalance) {
    throw new Error(`Insufficient custom token balance: ${balance} ${this.customTokenConfig.symbol} (required: ${this.config.safetyLimits.minBalance})`);
  }

  console.log(`✅ Custom token balance: ${balance} ${this.customTokenConfig.symbol} (sufficient)`);
  return balance;
}
```

## 🚀 Execution Instructions

### Quick Start with Custom Tokens

1. **Set Environment Variables**:
```bash
export CUSTOM_TEST_TOKEN="YourTokenMintAddressHere"
export TEST_TOKEN_SYMBOL="YTT"
export TEST_TOKEN_DECIMALS="9"
export TEST_TOKEN_NAME="YourTestToken"
```

2. **Run Setup**:
```bash
cd 400_test/200_automation
npm install
node setup.js
```

3. **Execute Tests**:
```bash
# Comprehensive tests with custom tokens
npm run test:comprehensive

# Real distribution with custom tokens
npm run test:real-distribution

# All tests including real distribution
npm run test:all
```

### Verification Commands

```bash
# Verify custom token configuration
echo "Token: $CUSTOM_TEST_TOKEN"
echo "Symbol: $TEST_TOKEN_SYMBOL"
echo "Decimals: $TEST_TOKEN_DECIMALS"

# Test token balance check
tributary collect --token "$CUSTOM_TEST_TOKEN" --threshold 0.1 --network testnet --dry-run
```

## 📋 Benefits Summary

| Aspect | testnet SOL | Custom Tokens |
|--------|-------------|---------------|
| **Availability** | ❌ Limited/Unreliable | ✅ Always Available |
| **Supply** | ❌ 5 SOL/8 hours | ✅ Unlimited |
| **Control** | ❌ External dependency | ✅ Full Control |
| **Testing Scope** | ❌ Very Limited | ✅ Comprehensive |
| **Reliability** | ❌ Unpredictable | ✅ Consistent |
| **Setup Time** | ❌ Days/Weeks | ✅ Minutes |
| **Cost** | ❌ Time-expensive | ✅ Zero cost |

## 🎯 Conclusion

Using custom SPL tokens is not just a workaround—it's a **superior testing approach** that provides:

- **Unlimited testing capability**
- **Reliable and consistent results**
- **Complete control over test conditions**
- **Zero dependency on external faucets**
- **Realistic SPL token functionality testing**

This approach enables comprehensive testing that would be impossible with the limited and unreliable testnet SOL faucets.

For Japanese version, see [Ja_Custom_Token_Setup.md](./Ja_Custom_Token_Setup.md)