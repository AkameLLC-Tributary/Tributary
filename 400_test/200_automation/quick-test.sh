#!/bin/bash

# Tributary Interactive Test Runner - Unix Quick Start
# 簡単にテストを開始するためのシェルスクリプト

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo "==============================================="
    echo " Tributary Interactive Test Runner"
    echo "==============================================="
    echo ""
    echo "このスクリプトは対話式でTributaryテストを実行します"
    echo ""
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

# Main execution
main() {
    print_header

    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js がインストールされていません"
        echo "   Node.js 18.0以上をインストールしてください"
        exit 1
    fi

    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm がインストールされていません"
        exit 1
    fi

    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        print_error "正しいディレクトリにいません"
        echo "   400_test/200_automation ディレクトリで実行してください"
        exit 1
    fi

    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_info "依存関係をインストール中..."
        npm install
        if [ $? -ne 0 ]; then
            print_error "依存関係のインストールに失敗しました"
            exit 1
        fi
    fi

    print_success "環境確認完了"
    echo ""
    print_info "対話式テストランナーを開始します..."
    echo ""

    # Make script executable
    chmod +x interactive-test-runner.js

    # Run the interactive test runner
    node interactive-test-runner.js

    echo ""
    echo "==============================================="
    echo " テスト完了"
    echo "==============================================="
}

# Execute main function
main "$@"