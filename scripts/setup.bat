@echo off
REM Quick Setup Script for Docs Navigator MCP - SUSE Edition

echo ======================================
echo Docs Navigator MCP - Quick Setup
echo ======================================
echo.

REM Check Node.js
echo Checking Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X Node.js is not installed. Please install Node.js 18+ first.
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo OK Node.js %NODE_VERSION% found

REM Check npm
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X npm is not installed.
    exit /b 1
)
echo OK npm found

REM Install dependencies
echo.
echo Installing dependencies...
call npm install

REM Setup environment
if not exist .env (
    echo.
    echo Creating .env file...
    copy .env.example .env
    echo OK .env file created
    echo !  Please edit .env to configure your settings
) else (
    echo OK .env file already exists
)

REM Build project
echo.
echo Building project...
call npm run build

REM Check for Ollama
echo.
echo Checking for Ollama...
where ollama >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo OK Ollama found
    echo.
    echo Available Ollama models:
    call ollama list 2>nul
    echo.
    echo To pull required models, run:
    echo   ollama pull llama3.2:latest
    echo   ollama pull nomic-embed-text
) else (
    echo !  Ollama not found
    echo    For local AI models, install Ollama from: https://ollama.ai
    echo    Or configure OpenAI/Anthropic in .env
)

echo.
echo ======================================
echo OK Setup Complete!
echo ======================================
echo.
echo Next steps:
echo 1. Configure .env with your preferences
echo 2. If using Ollama, pull required models:
echo    ollama pull llama3.2:latest
echo    ollama pull nomic-embed-text
echo 3. Add to your MCP client config (see MCP_CLIENT_CONFIG.md)
echo 4. Restart your MCP client
echo.
echo For detailed instructions, see INSTALL.md
echo.

pause
