# Parameter Management System Detailed Design
# Tributary - Solana Reward Distribution System

## Overview

This document defines the detailed design of the parameter management system for Tributary CLI. It eliminates traditional hardcoded values and implements a flexible, hierarchical configuration system to accommodate diverse environments and user needs.

## 1. Design Objectives

### 1.1 Primary Goals
- **Environmental Adaptability**: Flexible operation across development, staging, and production environments
- **User Control**: Safe design that prioritizes explicit user intent
- **Operational Efficiency**: Easy configuration changes and simplified management
- **Backward Compatibility**: Gradual migration without breaking existing behavior

### 1.2 Problem Resolution
- **Legacy Issue**: Inflexibility of hardcoded default values in Zod schemas
- **Priority Ambiguity**: Unclear precedence between user input, environment variables, and config files
- **Configuration Difficulty**: Complex environment-specific configuration changes

## 2. Parameter Priority Architecture

### 2.1 Priority Definition

```
1. CLI Arguments (Highest Priority) ←─ Explicit User Intent
2. Environment Variables            ←─ Environment-Specific Settings
3. Configuration File               ←─ Project-Specific Settings
4. Default Values (Lowest Priority) ←─ System Standard Values
```

### 2.2 Priority Design Rationale

#### Why CLI Arguments Have Highest Priority
1. **Explicit User Intent**: Values explicitly specified by users at runtime
2. **Immediate Control**: Safety assurance for emergency or temporary configuration changes
3. **Test Reliability**: Deterministic value control in automated testing
4. **Debug Support**: Temporary configuration changes during problem investigation

```bash
# Example: User explicitly sets batch size to 1
tributary distribute --batch-size 1
# → This 1 will never be overridden by other values
```

#### Why Environment Variables Have Second Priority
1. **Environment Separation**: Automatic configuration switching between dev/staging/production
2. **Security**: Safe management of sensitive information (RPC URLs, etc.)
3. **Operational Efficiency**: Dynamic configuration changes in CI/CD pipelines
4. **Container Support**: Standard configuration method for Docker and cloud environments

```bash
# Example: Production environment variable configuration
export TRIBUTARY_DEFAULT_NETWORK=mainnet-beta
export TRIBUTARY_MAINNET_RPC=https://premium-rpc.example.com
```

#### Why Configuration Files Have Third Priority
1. **Project Specificity**: Definition of standard configurations per project
2. **Version Control**: Configuration history management with Git
3. **Team Sharing**: Configuration sharing among development team members
4. **Complex Configuration**: Structured management of multiple parameters

```json
{
  "distribution": {"defaultBatchSize": 20},
  "network": {"timeout": 45000},
  "rpc": {"endpoints": {"mainnet-beta": "https://team-rpc.example.com"}}
}
```

#### Why Default Values Have Lowest Priority
1. **Fallback**: Safe operation guarantee when no other configurations exist
2. **Initial Experience**: Minimize learning costs for new users
3. **Stability**: Ensure consistency of basic system behavior

## 3. System Architecture

### 3.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CLI Interface Layer                      │
├─────────────────────────────────────────────────────────────┤
│                Parameter Resolution Layer                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────│
│  │ CLI Args    │ │ Env Vars    │ │ Config File │ │ Defaults││
│  │ (Priority 1)│ │ (Priority 2)│ │ (Priority 3)│ │(Priority││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────│
├─────────────────────────────────────────────────────────────┤
│              Parameter Validation Layer                     │
├─────────────────────────────────────────────────────────────┤
│               Application Components                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ConfigManager│ │SolanaRpcCli │ │Distribution │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Component Design

#### TributaryParameters Interface
```typescript
interface TributaryParameters {
  network: NetworkConfig;      // Network configuration
  rpc: RpcConfig;             // RPC endpoints
  distribution: DistributionConfig; // Distribution settings
  token: TokenConfig;         // Token settings
  cache: CacheConfig;         // Cache settings
  logging: LoggingConfig;     // Logging settings
  security: SecurityConfig;   // Security settings
  export: ExportConfig;       // Export settings
  validation: ValidationConfig; // Validation settings
}
```

#### Parameter Resolution Flow
```typescript
function loadParameters(): TributaryParameters {
  // 1. Start with default values
  let params = { ...DEFAULT_PARAMETERS };

  // 2. Override with configuration file
  params = deepMerge(params, loadConfigFile());

  // 3. Override with environment variables
  params = applyEnvironmentVariables(params);

  // 4. CLI arguments are handled separately (highest priority)
  return params;
}
```

## 4. Implementation Details

### 4.1 ConfigManager Changes

#### Previous Problem
```typescript
// Problematic implementation - Zod default always applied
batch_size: z.number().default(10)
```

#### Fixed Implementation
```typescript
// Fixed - Respects user input
batch_size: z.number().optional()

function applyParameterDefaults(rawConfig: any): ConfigData {
  const params = getParameters();
  return {
    distribution: {
      // Use user input if available, otherwise use default
      batch_size: rawConfig.distribution?.batch_size ?? params.distribution.defaultBatchSize
    }
  };
}
```

### 4.2 Enhanced CLI Argument Processing

```typescript
// Prioritize user's explicit input
const overrides: any = {};

// Batch size override
if (options.batchSize !== undefined) {
  overrides.distribution = { batch_size: options.batchSize };
}

const config = await this.configManager.initializeProject({
  name: options.name,           // USER INPUT - Highest priority
  baseToken: options.token,     // USER INPUT - Highest priority
  adminWallet: options.admin,   // USER INPUT - Highest priority
  network: network,             // USER INPUT - Highest priority
  overrides: overrides          // USER INPUT - Highest priority
});
```

### 4.3 New CLI Arguments

```bash
tributary init \
  --name MyProject \
  --token So11111111111111111111111111111111111111112 \
  --admin 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU \
  --batch-size 25 \           # User's explicit specification
  --network-timeout 45000 \   # Network setting override
  --max-retries 5 \           # Retry setting override
  --log-level debug \         # Log level override
  --disable-encryption \      # Security setting override
  --mainnet-rpc https://my-rpc.com  # Custom RPC
```

## 5. Security Considerations

### 5.1 User Safety Assurance

#### Basic Principles
- **User's explicit input is never ignored**
- **Prevent execution of unexpected values**
- **Ensure transparency of configuration changes**

#### Implementation Example
```typescript
// Dangerous: Might ignore user specification
const batchSize = config.batch_size || defaultBatchSize;

// Safe: Prioritizes user specification
const batchSize = userSpecified ?? config.batch_size ?? defaultBatchSize;
```

### 5.2 Sensitive Information Management

#### Management via Environment Variables
```bash
# Manage sensitive information via environment variables
export TRIBUTARY_MAINNET_RPC="https://premium-rpc-with-auth-token.com"
export TRIBUTARY_ADMIN_PRIVATE_KEY_PATH="/secure/path/admin.key"
```

#### Exclude from Configuration Files
```gitignore
# Exclude from Git management
tributary-parameters.local.json
*.key
*.env.local
```

## 6. Testing Strategy

### 6.1 Priority Testing Scenarios

#### Test 1: CLI Arguments Have Highest Priority
```bash
# Set different values in environment and file
export TRIBUTARY_BATCH_SIZE=20
echo '{"distribution": {"defaultBatchSize": 30}}' > config.json

# Confirm CLI argument wins
tributary init --batch-size 15 # → Result: 15
```

#### Test 2: Environment Variables Override Files
```bash
unset CLI_args
export TRIBUTARY_BATCH_SIZE=25  # → Result: 25
# config.json still has 30
```

#### Test 3: Files Override Defaults
```bash
unset TRIBUTARY_BATCH_SIZE
# config.json has 30, default is 10  # → Result: 30
```

#### Test 4: Default Values Used
```bash
rm config.json
# no env vars, no file, default is 10  # → Result: 10
```

### 6.2 Safety Testing

#### User Intent Respect Test
```bash
# User explicitly specifies small value
tributary init --batch-size 1 --name SafetyTest

# Confirm 1 is always used
grep "batch_size.*1" tributary.toml || echo "❌ FAILED"
```

## 7. Operational Guidelines

### 7.1 Environment-Specific Configuration Examples

#### Development Environment
```json
{
  "network": {"defaultNetwork": "devnet", "timeout": 15000},
  "distribution": {"defaultBatchSize": 50},
  "logging": {"defaultLevel": "debug", "enableConsole": true}
}
```

#### Production Environment
```bash
export TRIBUTARY_DEFAULT_NETWORK=mainnet-beta
export TRIBUTARY_MAINNET_RPC=https://premium-rpc.com
export TRIBUTARY_LOG_LEVEL=warn
export TRIBUTARY_BATCH_SIZE=5
```

### 7.2 Migration Strategy

#### Phase 1: Gradual Migration
1. Introduction of new parameter system
2. Maintain existing hardcoded values as defaults
3. Gradual migration to configuration file management

#### Phase 2: Complete Migration
1. Remove all hardcoded values
2. Conduct comprehensive testing
3. Update documentation

## 8. Performance Considerations

### 8.1 Configuration Loading Optimization

```typescript
// Parameter caching functionality
let currentParameters: TributaryParameters | null = null;

export function getParameters(): TributaryParameters {
  if (!currentParameters) {
    currentParameters = loadParameters();
  }
  return currentParameters;
}
```

### 8.2 Validation Cost Minimization

```typescript
// Configuration validation optimization
function validateParameters(params: TributaryParameters): ValidationResult {
  // Execute only minimal necessary validation
  // Defer heavy validation to actual usage time
}
```

## 9. Future Extensions

### 9.1 Dynamic Configuration Changes
- Runtime configuration change API
- Hot reload functionality
- Configuration change audit logs

### 9.2 Advanced Configuration Management
- Configuration encryption
- Configuration signature verification
- Time-limited configuration activation

## 10. Conclusion

This parameter management system enables Tributary CLI to achieve:

1. **User-Centric Design**: Safe operation that prioritizes explicit user intent
2. **Environmental Adaptability**: Consistent configuration management from development to production
3. **Operational Efficiency**: Simple and intuitive configuration methods
4. **Extensibility**: Flexible foundation for future feature additions

This design completely eliminates the risk of execution with unintended values and realizes safe and efficient operation in diverse environments.

---

**Related Documents**:
- `Detailed_Design_Components.md` - Component detailed design
- `Detailed_Design_Security.md` - Security design
- `Command_Reference.md` - Command reference