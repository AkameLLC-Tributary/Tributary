# Test Parameters Specification
# Tributary - Solana Reward Distribution System

**Last Updated**: 2025-09-18
**Updated By**: akameGusya

## Overview
This document defines specific parameter values and configurations required for test execution of the Tributary system. It provides standard parameter sets that enable reproducible and systematic test execution.

## Environment-Specific Parameters

### 1. devnet Environment Parameters

#### 1.1 Basic Configuration
```toml
[project]
name = "TributaryDevTest"
network = "devnet"

[token]
base_token = "So11111111111111111111111111111111111111112"  # Wrapped SOL
admin_wallet = "Test admin wallet"

[distribution]
auto_distribute = false
minimum_balance = 0.1
batch_size = 5

[security]
key_encryption = false  # Simplified for testing
backup_enabled = true
audit_log = true
```

#### 1.2 Test Token Addresses
| Token Name | Address | Purpose |
|------------|---------|---------|
| Wrapped SOL | `So11111111111111111111111111111111111111112` | Base token |
| USDC (devnet) | `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr` | Distribution testing |
| Test Token | To be created | Custom token testing |

### 2. testnet Environment Parameters

#### 2.1 Basic Configuration
```toml
[project]
name = "TributaryTestnetTest"
network = "testnet"

[token]
base_token = "So11111111111111111111111111111111111111112"
admin_wallet = "Test admin wallet"

[distribution]
auto_distribute = false
minimum_balance = 0.5
batch_size = 10

[security]
key_encryption = true
backup_enabled = true
audit_log = true
```

### 3. mainnet Environment Parameters (Configuration Validation Only)

#### 3.1 Basic Configuration (Validation only, no execution)
```toml
[project]
name = "TributaryMainnetConfig"
network = "mainnet-beta"

[token]
base_token = "So11111111111111111111111111111111111111112"
admin_wallet = "Production admin wallet"

[distribution]
auto_distribute = false
minimum_balance = 1.0
batch_size = 10

[security]
key_encryption = true
backup_enabled = true
audit_log = true
```

**Note**: This configuration is used only for validation in devnet environment and will not be executed on mainnet.

## Test Case Specific Parameters

### T001: Basic Initialization Command
```bash
tributary init \
  --name "BasicInitTest" \
  --token "So11111111111111111111111111111111111111112" \
  --admin "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" \
  --network devnet
```

### T002: Interactive Mode Initialization
```bash
tributary init --interactive
# Input values:
# - Project name: InteractiveTest
# - Base token: So11111111111111111111111111111111111111112
# - Admin wallet: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
# - Network: devnet
```

### T010: SOL Token Holder Collection
```bash
tributary collect \
  --token "So11111111111111111111111111111111111111112" \
  --threshold 0.1 \
  --network testnet \
  --output-file "test_holders.json"
```

### T011: Threshold-based Filtering
```bash
# Threshold-specific test parameters
# Low threshold: --threshold 0.01  (many holders)
# Medium threshold: --threshold 1.0   (moderate holders)
# High threshold: --threshold 10.0  (few holders)
```

### T020: Basic Distribution Simulation
```bash
tributary distribute simulate \
  --amount 100 \
  --token "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr" \
  --network testnet
```

### T030: Dry Run Execution
```bash
tributary distribute execute \
  --amount 10 \
  --token "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr" \
  --network testnet \
  --dry-run \
  --batch-size 3
```

### T031: Small Amount Real Distribution
```bash
tributary distribute execute \
  --amount 1.0 \
  --token "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr" \
  --network testnet \
  --wallet-file "./test-keypair.json" \
  --batch-size 5 \
  --confirm
```

## Error Testing Parameters

### T004: Invalid Parameter Errors
```bash
# Invalid project name
tributary init --name "" --token "invalid" --admin "invalid"

# Invalid token address
tributary init --name "Test" --token "invalidaddress" --admin "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"

# Invalid wallet address
tributary init --name "Test" --token "So11111111111111111111111111111111111111112" --admin "invalidwallet"
```

### T060: Invalid Token Address
```bash
tributary collect --token "ThisIsNotAValidTokenAddress123456789"
```

### T061: Insufficient Balance Error
```bash
# Test with distribution amount exceeding available balance
tributary distribute execute \
  --amount 999999 \
  --token "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr" \
  --network testnet
```

## Performance Testing Parameters

### T070: 1000 Wallet Collection Time
```bash
tributary collect \
  --token "So11111111111111111111111111111111111111112" \
  --threshold 0.001 \
  --max-holders 1000 \
  --network testnet \
  --cache false
```

### T071: 100 Distribution Processing Time
```bash
# Prepare 100 test recipient wallets in advance
tributary distribute execute \
  --amount 100 \
  --token "TestTokenAddress" \
  --network testnet \
  --batch-size 20
```

## Security Testing Parameters

### T080: Private Key File Loading
```bash
# Valid private key file
tributary distribute execute \
  --amount 1 \
  --wallet-file "./valid-keypair.json" \
  --network devnet
```

### T081: Invalid Private Key Error
```bash
# Corrupted private key file
tributary distribute execute \
  --amount 1 \
  --wallet-file "./invalid-keypair.json" \
  --network devnet
```

## Test Datasets

### 1. Test Wallet List
```json
{
  "test_wallets": [
    {
      "name": "admin",
      "address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "role": "administrator",
      "network": "devnet"
    },
    {
      "name": "recipient_1",
      "address": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      "role": "recipient",
      "network": "devnet"
    },
    {
      "name": "recipient_2",
      "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
      "role": "recipient",
      "network": "devnet"
    }
  ]
}
```

### 2. Expected Results Data
```json
{
  "expected_results": {
    "T001": {
      "exit_code": 0,
      "config_file_created": true,
      "project_name": "BasicInitTest"
    },
    "T010": {
      "exit_code": 0,
      "min_holders": 1,
      "output_format": "json"
    },
    "T020": {
      "exit_code": 0,
      "simulation_fields": ["estimatedGasCost", "estimatedDuration", "distributionBreakdown"]
    }
  }
}
```

## Environment Variable Configuration

### Development Environment
```bash
export TRIBUTARY_CONFIG="./test-config.toml"
export TRIBUTARY_LOG_LEVEL="debug"
export TRIBUTARY_NETWORK="devnet"
export SOLANA_RPC_URL="https://api.devnet.solana.com"
```

### Test Environment
```bash
export TRIBUTARY_CONFIG="./testnet-config.toml"
export TRIBUTARY_LOG_LEVEL="info"
export TRIBUTARY_NETWORK="testnet"
export SOLANA_RPC_URL="https://api.testnet.solana.com"
```

### Production Test Environment
```bash
export TRIBUTARY_CONFIG="./mainnet-config.toml"
export TRIBUTARY_LOG_LEVEL="warn"
export TRIBUTARY_NETWORK="mainnet-beta"
export SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
```

## Test Execution Time Estimates

| Test Phase | Expected Execution Time | Notes |
|------------|------------------------|-------|
| Phase 1 (devnet basic functions) | 30 minutes | Configuration and basic commands |
| Phase 2 (testnet integration) | 2 hours | Including network processing |
| Phase 3 (performance) | 1 hour | Large data processing |
| Phase 4 (mainnet migration) | 30 minutes | Small amount verification |
| **Total** | **4 hours** | Manual execution |

## Resource Requirements

### Minimum Requirements
- **SOL Balance**: devnet 5 SOL, testnet 10 SOL
- **Memory**: 512MB
- **Disk**: 100MB (including logs and cache)

### Recommended Requirements
- **SOL Balance**: devnet 10 SOL, testnet 20 SOL
- **Memory**: 1GB
- **Disk**: 500MB (including detailed logs and backups)