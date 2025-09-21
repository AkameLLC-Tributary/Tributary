# Manual Test Checklist
# Tributary - Solana Reward Distribution System

**Last Updated**: 2025-09-18
**Updated By**: akameGusya

## Overview
This document provides a checklist for manual testing execution of the Tributary system. It includes detailed execution procedures and verification points for each test item.

## Pre-Test Preparation

### Environment Preparation Checklist
- [ ] Node.js 18.0+ installation verification
- [ ] tributary CLI latest version installation verification
- [ ] Test SOL preparation (devnet: 5 SOL, testnet: 10 SOL)
- [ ] Test private key files preparation
- [ ] Network connectivity verification

### Tool Verification
```bash
# Version checks
node --version        # v18.0.0 or higher
npm --version         # 8.0.0 or higher
tributary --version   # Latest version

# Network connectivity check
curl -s https://api.devnet.solana.com -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' -H "Content-Type: application/json"
```

## Phase 1: devnet Basic Function Testing

### T001: Basic Initialization Command ✅❌
**Execution Command**:
```bash
cd /tmp/tributary-test
tributary init \
  --name "BasicInitTest" \
  --token "So11111111111111111111111111111111111111112" \
  --admin "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" \
  --network devnet
```

**Verification Points**:
- [ ] Command exits normally (exit code 0)
- [ ] `tributary.toml` file is created
- [ ] Configuration file content is correct
- [ ] Project name is set accurately
- [ ] Network is set to devnet

**Expected Output**:
```
✅ Project initialized successfully
📁 Configuration saved to: ./tributary.toml
🌐 Network: devnet
💰 Base token: So11111111111111111111111111111111111111112
```

---

### T002: Interactive Mode Initialization ✅❌
**Execution Command**:
```bash
cd /tmp/tributary-test-interactive
tributary init --interactive
```

**Input Values**:
- Project name: `InteractiveTest`
- Base token: `So11111111111111111111111111111111111111112`
- Admin wallet: `7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU`
- Network: `devnet`

**Verification Points**:
- [ ] Interactive prompts are displayed
- [ ] Each input item is properly accepted
- [ ] Input validation works
- [ ] Final confirmation screen is displayed
- [ ] Configuration file is created correctly

---

### T040: Configuration Display (show) ✅❌
**Execution Command**:
```bash
cd /tmp/tributary-test
tributary config show
```

**Verification Points**:
- [ ] Configuration content is displayed in table format
- [ ] All sections (project, token, distribution, security) are displayed
- [ ] Sensitive information (private keys, etc.) is masked
- [ ] Configuration values are displayed accurately

**Execution Command (JSON format)**:
```bash
tributary config show --format json
```

**Verification Points**:
- [ ] JSON format output is correct
- [ ] Parseable JSON structure
- [ ] All configuration items are included

---

### T041: Configuration Validation (validate) ✅❌
**Execution Command**:
```bash
cd /tmp/tributary-test
tributary config validate
```

**Verification Points**:
- [ ] Configuration validation is executed
- [ ] Success message is displayed for valid configuration
- [ ] Validation results are clearly displayed

**Invalid Configuration Test**:
```bash
# Set invalid token address in configuration file and test
tributary config validate
```

**Verification Points**:
- [ ] Invalid configuration is detected
- [ ] Specific error messages are displayed
- [ ] Correction suggestions are provided

## Phase 2: testnet Integration Testing

### T010: SOL Token Holder Collection ✅❌
**Execution Command**:
```bash
cd /tmp/tributary-test
tributary collect \
  --token "So11111111111111111111111111111111111111112" \
  --threshold 0.1 \
  --network testnet \
  --output-file "test_holders.json"
```

**Verification Points**:
- [ ] Holder data is retrieved
- [ ] Threshold filtering works
- [ ] Output file is created
- [ ] JSON format is correct
- [ ] Progress display works

**Expected Output Example**:
```
🔍 Collecting token holders...
📊 Found 150 holders above threshold 0.1 SOL
💾 Results saved to: test_holders.json
⏱️  Completed in 12.3 seconds
```

---

### T020: Basic Distribution Simulation ✅❌
**Execution Command**:
```bash
tributary distribute simulate \
  --amount 100 \
  --token "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr" \
  --network testnet
```

**Verification Points**:
- [ ] Simulation is executed
- [ ] Gas fee estimate is displayed
- [ ] Distribution breakdown is displayed
- [ ] Estimated execution time is displayed
- [ ] Warnings and risks are properly displayed

**Expected Output Items**:
- [ ] `estimatedGasCost`
- [ ] `estimatedDuration`
- [ ] `distributionBreakdown`
- [ ] `riskFactors`

---

### T030: Dry Run Execution ✅❌
**Execution Command**:
```bash
tributary distribute execute \
  --amount 10 \
  --token "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr" \
  --network testnet \
  --dry-run \
  --batch-size 3
```

**Verification Points**:
- [ ] Executed in dry run mode
- [ ] No actual transactions are sent
- [ ] Distribution simulation results are displayed
- [ ] Batch processing flow can be confirmed
- [ ] Distribution amount to each recipient is calculated

---

### T031: Small Amount Real Distribution ✅❌
**⚠️ Warning: Uses actual tokens**

**Execution Command**:
```bash
tributary distribute execute \
  --amount 1.0 \
  --token "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr" \
  --network testnet \
  --wallet-file "./test-keypair.json" \
  --batch-size 5 \
  --confirm
```

**Pre-requisites**:
- [ ] Test USDC balance verification (2.0 or more)
- [ ] Prepare 5 or more recipient wallets
- [ ] Private key file permission setting (600)

**Verification Points**:
- [ ] Distribution is actually executed
- [ ] Transaction hashes are displayed
- [ ] Transfers to each recipient succeed
- [ ] Progress display works correctly
- [ ] Final result summary is displayed

**Post-execution Verification**:
- [ ] Verify balance increase in each recipient wallet
- [ ] Verify balance decrease in sender wallet
- [ ] Verify transactions on Solana Explorer

## Phase 3: Error Handling Testing

### T060: Invalid Token Address ✅❌
**Execution Command**:
```bash
tributary collect --token "ThisIsNotAValidTokenAddress123456789"
```

**Verification Points**:
- [ ] Error is properly detected
- [ ] Clear error message is displayed
- [ ] Correction suggestion is provided
- [ ] Program exits properly (exit code != 0)

**Expected Output**:
```
❌ ValidationError: Invalid token address format
💡 Expected: Base58-encoded Solana token address (32-44 characters)
```

---

### T061: Insufficient Balance Error ✅❌
**Execution Command**:
```bash
tributary distribute execute \
  --amount 999999 \
  --token "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr" \
  --network testnet \
  --dry-run
```

**Verification Points**:
- [ ] Insufficient balance is detected
- [ ] Available balance and required balance are displayed
- [ ] Solutions are suggested

**Expected Output**:
```
❌ ResourceError: Insufficient token balance
Required: 999,999.00 USDC, Available: 10.50 USDC
💡 Solution: Add more USDC to admin wallet or reduce distribution amount
```

## Phase 4: Performance Testing

### T070: 1000 Wallet Collection Time ✅❌
**Execution Command**:
```bash
time tributary collect \
  --token "So11111111111111111111111111111111111111112" \
  --threshold 0.001 \
  --max-holders 1000 \
  --network testnet \
  --cache false
```

**Verification Points**:
- [ ] Execution time within 5 minutes
- [ ] Memory usage within 1GB
- [ ] CPU usage in appropriate range
- [ ] 1000 data items retrieved normally

**Measurement Items**:
- [ ] Execution time: ___minutes___seconds
- [ ] Maximum memory usage: ___MB
- [ ] Retrieved count: ___items

## Test Results Recording

### Overall Summary
- **Execution Date/Time**: ___________
- **Executor**: ___________
- **Environment**: ___________
- **tributary Version**: ___________

### Result Statistics
- **Total Test Items**: 15
- **Passed**: ___items
- **Failed**: ___items
- **Skipped**: ___items
- **Success Rate**: ___%

### Important Findings
1. ________________________________
2. ________________________________
3. ________________________________

### Next Actions
- [ ] ________________________________
- [ ] ________________________________
- [ ] ________________________________

---

**Test Completion Signature**: ___________
**Reviewer**: ___________
**Approval Date**: ___________