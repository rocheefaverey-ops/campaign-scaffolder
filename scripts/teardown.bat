@echo off
setlocal enabledelayedexpansion

:: Resolve workspace path without ".." so robocopy doesn't choke
pushd "%~dp0.."
set WORKSPACE=%CD%
popd

echo.
echo  Livewall - Remove Scaffolded Test Projects
echo  ==========================================
echo.

set COUNT=0
for /d %%D in ("%WORKSPACE%\*") do (
    if exist "%%D\.scaffolded" (
        set /a COUNT+=1
        for %%F in ("%%D\.scaffolded") do (
            set "NAME=%%~nxD"
        )
        echo  [!COUNT!] %%~nxD
    )
)

if %COUNT%==0 (
    echo  No scaffolded projects found.
    echo.
    pause
    exit /b 0
)

echo.
echo  Found %COUNT% scaffolded project(s).
echo.
set /p CONFIRM= Delete all? [y/N]:

if /i not "%CONFIRM%"=="y" (
    echo.
    echo  Aborted.
    echo.
    exit /b 0
)

:: Create a temp empty dir to mirror from (robocopy /MIR trick for locked node_modules)
set EMPTY=%TEMP%\lw_teardown_empty
if not exist "%EMPTY%" mkdir "%EMPTY%"

echo.
for /d %%D in ("%WORKSPACE%\*") do (
    if exist "%%D\.scaffolded" (
        echo  Deleting %%~nxD ...
        robocopy "%EMPTY%" "%%D" /MIR /NFL /NDL /NJH /NJS /NP /NS /NC > nul 2>&1
        rd /s /q "%%D" 2>nul
        if exist "%%D" (
            echo    WARNING: %%~nxD still locked - close any VSCode windows or terminals with this folder open, then re-run.
        ) else (
            echo    Done.
        )
    )
)

rmdir "%EMPTY%" 2>nul

echo.
echo  Complete.
echo.
pause
