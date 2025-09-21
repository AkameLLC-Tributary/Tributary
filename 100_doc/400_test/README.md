# Tributary Test Documentation

This directory contains comprehensive documentation for Tributary testing.

## Directory Structure

```
100_doc/400_test/
├── 100_manual/           # Manual testing documentation
├── 200_automation/       # Test automation documentation
├── 300_parameters/       # Test parameters and configuration
├── Test_Plan.md         # Overall test strategy
├── Ja_Test_Plan.md      # Test strategy (Japanese)
├── CLI_BUG_REPORT.md    # Known CLI issues
└── IMPLEMENTATION_RECOMMENDATIONS.md  # Implementation guidance
```

## Quick Navigation

### Test Planning
- [Test Plan (English)](./Test_Plan.md)
- [Test Plan (Japanese)](./Ja_Test_Plan.md)

### Manual Testing
- [Manual Test Checklist](./100_manual/Manual_Test_Checklist.md)
- [Manual Test Checklist (Japanese)](./100_manual/Ja_Manual_Test_Checklist.md)

### Test Automation
- [Automation Overview](./200_automation/README.md)
- [Test Matrix](./200_automation/Test_Matrix.md)
- [Custom Token Setup](./200_automation/CUSTOM_TOKEN_SETUP.md)

### Configuration
- [Test Parameters](./300_parameters/Test_Parameters.md)
- [Test Parameters (Japanese)](./300_parameters/Ja_Test_Parameters.md)

### Issues & Recommendations
- [CLI Bug Report](./CLI_BUG_REPORT.md)
- [Implementation Recommendations](./IMPLEMENTATION_RECOMMENDATIONS.md)

## Test Execution

For actual test execution, see the scripts in:
- `../400_test/200_automation/src/` - Test runners
- `../400_test/200_automation/scripts/` - Execution scripts