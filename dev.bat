@echo off
chcp 65001 >nul
title Fusion BD CORE OS — Local Dev

:MENU
cls
echo.
echo  ╔══════════════════════════════════════════╗
echo  ║     Fusion BD CORE OS — Local Dev        ║
echo  ╚══════════════════════════════════════════╝
echo.
echo  [1]  Start          (build + run background)
echo  [2]  Stop
echo  [3]  Restart
echo  [4]  Logs — all services
echo  [5]  Logs — backend only
echo  [6]  Logs — frontend only
echo  [7]  Open in browser
echo  [8]  DB shell  (psql)
echo  [9]  Backend shell
echo  [R]  Reset ALL data  (down -v + rebuild)
echo  [Q]  Quit
echo.
set /p choice="  Choice: "

if /i "%choice%"=="1" goto START
if /i "%choice%"=="2" goto STOP
if /i "%choice%"=="3" goto RESTART
if /i "%choice%"=="4" goto LOGS_ALL
if /i "%choice%"=="5" goto LOGS_BACKEND
if /i "%choice%"=="6" goto LOGS_FRONTEND
if /i "%choice%"=="7" goto OPEN
if /i "%choice%"=="8" goto DB_SHELL
if /i "%choice%"=="9" goto BACKEND_SHELL
if /i "%choice%"=="R" goto RESET
if /i "%choice%"=="r" goto RESET
if /i "%choice%"=="Q" goto END
if /i "%choice%"=="q" goto END
goto MENU

:START
echo.
echo  Starting stack...
docker compose up --build -d
echo.
echo  ✓ Stack started. URLs:
echo    Frontend      →  http://localhost:5173
echo    API Docs      →  http://localhost:8000/docs
echo    Adminer       →  http://localhost:8080
echo    MinIO Console →  http://localhost:9001
echo    Mailcatcher   →  http://localhost:1080
echo.
pause
goto MENU

:STOP
echo.
echo  Stopping stack...
docker compose down
echo  ✓ Done.
pause
goto MENU

:RESTART
echo.
echo  Restarting stack...
docker compose down
docker compose up --build -d
echo  ✓ Restarted.
pause
goto MENU

:LOGS_ALL
echo.
echo  Press Ctrl+C to exit logs.
echo.
docker compose logs -f
pause
goto MENU

:LOGS_BACKEND
echo.
echo  Press Ctrl+C to exit logs.
echo.
docker compose logs -f backend
pause
goto MENU

:LOGS_FRONTEND
echo.
echo  Press Ctrl+C to exit logs.
echo.
docker compose logs -f frontend
pause
goto MENU

:OPEN
start http://localhost:5173
start http://localhost:8000/docs
start http://localhost:9001
goto MENU

:DB_SHELL
echo.
docker compose exec db psql -U fusion -d fusion_bdp
pause
goto MENU

:BACKEND_SHELL
echo.
docker compose exec backend bash
pause
goto MENU

:RESET
echo.
echo  ╔══════════════════════════════════════════╗
echo  ║  WARNING: This deletes ALL local data!   ║
echo  ╚══════════════════════════════════════════╝
echo.
set /p confirm="  Type YES to confirm: "
if /i "%confirm%"=="YES" (
    echo  Resetting...
    docker compose down -v
    docker compose up --build -d
    echo  ✓ Reset complete. Fresh database.
) else (
    echo  Cancelled.
)
pause
goto MENU

:END
exit
