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

REM ---- Clean ----
IF EXIST "dist" rmdir /s /q "dist" 2>nul
IF EXIST "dist-backend" rmdir /s /q "dist-backend" 2>nul
IF EXIST "build" rmdir /s /q "build" 2>nul

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
  --add-data "backend\db.py;." --add-data "backend\launcher.py;." ^
  "backend\server.py"
IF %ERRORLEVEL% NEQ 0 (ECHO [!] Backend build failed & PAUSE & EXIT /B 1)
ECHO  [+] dist-backend\reuse-hub-backend.exe

REM ---- Step 2: Electron portable exe ----
ECHO.
ECHO  [2/2] Building Reuse Hub portable exe ...

REM ----- Install npm dependencies if needed -----
IF NOT EXIST "node_modules\.package-lock.json" (
  ECHO  [*] Installing npm dependencies...
  call npm install
  IF !ERRORLEVEL! NEQ 0 (ECHO [!] npm install failed & PAUSE & EXIT /B 1)
  ECHO  [+] npm dependencies installed
)

REM ----- Download 7z SFX module if needed -----
SET "SFX_MODULE=node_modules\7zip-bin\win\x64\7zCon.sfx"
IF NOT EXIST "%SFX_MODULE%" (
  ECHO  [*] Downloading 7z SFX module...
  powershell -Command "Invoke-WebRequest -Uri 'https://www.7-zip.org/a/7z2107-extra.7z' -OutFile '%TEMP%\7z-extra.7z' -UseBasicParsing" >nul
  IF EXIST "%TEMP%\7z-extra.7z" (
    "node_modules\7zip-bin\win\x64\7za.exe" x -bd "%TEMP%\7z-extra.7z" -o"%TEMP%\7z-extra" -y >nul
    IF EXIST "%TEMP%\7z-extra\7zCon.sfx" (
      copy "%TEMP%\7z-extra\7zCon.sfx" "%SFX_MODULE%" >nul
      ECHO  [+] SFX module ready
    )
    rmdir /s /q "%TEMP%\7z-extra" 2>nul
    DEL "%TEMP%\7z-extra.7z" 2>nul
  )
)

REM ----- Kill lingering electron processes -----
taskkill /F /IM electron.exe >nul 2>&1
taskkill /F /IM "Reuse Hub.exe" >nul 2>&1

REM ----- Build unpacked app (no signing needed) -----
ECHO  [*] Packaging Electron app...
set CSC_IDENTITY_AUTO_DISCOVERY=false
call npx electron-builder --win dir
IF !ERRORLEVEL! NEQ 0 (
  ECHO  [!] electron-builder failed
  PAUSE
  EXIT /B !ERRORLEVEL!
)

REM ----- Create single-file portable exe using 7z SFX -----
ECHO  [*] Creating single-file portable exe...
IF NOT EXIST "%SFX_MODULE%" (
  ECHO  [!] SFX module not found - dist\win-unpacked\ works as-is
  GOTO done
)

IF EXIST "dist\Reuse Hub.exe" DEL "dist\Reuse Hub.exe" 2>nul

REM Create SFX config file
ECHO ;!@Install@!UTF-8! > "%TEMP%\sfx-config.txt"
ECHO RunProgram="Reuse Hub.exe" >> "%TEMP%\sfx-config.txt"
ECHO Directory="%%T" >> "%TEMP%\sfx-config.txt"
ECHO ;!@InstallEnd@! >> "%TEMP%\sfx-config.txt"

cd dist
"..\node_modules\7zip-bin\win\x64\7za.exe" a -sfx"..\%SFX_MODULE%" -mx9 ^
  -z"%TEMP%\sfx-config.txt" "Reuse Hub.exe" "win-unpacked\*" >nul
cd ..

IF %ERRORLEVEL% NEQ 0 (
  ECHO  [!] 7z SFX failed - dist\win-unpacked\ works as-is
) ELSE (
  IF EXIST "dist\Reuse Hub.exe" (
    ECHO  [+] dist\Reuse Hub.exe
    rmdir /s /q "dist\win-unpacked" 2>nul
  )
)

:done
ECHO.
ECHO  --- Build Complete --------------------------------
ECHO.
for /f "tokens=*" %%f in ('dir /b "dist\*.exe" 2^>nul') do (
  ECHO  [+] dist\%%f
)
IF EXIST "dist\win-unpacked" ECHO  [+] dist\win-unpacked\Reuse Hub.exe (folder)
ECHO.
ECHO  Reuse Hub.exe is a single portable file.
ECHO  It contains everything -- just run it anywhere.
ECHO.
PAUSE
