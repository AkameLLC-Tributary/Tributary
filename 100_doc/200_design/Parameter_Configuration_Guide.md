# Parameter Configuration Guide
# Tributary - Solana Reward Distribution System

## Overview

Tributary CLI supports flexible parameter configuration to accommodate various user environments and requirements. All previously hardcoded values can now be configured through multiple methods.

## Configuration Priority

Parameters are loaded in the following priority order (higher priority first):

1. **CLI Arguments** (Highest Priority)
2. **Environment Variables**
3. **Configuration File** (`tributary-parameters.json`)
4. **Default Values** (Lowest Priority)

## Configuration Methods

### 1. Environment Variables

Set environment variables with the `TRIBUTARY_` prefix:

```bash
# Network configuration
export TRIBUTARY_DEFAULT_NETWORK=mainnet-beta
export TRIBUTARY_NETWORK_TIMEOUT=45000
export TRIBUTARY_MAX_RETRIES=5

# RPC endpoints
export TRIBUTARY_DEVNET_RPC=https://your-custom-devnet-rpc.com
export TRIBUTARY_MAINNET_RPC=https://your-custom-mainnet-rpc.com

# Distribution settings
export TRIBUTARY_BATCH_SIZE=20

# Logging
export TRIBUTARY_LOG_LEVEL=debug
export TRIBUTARY_LOG_DIR=/var/log/tributary
```

### 2. Configuration File

Create a `tributary-parameters.json` file in your project directory:

```bash
# Copy the example file from Tributary CLI installation directory
cp tributary-parameters.example.json tributary-parameters.json

# Edit the configuration
vim tributary-parameters.json
```

You can also specify a custom configuration file location:

```bash
export TRIBUTARY_PARAMETERS_FILE=/path/to/your/config.json
```

### 3. CLI Options

Many parameters can be overridden via CLI options:

```bash
tributary init --name MyProject --network mainnet-beta
tributary distribute --batch-size 25
```

## Configuration Categories

### Network Settings

- **defaultNetwork**: Default network for new projects (`devnet`/`testnet`/`mainnet-beta`)
- **timeout**: Network request timeout in milliseconds
- **maxRetries**: Maximum retry attempts for failed requests
- **retryDelay**: Delay between retries in milliseconds
- **confirmationTimeout**: Transaction confirmation timeout
- **commitment**: Transaction commitment level

### RPC Endpoints

- **endpoints**: Primary RPC endpoints for each network
- **fallbackEndpoints**: Backup endpoints in case primary fails

### Distribution Settings

- **defaultBatchSize**: Default number of recipients per batch
- **maxBatchSize**: Maximum allowed batch size
- **batchDelayMs**: Delay between batches
- **estimatedGasPerTransaction**: Estimated SOL cost per transaction
- **riskThresholds**: Thresholds for warnings (large amounts, many recipients, etc.)

### Token Settings

- **defaultDecimals**: Default decimal places for tokens
- **fallbackDecimals**: Fallback if detection fails
- **minimumBalance**: Minimum balance required for distribution

### Cache Settings

- **defaultTtlSeconds**: Default cache duration
- **walletCacheTtlSeconds**: Wallet data cache duration
- **configCacheTtlSeconds**: Configuration cache duration

### Logging Settings

- **defaultLevel**: Default log level (`error`/`warn`/`info`/`debug`)
- **defaultDir**: Log directory path
- **enableConsole**: Enable console logging
- **enableFile**: Enable file logging
- **maxFiles**: Maximum log files to keep
- **maxFileSize**: Maximum size per log file

### Security Settings

- **defaultKeyEncryption**: Enable key encryption by default
- **defaultBackupEnabled**: Enable backup by default
- **defaultAuditLog**: Enable audit logging by default

## Usage Examples

### Production Environment

```json
{
  "network": {
    "defaultNetwork": "mainnet-beta",
    "timeout": 45000,
    "maxRetries": 5
  },
  "distribution": {
    "defaultBatchSize": 5,
    "batchDelayMs": 500
  },
  "logging": {
    "defaultLevel": "warn",
    "enableConsole": false,
    "enableFile": true
  },
  "security": {
    "defaultKeyEncryption": true,
    "defaultBackupEnabled": true,
    "defaultAuditLog": true
  }
}
```

### Development Environment

```json
{
  "network": {
    "defaultNetwork": "devnet",
    "timeout": 30000,
    "maxRetries": 2
  },
  "distribution": {
    "defaultBatchSize": 20,
    "batchDelayMs": 50
  },
  "logging": {
    "defaultLevel": "debug",
    "enableConsole": true,
    "enableFile": true
  }
}
```

### High-Volume Distribution

```json
{
  "distribution": {
    "defaultBatchSize": 50,
    "maxBatchSize": 100,
    "batchDelayMs": 25,
    "riskThresholds": {
      "largeRecipientCountThreshold": 5000
    }
  },
  "cache": {
    "walletCacheTtlSeconds": 3600
  }
}
```

## Detailed Initialization Settings

Additional parameters can be specified during initialization:

```bash
tributary init \
  --name MyProject \
  --token So11111111111111111111111111111111111111112 \
  --admin 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU \
  --network mainnet-beta \
  --batch-size 25 \           # Specify batch size
  --network-timeout 45000 \   # Specify network timeout
  --max-retries 5 \           # Specify max retries
  --log-level debug \         # Specify log level
  --disable-encryption \      # Disable encryption
  --disable-backup \          # Disable backup
  --disable-audit \           # Disable audit logging
  --devnet-rpc https://custom-devnet.com \    # Custom devnet RPC
  --testnet-rpc https://custom-testnet.com \  # Custom testnet RPC
  --mainnet-rpc https://custom-mainnet.com    # Custom mainnet RPC
```

## Migration from Hardcoded Values

Mapping of previously hardcoded values to new configuration options:

| Old Hardcoded Value | New Configuration Path |
|---------------------|------------------------|
| `'devnet'` | `network.defaultNetwork` |
| `30000` (timeout) | `network.timeout` |
| `3` (max retries) | `network.maxRetries` |
| `10` (batch size) | `distribution.defaultBatchSize` |
| `'info'` (log level) | `logging.defaultLevel` |
| `'./logs'` | `logging.defaultDir` |
| RPC URLs | `rpc.endpoints.*` |

## Validation

Tributary CLI will validate your configuration and warn about:

- Invalid network names
- Out-of-range numeric values
- Missing required settings
- Potential performance issues

Run `tributary config validate` to check your configuration.

## Best Practices

1. **Use environment variables** for sensitive data like custom RPC URLs
2. **Use configuration files** for environment-specific settings
3. **Start with defaults** and only override what you need
4. **Test configurations** in development before production use
5. **Version control** your configuration files (excluding sensitive data)
6. **Monitor performance** and adjust batch sizes and timeouts accordingly

## Troubleshooting

- Configuration not loading: Check file path and JSON syntax
- Environment variables ignored: Ensure correct `TRIBUTARY_` prefix
- Performance issues: Adjust batch sizes and delays
- RPC failures: Configure fallback endpoints

For more help, run `tributary --help` or check the documentation.