# Test Plan
# Tributary - Solana Reward Distribution System

**Last Updated**: 2025-09-18
**Updated By**: akameGusya

## Overview
This document defines a comprehensive test plan and execution procedures for the Tributary system. It specifies test items and parameters to ensure quality assurance and safe operation in production environments.

## Test Strategy

### Test Phases
1. **Unit Testing** - Individual component functionality verification
2. **Integration Testing** - Inter-component collaboration verification
3. **System Testing** - End-to-end scenario verification
4. **Acceptance Testing** - Final confirmation of user requirements

### Test Environments
- **devnet**: Basic function development testing
- **testnet**: Integration and system testing (final confirmation before production)
- **mainnet**: Not tested (production use only)

## Test Items List

### 1. CLI Basic Function Testing

#### 1.1 Project Initialization Testing
| Item ID | Test Item | Priority | Environment |
|---------|-----------|----------|-------------|
| T001 | Basic initialization command | High | devnet |
| T002 | Interactive mode initialization | High | devnet |
| T003 | Existing configuration overwrite (--force) | Medium | devnet |
| T004 | Invalid parameter error handling | High | devnet |
| T005 | Network-specific initialization | High | devnet/testnet |

#### 1.2 Wallet Collection Testing
| Item ID | Test Item | Priority | Environment |
|---------|-----------|----------|-------------|
| T010 | SOL token holder collection | High | testnet |
| T011 | Threshold-based filtering | High | testnet |
| T012 | Large holder exclusion function | Medium | testnet |
| T013 | Cache functionality verification | Medium | testnet |
| T014 | Output file formats (JSON/CSV) | Medium | testnet |
| T015 | Large data processing (1000+ items) | Low | testnet |

#### 1.3 Distribution Simulation Testing
| Item ID | Test Item | Priority | Environment |
|---------|-----------|----------|-------------|
| T020 | Basic distribution simulation | High | testnet |
| T021 | Detailed result display | Medium | testnet |
| T022 | Simulation with different tokens | High | testnet |
| T023 | Proportional calculation accuracy verification | High | testnet |
| T024 | Gas fee estimation accuracy | Medium | testnet |

#### 1.4 Distribution Execution Testing
| Item ID | Test Item | Priority | Environment |
|---------|-----------|----------|-------------|
| T030 | Dry run execution | High | testnet |
| T031 | Small-scale real distribution (10 or fewer) | High | testnet |
| T032 | Medium-scale distribution (around 50) | Medium | testnet |
| T033 | Batch size change testing | Medium | testnet |
| T034 | Partial execution state confirmation on error | High | testnet |
| T035 | Transaction history recording | High | testnet |

### 2. Configuration Management Testing

#### 2.1 Configuration File Operation Testing
| Item ID | Test Item | Priority | Environment |
|---------|-----------|----------|-------------|
| T040 | Configuration display (show) | High | devnet |
| T041 | Configuration validation (validate) | High | devnet |
| T042 | Configuration export | Medium | devnet |
| T043 | Invalid configuration value detection | High | devnet |
| T044 | Proper masking of sensitive information | High | devnet |

### 3. Error Handling Testing

#### 3.1 Network Error Testing
| Item ID | Test Item | Priority | Environment |
|---------|-----------|----------|-------------|
| T050 | RPC connection error handling | High | devnet |
| T051 | Timeout handling | Medium | devnet |
| T052 | Retry function operation confirmation | Medium | devnet |

#### 3.2 User Error Testing
| Item ID | Test Item | Priority | Environment |
|---------|-----------|----------|-------------|
| T060 | Invalid token address | High | devnet |
| T061 | Insufficient balance error | High | testnet |
| T062 | Insufficient permission error | High | testnet |
| T063 | Missing configuration file error | High | devnet |

### 4. Performance Testing

#### 4.1 Processing Performance Testing
| Item ID | Test Item | Priority | Environment |
|---------|-----------|----------|-------------|
| T070 | 1000 wallet collection time | Medium | testnet |
| T071 | 100 distribution processing time | Medium | testnet |
| T072 | Memory usage monitoring | Low | testnet |

### 5. Security Testing

#### 5.1 Private Key Management Testing
| Item ID | Test Item | Priority | Environment |
|---------|-----------|----------|-------------|
| T080 | Private key file loading | High | devnet |
| T081 | Invalid private key error handling | High | devnet |
| T082 | Private key file permission verification | Medium | devnet |

### 6. Production Preparation Testing

#### 6.1 Production Configuration Validation Testing
| Item ID | Test Item | Priority | Environment |
|---------|-----------|----------|-------------|
| T090 | Mainnet configuration file validation | High | devnet |
| T091 | Production setting values validation | High | devnet |
| T092 | Mainnet warning message confirmation | Medium | devnet |

## Test Execution Order

### Phase 1: Basic Function Confirmation (devnet)
1. Project initialization testing (T001-T005)
2. Configuration management testing (T040-T044)
3. Basic error handling testing (T050-T063)

### Phase 2: Integration Testing (testnet)
1. Wallet collection testing (T010-T015)
2. Distribution simulation testing (T020-T024)
3. Distribution execution testing (T030-T035)

### Phase 3: Performance Testing (testnet)
1. Processing performance testing (T070-T072)
2. Security testing (T080-T082)

### Phase 4: Production Preparation Testing (devnet)
1. Production configuration validation testing (T090-T092)

## Pass Criteria

### Required Pass Items
- [ ] All high priority items pass
- [ ] All security test items pass
- [ ] All production preparation test items pass

### Quality Standards
- [ ] Command execution success rate: 95% or higher
- [ ] Error message appropriateness: 100%
- [ ] Performance requirement fulfillment: 100%

## Test Environment Requirements

### Required Resources
- **Test SOL**: Approximately 5 SOL on devnet, 10 SOL on testnet
- **Test tokens**: Appropriate amounts on devnet and testnet
- **Test wallets**: Administrator + multiple recipients

### Required Tools
- Node.js 18.0+
- Latest version tributary CLI
- Test private key files

## Risk Management

### High Risk Items
- Real token distribution processing on testnet
- Memory shortage during large data processing
- Processing continuation during network failures

### Countermeasures
- Conduct testnet testing with small amounts
- Memory monitoring and alert settings
- Manual intervention procedures for failure scenarios