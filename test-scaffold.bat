@echo off
setlocal

:: ─────────────────────────────────────────────
:: Livewall Campaign Scaffolder — quick test
:: Edit the variables below, then double-click
:: or run: test-scaffold.bat
::
:: STACK options: next | tanstack
:: GAME  options: unity | r3f | phaser | video | pure-react
:: ─────────────────────────────────────────────

set STACK=next
set NAME=test-campaign
set CAPE_ID=54031
set MARKET=NL
set GAME=unity
set MODULES=--module=leaderboard --module=registration --module=gtm
set PAGES=--page=landing --page=onboarding --page=register --page=game --page=result --page=leaderboard
set REG_MODE=after
set GTM_ID=GTM-XXXXXXX
set OUTPUT=%~dp0..\%NAME%

:: Clean up previous test run
if exist "%OUTPUT%" (
    echo Removing previous output: %OUTPUT%
    rmdir /s /q "%OUTPUT%"
)

node "%~dp0cli\scaffold.js" ^
  --stack=%STACK% ^
  --name=%NAME% ^
  --cape-id=%CAPE_ID% ^
  --market=%MARKET% ^
  --game=%GAME% ^
  %PAGES% ^
  --reg-mode=%REG_MODE% ^
  %MODULES% ^
  --gtm-id=%GTM_ID% ^
  --output="%OUTPUT%" ^
  --yes

echo.
echo Output: %OUTPUT%
echo.
pause
