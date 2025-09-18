@echo off
REM Tributary Interactive Test Runner - Windows Quick Start
REM 簡単にテストを開始するためのバッチファイル

echo.
echo ===============================================
echo  Tributary Interactive Test Runner
echo ===============================================
echo.
echo このスクリプトは対話式でTributaryテストを実行します
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js がインストールされていません
    echo    Node.js 18.0以上をインストールしてください
    pause
    exit /b 1
)

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ 正しいディレクトリにいません
    echo    400_test/200_automation ディレクトリで実行してください
    pause
    exit /b 1
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo 📦 依存関係をインストール中...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ 依存関係のインストールに失敗しました
        pause
        exit /b 1
    )
)

echo ✅ 環境確認完了
echo.
echo 🚀 対話式テストランナーを開始します...
echo.

REM Run the interactive test runner
node interactive-test-runner.js

echo.
echo ===============================================
echo  テスト完了
echo ===============================================

if not "%CI%"=="true" pause