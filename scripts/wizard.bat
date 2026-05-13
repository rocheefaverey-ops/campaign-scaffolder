@echo off
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo  [ERROR] Node.js not found in PATH.
  echo  Download and install it from: https://nodejs.org
  echo.
  pause
  exit /b 1
)
:: Launches the interactive scaffold wizard — asks all questions
node "%~dp0cli\scaffold.js"
pause
