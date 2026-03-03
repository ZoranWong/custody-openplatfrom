@echo off
REM Cregis OpenPlatform - All Services Startup Script (Windows)
REM 一键启动 Developer Portal, Admin Portal 和 API 服务

chcp 65001 >nul
setlocal enabledelayedexpansion

REM Default ports
set API_PORT=1000
set DEV_PORTAL_PORT=1001
set ADMIN_PORTAL_PORT=1002

REM Project root directory
set "PROJECT_ROOT=%~dp0"
set "API_DIR=%PROJECT_ROOT%openplatform-api-service"
set "DEV_PORTAL_DIR=%PROJECT_ROOT%openplatform-web\developer-portal"
set "ADMIN_PORTAL_DIR=%PROJECT_ROOT%openplatform-web\admin-portal"

REM Colors (using ANSI escape codes for Windows CMD)
set "BLUE=^^[[94m"
set "GREEN=^^[[92m"
set "YELLOW=^^[[93m"
set "RED=^^[[91m"
set "NC=^^[[0m"

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║         Cregis OpenPlatform - All Services Startup         ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Check directories exist
if not exist "%API_DIR%" (
    echo [91mError: API directory not found: %API_DIR%[0m
    exit /b 1
)
if not exist "%DEV_PORTAL_DIR%" (
    echo [91mError: Developer Portal directory not found: %DEV_PORTAL_DIR%[0m
    exit /b 1
)
if not exist "%ADMIN_PORTAL_DIR%" (
    echo [92mError: Admin Portal directory not found: %ADMIN_PORTAL_DIR%[0m
    exit /b 1
)

echo [93mStarting all services...[0m
echo.

REM Start API Gateway
echo [92m✓[0m Starting API Gateway...
cd /d "%API_DIR%"
start /B "API Gateway" cmd /c "npm run dev > ..\..\api.log 2>&1"

REM Start Developer Portal
echo [92m✓[0m Starting Developer Portal...
cd /d "%DEV_PORTAL_DIR%"
start /B "Developer Portal" cmd /c "npm run dev > ..\..\dev-portal.log 2>&1"

REM Start Admin Portal
echo [92m✓[0m Starting Admin Portal...
cd /d "%ADMIN_PORTAL_DIR%"
start /B "Admin Portal" cmd /c "npm run dev > ..\..\admin-portal.log 2>&1"

echo.
echo ============================================================
echo                    Access URLs
echo ============================================================
echo.
echo   Developer Portal:  http://localhost:%DEV_PORTAL_PORT%
echo   Admin Portal:      http://localhost:%ADMIN_PORTAL_PORT%
echo   API Gateway:       http://localhost:%API_PORT%
echo.
echo ============================================================
echo.
echo Press Ctrl+C to stop all services
echo.

REM Return to project root
cd /d "%PROJECT_ROOT%"

REM Keep running and show logs
:loop
timeout /t 5 >nul
goto loop

endlocal
