@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

set ROOT=%~dp0
set ROOT=%ROOT:~0,-1%
set BACKEND=%ROOT%\backend
set FRONTEND=%ROOT%\frontend

title Fusion BD CORE OS — Dev

:MENU
cls
echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║      Fusion BD CORE OS — Local Dev           ║
echo  ║      Native Windows (no Docker)              ║
echo  ╚══════════════════════════════════════════════╝
echo.
echo  [1]  Start          (backend + frontend)
echo  [2]  Start backend  only
echo  [3]  Start frontend only
echo  ──────────────────────────────────────────────
echo  [S]  Setup          (first time only)
echo  [M]  Migrate DB     (alembic upgrade head)
echo  [G]  Generate API client  (after backend changes)
echo  ──────────────────────────────────────────────
echo  [O]  Open in browser
echo  [Q]  Quit
echo.
set /p choice="  Choice: "

if /i "%choice%"=="1" goto START_ALL
if /i "%choice%"=="2" goto START_BACKEND
if /i "%choice%"=="3" goto START_FRONTEND
if /i "%choice%"=="S" goto SETUP
if /i "%choice%"=="s" goto SETUP
if /i "%choice%"=="M" goto MIGRATE
if /i "%choice%"=="m" goto MIGRATE
if /i "%choice%"=="G" goto GEN_CLIENT
if /i "%choice%"=="g" goto GEN_CLIENT
if /i "%choice%"=="O" goto OPEN
if /i "%choice%"=="o" goto OPEN
if /i "%choice%"=="Q" goto END
if /i "%choice%"=="q" goto END
goto MENU


:: ─── START ALL ─────────────────────────────────────────────────────────────
:START_ALL
echo.
echo  Starting Backend...
start "FHG-Backend" /D "%BACKEND%" cmd /k "uv run fastapi run --reload app/main.py"
timeout /t 2 /nobreak >nul

echo  Starting Frontend...
start "FHG-Frontend" /D "%FRONTEND%" cmd /k "bun dev"

echo.
echo  ✓ Both services started in separate windows.
echo.
echo  Backend  →  http://localhost:8000
echo  API Docs →  http://localhost:8000/docs
echo  Frontend →  http://localhost:5173
echo.
pause
goto MENU


:: ─── START BACKEND ONLY ────────────────────────────────────────────────────
:START_BACKEND
echo.
start "FHG-Backend" /D "%BACKEND%" cmd /k "uv run fastapi run --reload app/main.py"
echo  ✓ Backend started → http://localhost:8000/docs
echo.
pause
goto MENU


:: ─── START FRONTEND ONLY ───────────────────────────────────────────────────
:START_FRONTEND
echo.
start "FHG-Frontend" /D "%FRONTEND%" cmd /k "bun dev"
echo  ✓ Frontend started → http://localhost:5173
echo.
pause
goto MENU


:: ─── SETUP (first time) ────────────────────────────────────────────────────
:SETUP
cls
echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║  SETUP — Run this once on first install      ║
echo  ╚══════════════════════════════════════════════╝
echo.

:: Step 1 — Check uv
echo  [1/5] Checking uv...
where uv >nul 2>&1
if %errorlevel% neq 0 (
    echo  ✗ uv not found. Install with:
    echo    powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
    pause
    goto MENU
)
echo  ✓ uv found.

:: Step 2 — Check bun / node
echo  [2/5] Checking bun...
where bun >nul 2>&1
if %errorlevel% neq 0 (
    echo  ✗ bun not found. Install with:
    echo    powershell -c "irm https://bun.sh/install.ps1 | iex"
    echo  (or use: npm run dev instead of bun dev)
    pause
    goto MENU
)
echo  ✓ bun found.

:: Step 3 — Create PostgreSQL DB
echo  [3/5] PostgreSQL setup...
echo.
echo  Chay lenh nay trong psql (run as postgres admin):
echo  ─────────────────────────────────────────────────
echo    CREATE USER fusion WITH PASSWORD 'FusionDB2026!';
echo    CREATE DATABASE fusion_bdp OWNER fusion;
echo  ─────────────────────────────────────────────────
echo.
set /p dbdone="  Da tao DB xong chua? (Y/N): "
if /i not "%dbdone%"=="Y" (
    echo  Tao DB truoc roi chay Setup lai.
    pause
    goto MENU
)

:: Step 4 — Install backend deps
echo  [4/5] Installing backend dependencies...
cd /D "%BACKEND%"
uv sync
if %errorlevel% neq 0 (
    echo  ✗ uv sync failed.
    pause
    goto MENU
)
echo  ✓ Backend deps installed.

:: Step 5 — Run migrations + initial data
echo  [5/5] Running DB migrations + creating superuser...
uv run python -m app.backend_pre_start
uv run alembic upgrade head
uv run python -m app.initial_data
if %errorlevel% neq 0 (
    echo  ✗ Migration failed. Check DB connection in .env
    pause
    goto MENU
)
echo  ✓ DB migrated.

:: Install frontend deps
echo.
echo  Installing frontend dependencies...
cd /D "%FRONTEND%"
bun install
echo  ✓ Frontend deps installed.

echo.
echo  ══════════════════════════════════════════
echo  ✓ Setup complete!
echo  Superuser: admin@fusionhotel.com
echo  Password : FusionAdmin2026!
echo.
echo  → Chon [1] Start de chay app
echo  ══════════════════════════════════════════
echo.
cd /D "%ROOT%"
pause
goto MENU


:: ─── MIGRATE ───────────────────────────────────────────────────────────────
:MIGRATE
echo.
echo  Running alembic upgrade head...
cd /D "%BACKEND%"
uv run alembic upgrade head
if %errorlevel% equ 0 (
    echo  ✓ Migration done.
) else (
    echo  ✗ Migration failed. Check error above.
)
cd /D "%ROOT%"
echo.
pause
goto MENU


:: ─── GENERATE API CLIENT ───────────────────────────────────────────────────
:GEN_CLIENT
echo.
echo  Generating frontend API client from OpenAPI spec...
echo  (Backend phai dang chay tai http://localhost:8000)
echo.
cd /D "%FRONTEND%"
bun run generate-client
if %errorlevel% equ 0 (
    echo  ✓ Client generated → src/client/
) else (
    echo  ✗ Failed. Make sure backend is running first.
)
cd /D "%ROOT%"
echo.
pause
goto MENU


:: ─── OPEN BROWSER ──────────────────────────────────────────────────────────
:OPEN
start http://localhost:5173
start http://localhost:8000/docs
goto MENU


:END
cd /D "%ROOT%"
exit
