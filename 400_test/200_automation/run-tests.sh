#!/bin/bash

# Tributary Test Automation - Unix/Linux/macOS Script
# Unix系環境でのテスト実行用シェルスクリプト

set -e  # Exit on any error

echo ""
echo "=============================================="
echo " Tributary Test Automation Suite"
echo "=============================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_error() {
    echo -e "${RED}❌ Error: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed or not in PATH"
    echo "Please install Node.js 18.0 or higher"
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed or not in PATH"
    exit 1
fi

print_success "Node.js $(node --version) and npm $(npm --version) are available"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found"
    echo "Please run this script from the 400_test/200_automation directory"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_info "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        print_error "Failed to install dependencies"
        exit 1
    fi
    print_success "Dependencies installed"
    echo ""
fi

# Parse command line arguments
TEST_TYPE=${1:-full}

echo "🚀 Running Tributary tests..."
echo "Test type: $TEST_TYPE"
echo ""

# Set executable permissions for scripts
chmod +x test-runner.js ci-runner.js setup.js cleanup.js

# Execute based on test type
case $TEST_TYPE in
    full)
        echo "Running full test suite..."
        node test-runner.js
        ;;
    comprehensive)
        echo "Running comprehensive test suite..."
        node comprehensive-test-runner.js
        ;;
    all)
        echo "Running ALL tests including real distribution..."
        node comprehensive-test-runner.js --real-distribution
        ;;
    real-distribution)
        echo "Running real distribution tests..."
        node real-distribution-runner.js
        ;;
    ci)
        echo "Running CI test suite..."
        node ci-runner.js
        ;;
    setup)
        echo "Setting up test environment..."
        node setup.js
        ;;
    cleanup)
        echo "Cleaning up test artifacts..."
        node cleanup.js
        ;;
    force-cleanup)
        echo "Force cleaning up all test artifacts..."
        node cleanup.js --force
        ;;
    devnet)
        echo "Running devnet tests only..."
        node test-runner.js --phase=devnet
        ;;
    testnet)
        echo "Running testnet tests only..."
        node test-runner.js --phase=testnet
        ;;
    performance)
        echo "Running performance tests only..."
        node test-runner.js --phase=performance
        ;;
    phase1)
        echo "Running Phase 1 comprehensive tests..."
        node comprehensive-test-runner.js --phase=phase1
        ;;
    phase2)
        echo "Running Phase 2 comprehensive tests..."
        node comprehensive-test-runner.js --phase=phase2
        ;;
    phase3)
        echo "Running Phase 3 comprehensive tests..."
        node comprehensive-test-runner.js --phase=phase3
        ;;
    phase4)
        echo "Running Phase 4 comprehensive tests..."
        node comprehensive-test-runner.js --phase=phase4
        ;;
    phase5)
        echo "Running Phase 5 comprehensive tests..."
        node comprehensive-test-runner.js --phase=phase5
        ;;
    *)
        print_error "Unknown test type '$TEST_TYPE'"
        echo ""
        echo "Available options:"
        echo "  full           - Run complete test suite"
        echo "  comprehensive  - Run comprehensive test suite (all test items)"
        echo "  all            - Run ALL tests including real distribution"
        echo "  real-distribution - Run real token distribution tests only"
        echo "  ci             - Run CI-optimized tests"
        echo "  devnet         - Run devnet tests only"
        echo "  testnet        - Run testnet tests only"
        echo "  performance    - Run performance tests only"
        echo "  phase1         - Run Phase 1 comprehensive tests"
        echo "  phase2         - Run Phase 2 comprehensive tests"
        echo "  phase3         - Run Phase 3 comprehensive tests"
        echo "  phase4         - Run Phase 4 comprehensive tests"
        echo "  phase5         - Run Phase 5 comprehensive tests"
        echo "  setup          - Setup test environment"
        echo "  cleanup        - Clean test artifacts"
        echo "  force-cleanup  - Force clean all artifacts"
        echo ""
        echo "Usage: $0 [test_type]"
        exit 1
        ;;
esac

TEST_EXIT_CODE=$?

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    print_success "Tests completed successfully"
else
    print_error "Tests failed with exit code $TEST_EXIT_CODE"
fi

echo ""
echo "=============================================="
echo " Test execution finished"
echo "=============================================="

# Show results for full test runs
if [ "$TEST_TYPE" = "full" ] && [ -z "$CI" ]; then
    echo ""
    read -p "Show detailed results? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        print_info "Looking for test report..."

        # Find the most recent test report
        REPORT_FILE=$(find /tmp -name "test-report.json" -path "*/tributary-test-*" -type f -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)

        if [ -n "$REPORT_FILE" ] && [ -f "$REPORT_FILE" ]; then
            echo "📊 Test Report: $REPORT_FILE"
            echo ""

            # Extract key metrics using jq if available, otherwise use basic parsing
            if command -v jq &> /dev/null; then
                jq '.summary' "$REPORT_FILE"
            else
                grep -E '"(total|passed|failed|successRate|totalDuration)"' "$REPORT_FILE" | head -10
            fi
        else
            print_warning "Test report file not found"
        fi
    fi
fi

# Environment cleanup prompt
if [ "$TEST_TYPE" != "cleanup" ] && [ "$TEST_TYPE" != "force-cleanup" ] && [ -z "$CI" ]; then
    echo ""
    read -p "Clean up test artifacts? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        print_info "Cleaning up test artifacts..."
        node cleanup.js
    fi
fi

exit $TEST_EXIT_CODE