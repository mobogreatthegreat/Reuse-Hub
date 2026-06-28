@echo off
cd /d "%~dp0"
title Reuse Hub

echo ========================================
echo            Reuse Hub Launcher
echo ========================================
echo.

REM Check Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    echo Please install Python 3 from https://python.org
    echo.
    pause
    exit /b 1
)

REM Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org
    echo.
    pause
    exit /b 1
)

REM Install Python dependencies
echo [1/3] Installing Python dependencies...
python -m pip install -r requirements.txt -q
if %errorlevel% neq 0 (
    echo [WARN] Failed to install Python deps, trying pip3...
    pip3 install -r requirements.txt -q
)

REM Install Node dependencies
echo [2/3] Installing Node dependencies...
cd src-electron
call npm install --silent
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install Node dependencies.
    pause
    exit /b 1
)

REM Launch (Electron starts the backend automatically)
echo [3/3] Starting Reuse Hub...
echo.
npm start

exit /b 0
