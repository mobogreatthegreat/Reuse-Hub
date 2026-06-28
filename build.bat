@echo off
SETLOCAL ENABLEDELAYEDEXPANSION
TITLE Reuse Hub Builder

ECHO.
ECHO  --- Reuse Hub Builder -----------------------------
ECHO.

REM ---- Check dependencies ----
where python >nul 2>&1 || (ECHO [!] Python not found. & PAUSE & EXIT /B 1)
python -c "import PyInstaller" 2>nul || (ECHO [*] Installing PyInstaller... & python -m pip install pyinstaller --quiet)
where node >nul 2>&1 || (ECHO [!] Node.js not found. & PAUSE & EXIT /B 1)

REM ---- Kill lingering processes ----
taskkill /F /IM electron.exe >nul 2>&1
taskkill /F /IM "Reuse Hub.exe" >nul 2>&1
taskkill /F /IM reuse-hub-backend.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM ---- Clean (retry loop for locked files) ----
powershell -Command "$retry=0; while($retry -lt 5){try{Remove-Item -Recurse -Force 'dist','build','dist-backend' -ErrorAction Stop; break}catch{Start-Sleep 1; $retry++}}"

REM ---- Step 1: Python backend ----
ECHO.
ECHO  [1/2] Building backend server (standalone exe) ...
python -m PyInstaller --noconfirm --onefile --console --name "reuse-hub-backend" ^
  --distpath "dist-backend" --workpath "build" ^
  --hidden-import "uvicorn" --hidden-import "uvicorn.logging" ^
  --hidden-import "uvicorn.loops.auto" --hidden-import "uvicorn.protocols.http.auto" ^
  --hidden-import "uvicorn.protocols.websockets.auto" ^
  --hidden-import "starlette" --hidden-import "starlette.applications" ^
  --hidden-import "starlette.routing" --hidden-import "starlette.middleware" ^
  --hidden-import "starlette.middleware.cors" ^
  --hidden-import "pydantic" --hidden-import "fastapi" ^
  --hidden-import "fastapi.routing" --hidden-import "fastapi.openapi" ^
  --hidden-import "anyio" --hidden-import "sniffio" ^
  --hidden-import "httpx" --hidden-import "multipart" ^
  --add-data "db.py;." --add-data "launcher.py;." ^
  "server.py"
IF %ERRORLEVEL% NEQ 0 (ECHO [!] Backend build failed & PAUSE & EXIT /B 1)
ECHO  [+] dist-backend\reuse-hub-backend.exe

REM ---- Step 2: Electron portable build ----
ECHO.
ECHO  [2/2] Building Reuse Hub portable ...

REM ----- Install npm dependencies if needed -----
IF NOT EXIST "src-electron\node_modules\.package-lock.json" (
  ECHO  [*] Installing npm dependencies...
  pushd src-electron
  call npm install
  popd
  IF !ERRORLEVEL! NEQ 0 (ECHO [!] npm install failed & PAUSE & EXIT /B 1)
  ECHO  [+] npm dependencies installed
)

REM ----- Electron builder (portable) -----
pushd src-electron
ECHO  [*] Running electron-builder...
set CSC_IDENTITY_AUTO_DISCOVERY=false
call npx.cmd electron-builder --win portable --x64
IF !ERRORLEVEL! NEQ 0 (
  ECHO  [!] electron-builder failed
  popd
  PAUSE
  EXIT /B !ERRORLEVEL!
)
popd

REM ---- Verify outputs ----
ECHO.
ECHO  --- Build Complete --------------------------------
ECHO.
for /f "tokens=*" %%f in ('dir /b "dist\*.exe" 2^>nul') do (
  ECHO  [+] dist\%%f
)
IF EXIST "dist\win-unpacked" ECHO  [+] dist\win-unpacked\Reuse Hub.exe (no extraction)
ECHO.
ECHO  Run from win-unpacked\ for instant launch,
ECHO  or distribute the portable *.exe.
ECHO.
PAUSE
