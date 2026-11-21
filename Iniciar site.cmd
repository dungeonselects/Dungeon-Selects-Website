@echo off
setlocal
set "DUNGEON_PY=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
where py.exe >nul 2>&1
if not errorlevel 1 (
    py.exe -3 "%~dp0server.py" --open
) else (
    if exist "%DUNGEON_PY%" (
        "%DUNGEON_PY%" "%~dp0server.py" --open
    ) else (
        python.exe "%~dp0server.py" --open
    )
)
if errorlevel 1 pause
