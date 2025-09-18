@echo off
REM Tributary Test Automation - Windows Batch Script
REM Windows環境でのテスト実行用バッチファイル

echo.
echo ===============================================
echo  Tributary Test Automation Suite
echo ===============================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: Node.js is not installed or not in PATH
    echo Please install Node.js 18.0 or higher
    pause
    exit /b 1
)

REM Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: npm is not installed or not in PATH
    pause
    exit /b 1
)

echo ✅ Node.js and npm are available
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: package.json not found
    echo Please run this script from the 400_test/200_automation directory
    pause
    exit /b 1
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Error: Failed to install dependencies
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed
    echo.
)

REM Check for command line arguments
set TEST_TYPE=%1
if "%TEST_TYPE%"=="" set TEST_TYPE=full

echo 🚀 Running Tributary tests...
echo Test type: %TEST_TYPE%
echo.

REM Execute based on test type
if "%TEST_TYPE%"=="full" (
    echo Running full test suite...
    node test-runner.js
) else if "%TEST_TYPE%"=="comprehensive" (
    echo Running comprehensive test suite...
    node comprehensive-test-runner.js
) else if "%TEST_TYPE%"=="all" (
    echo Running ALL tests including real distribution...
    node comprehensive-test-runner.js --real-distribution
) else if "%TEST_TYPE%"=="real-distribution" (
    echo Running real distribution tests...
    node real-distribution-runner.js
) else if "%TEST_TYPE%"=="ci" (
    echo Running CI test suite...
    node ci-runner.js
) else if "%TEST_TYPE%"=="setup" (
    echo Setting up test environment...
    node setup.js
) else if "%TEST_TYPE%"=="cleanup" (
    echo Cleaning up test artifacts...
    node cleanup.js
) else if "%TEST_TYPE%"=="devnet" (
    echo Running devnet tests only...
    node test-runner.js --phase=devnet
) else if "%TEST_TYPE%"=="testnet" (
    echo Running testnet tests only...
    node test-runner.js --phase=testnet
) else if "%TEST_TYPE%"=="phase1" (
    echo Running Phase 1 comprehensive tests...
    node comprehensive-test-runner.js --phase=phase1
) else if "%TEST_TYPE%"=="phase2" (
    echo Running Phase 2 comprehensive tests...
    node comprehensive-test-runner.js --phase=phase2
) else if "%TEST_TYPE%"=="phase3" (
    echo Running Phase 3 comprehensive tests...
    node comprehensive-test-runner.js --phase=phase3
) else if "%TEST_TYPE%"=="phase4" (
    echo Running Phase 4 comprehensive tests...
    node comprehensive-test-runner.js --phase=phase4
) else if "%TEST_TYPE%"=="phase5" (
    echo Running Phase 5 comprehensive tests...
    node comprehensive-test-runner.js --phase=phase5
) else (
    echo ❌ Error: Unknown test type "%TEST_TYPE%"
    echo.
    echo Available options:
    echo   full           - Run complete test suite
    echo   comprehensive  - Run comprehensive test suite (all test items)
    echo   all            - Run ALL tests including real distribution
    echo   real-distribution - Run real token distribution tests only
    echo   ci             - Run CI-optimized tests
    echo   devnet         - Run devnet tests only
    echo   testnet        - Run testnet tests only
    echo   phase1         - Run Phase 1 comprehensive tests
    echo   phase2         - Run Phase 2 comprehensive tests
    echo   phase3         - Run Phase 3 comprehensive tests
    echo   phase4         - Run Phase 4 comprehensive tests
    echo   phase5         - Run Phase 5 comprehensive tests
    echo   setup          - Setup test environment
    echo   cleanup        - Clean test artifacts
    echo.
    echo Usage: run-tests.bat [test_type]
    pause
    exit /b 1
)

set TEST_EXIT_CODE=%errorlevel%

echo.
if %TEST_EXIT_CODE%==0 (
    echo ✅ Tests completed successfully
) else (
    echo ❌ Tests failed with exit code %TEST_EXIT_CODE%
)

echo.
echo ===============================================
echo  Test execution finished
echo ===============================================

REM Ask user if they want to see results (only in interactive mode)
if "%TEST_TYPE%"=="full" (
    echo.
    set /p "SHOW_RESULTS=Show detailed results? (y/n): "
    if /i "%SHOW_RESULTS%"=="y" (
        if exist "%TEMP%\tributary-test-*\test-report.json" (
            echo.
            echo 📊 Opening test report...
            for /d %%i in ("%TEMP%\tributary-test-*") do (
                if exist "%%i\test-report.json" (
                    type "%%i\test-report.json"
                    goto :found_report
                )
            )
            echo ⚠️ Test report not found
            :found_report
        ) else (
            echo ⚠️ Test report file not found
        )
    )
)

if not "%CI%"=="true" pause
exit /b %TEST_EXIT_CODE%