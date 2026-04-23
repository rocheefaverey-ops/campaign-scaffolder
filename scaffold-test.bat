@echo off
setlocal enabledelayedexpansion

:: ─────────────────────────────────────────────────────────────────────────────
:: scaffold-test.bat
:: Scaffolds a semi-random test project with a freshly created CAPE campaign
:: so each run starts clean without stale keys from previous iterations.
:: ─────────────────────────────────────────────────────────────────────────────

set SCAFFOLDER_DIR=%~dp0

:: ── Random picks ─────────────────────────────────────────────────────────────
set /a IDX_STACK=%RANDOM% %% 2
set /a IDX_GAME=%RANDOM% %% 3
set /a ROLL_LEADERBOARD=%RANDOM% %% 2
set /a ROLL_REGISTRATION=%RANDOM% %% 2
set /a ROLL_VOUCHER=%RANDOM% %% 2
set /a ROLL_AUDIO=%RANDOM% %% 2
set /a ROLL_TOKENS=%RANDOM% %% 2
set /a ROLL_COOKIE=%RANDOM% %% 2

:: 4-digit suffix so names don't collide between runs
set /a SUFFIX=%RANDOM% %% 9000 + 1000

:: ── Stack ────────────────────────────────────────────────────────────────────
if %IDX_STACK%==0 (set STACK=next) else (set STACK=tanstack)

:: ── Market ───────────────────────────────────────────────────────────────────
set MARKET=NL

:: ── Game engine ───────────────────────────────────────────────────────────────
:: TanStack is Unity-only; Next.js picks randomly (unity / r3f / none)
set GAME_FLAG=
if "%STACK%"=="tanstack" (
  set GAME=unity
) else (
  if %IDX_GAME%==0 ( set GAME=unity  & set GAME_FLAG=--game=unity )
  if %IDX_GAME%==1 ( set GAME=r3f   & set GAME_FLAG=--game=r3f   )
  if %IDX_GAME%==2 ( set GAME=none  & set GAME_FLAG=              )
)

:: ── Modules (Next.js only) ────────────────────────────────────────────────────
set MODULES=
if "%STACK%"=="next" (
  if %ROLL_LEADERBOARD%==1  set MODULES=!MODULES! --module=leaderboard
  if %ROLL_REGISTRATION%==1 set MODULES=!MODULES! --module=registration
  if %ROLL_VOUCHER%==1      set MODULES=!MODULES! --module=voucher
  if %ROLL_AUDIO%==1        set MODULES=!MODULES! --module=audio
  if %ROLL_TOKENS%==1       set MODULES=!MODULES! --module=design-tokens
  if %ROLL_COOKIE%==1       set MODULES=!MODULES! --module=cookie-consent
)

:: ── Name + output ─────────────────────────────────────────────────────────────
set NAME=test-%STACK%-%SUFFIX%
:: Output sibling to the scaffolder folder so it works on any machine
pushd "%~dp0.."
set OUTPUT=%CD%\%NAME%
popd

:: ── Summary ───────────────────────────────────────────────────────────────────
echo.
echo  ============================================================
echo   scaffold-test.bat  --  new CAPE campaign (fresh each run)
echo  ============================================================
echo   Name   : %NAME%
echo   Stack  : %STACK%
echo   Market : %MARKET%
echo   Game   : %GAME%
if not "%MODULES%"=="" (
  echo   Modules:%MODULES%
) else (
  echo   Modules: (none)
)
echo   Output : %OUTPUT%
echo  ============================================================
echo.

:: ── Run ───────────────────────────────────────────────────────────────────────
node "%SCAFFOLDER_DIR%cli\scaffold.js" ^
  --name=%NAME% ^
  --create-cape ^
  --market=%MARKET% ^
  --stack=%STACK% ^
  %GAME_FLAG% ^
  %MODULES% ^
  --output="%OUTPUT%" ^
  --yes

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo  [ERROR] Scaffold failed. See output above.
  pause
  exit /b 1
)

echo.
echo  Done. Project is at: %OUTPUT%
echo.
pause
