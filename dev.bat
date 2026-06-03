@echo off
title Fusion BD CORE OS - Dev

set ROOT=%~dp0
if "%ROOT:~-1%"=="\" set ROOT=%ROOT:~0,-1%

set BACKEND=%ROOT%\backend
set FRONTEND=%ROOT%\frontend

:MENU
cls
echo.
echo  ================================================
echo   Fusion BD CORE OS - Local Dev
echo  ================================================
echo.
echo   [1] Start All     (backend + frontend)
echo   [2] Start Backend only
echo   [3] Start Frontend only
echo   ------------------------------------------------
echo   [S] Setup         (chay lan dau tien)
echo   [M] Migrate DB    (alembic upgrade head)
echo   [G] Generate client (sau khi doi API)
echo   ------------------------------------------------
echo   [O] Mo browser
echo   [Q] Thoat
echo.
set /p choice="  Chon: "

if /i "%choice%"=="1" goto START_ALL
if /i "%choice%"=="2" goto START_BACKEND
if /i "%choice%"=="3" goto START_FRONTEND
if /i "%choice%"=="S" goto SETUP
if /i "%choice%"=="M" goto MIGRATE
if /i "%choice%"=="G" goto GEN_CLIENT
if /i "%choice%"=="O" goto OPEN
if /i "%choice%"=="Q" goto END

echo   Lua chon khong hop le.
pause
goto MENU


:START_ALL
echo.
echo  Dang khoi dong Backend...
start "FHG-Backend" /D "%BACKEND%" cmd /k "echo === FUSION BACKEND === && uv run fastapi run --reload app/main.py"
timeout /t 2 /nobreak >nul
echo  Dang khoi dong Frontend...
start "FHG-Frontend" /D "%FRONTEND%" cmd /k "echo === FUSION FRONTEND === && bun install && bun dev"
echo.
echo  Done! Xem cac cua so vua mo.
echo  Backend  : http://localhost:8000
echo  API Docs : http://localhost:8000/docs
echo  Frontend : http://localhost:5173
echo.
pause
goto MENU


:START_BACKEND
echo.
start "FHG-Backend" /D "%BACKEND%" cmd /k "echo === FUSION BACKEND === && uv run fastapi run --reload app/main.py"
echo  Backend dang chay -> http://localhost:8000/docs
echo.
pause
goto MENU


:START_FRONTEND
echo.
start "FHG-Frontend" /D "%FRONTEND%" cmd /k "echo === FUSION FRONTEND === && bun install && bun dev"
echo  Frontend dang chay -> http://localhost:5173
echo.
pause
goto MENU


:SETUP
cls
echo.
echo  ================================================
echo   SETUP - Chi chay lan dau tien
echo  ================================================
echo.

echo  [1/5] Kiem tra uv...
where uv >nul 2>&1
if %errorlevel% neq 0 (
    echo  LOI: uv chua duoc cai.
    echo  Cai dat bang lenh sau trong PowerShell:
    echo    powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
    echo.
    pause
    goto MENU
)
echo  OK - uv da co.
echo.

echo  [2/5] Kiem tra bun...
where bun >nul 2>&1
if %errorlevel% neq 0 (
    echo  LOI: bun chua duoc cai.
    echo  Cai dat bang lenh sau trong PowerShell:
    echo    powershell -c "irm https://bun.sh/install.ps1 | iex"
    echo.
    pause
    goto MENU
)
echo  OK - bun da co.
echo.

echo  [3/5] Tao database PostgreSQL...
echo.
echo  Chay lenh sau trong psql (voi user postgres):
echo  ------------------------------------------------
echo    CREATE DATABASE fusion_bdp;
echo  ------------------------------------------------
echo  (Neu da tao roi thi bo qua buoc nay)
echo.
set /p dbdone="  Da tao DB xong chua? (Y de tiep tuc): "
if /i not "%dbdone%"=="Y" (
    echo  Tao DB truoc roi quay lai.
    pause
    goto MENU
)
echo.

echo  [4/5] Cai dat Python packages (uv sync)...
cd /D "%BACKEND%"
uv sync
if %errorlevel% neq 0 (
    echo.
    echo  LOI: uv sync that bai. Xem loi phia tren.
    pause
    cd /D "%ROOT%"
    goto MENU
)
echo  OK - Python packages da cai xong.
echo.

echo  [5/5] Chay DB migration va tao superuser...
uv run python -m app.backend_pre_start
if %errorlevel% neq 0 (
    echo.
    echo  LOI: Khong ket noi duoc PostgreSQL.
    echo  Kiem tra lai:
    echo   - PostgreSQL co dang chay khong?
    echo   - .env co dung POSTGRES_USER=postgres va POSTGRES_PASSWORD=postgres?
    pause
    cd /D "%ROOT%"
    goto MENU
)

uv run alembic upgrade head
if %errorlevel% neq 0 (
    echo.
    echo  LOI: Migration that bai. Xem loi phia tren.
    pause
    cd /D "%ROOT%"
    goto MENU
)

uv run python -m app.initial_data
if %errorlevel% neq 0 (
    echo.
    echo  LOI: Tao initial data that bai.
    pause
    cd /D "%ROOT%"
    goto MENU
)
echo  OK - DB migration va superuser da tao.
echo.

echo  Cai dat frontend packages (bun install)...
cd /D "%FRONTEND%"
bun install
if %errorlevel% neq 0 (
    echo.
    echo  LOI: bun install that bai.
    pause
    cd /D "%ROOT%"
    goto MENU
)
echo  OK - Frontend packages da cai xong.
echo.

cd /D "%ROOT%"
echo  ================================================
echo   Setup hoan tat!
echo.
echo   Superuser : admin@fusionhotel.com
echo   Password  : FusionAdmin2026!
echo.
echo   Chon [1] Start de chay app.
echo  ================================================
echo.
pause
goto MENU


:MIGRATE
echo.
echo  Dang chay alembic upgrade head...
cd /D "%BACKEND%"
uv run alembic upgrade head
if %errorlevel% equ 0 (
    echo  OK - Migration xong.
) else (
    echo  LOI - Xem loi phia tren.
)
cd /D "%ROOT%"
echo.
pause
goto MENU


:GEN_CLIENT
echo.
echo  Generating API client...
echo  (Backend phai dang chay tai localhost:8000)
echo.
echo  Buoc 1: Download openapi.json tu backend...
cd /D "%FRONTEND%"
curl -s -o openapi.json http://localhost:8000/api/v1/openapi.json
if %errorlevel% neq 0 (
    echo  LOI: Khong download duoc. Backend co dang chay khong?
    pause
    cd /D "%ROOT%"
    goto MENU
)
echo  OK - openapi.json downloaded.
echo.
echo  Buoc 2: Generate client...
bun run generate-client
if %errorlevel% equ 0 (
    echo  OK - Client da duoc update tai src/client/
    del openapi.json >nul 2>&1
) else (
    echo  LOI - Xem loi phia tren.
)
cd /D "%ROOT%"
echo.
pause
goto MENU


:OPEN
start http://localhost:5173
start http://localhost:8000/docs
goto MENU


:END
exit /b 0
