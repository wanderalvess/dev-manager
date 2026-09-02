@echo off
setlocal enabledelayedexpansion

echo ============================================
echo  Parando App (porta 3000)
echo ============================================
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    taskkill /F /T /PID %%p >nul 2>&1
)

echo Parando API (porta 8888)...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8888 " ^| findstr "LISTENING"') do (
    taskkill /F /T /PID %%p >nul 2>&1
)

echo Parando Gateway (porta 8080)...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8080 " ^| findstr "LISTENING"') do (
    taskkill /F /T /PID %%p >nul 2>&1
)

echo Parando SSO (porta 8787)...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8787 " ^| findstr "LISTENING"') do (
    taskkill /F /T /PID %%p >nul 2>&1
)

echo.
choice /C SN /M "Parar tambem o banco de dados (Docker: banco-re)?"
if errorlevel 2 goto :skipdb
docker stop banco-re
:skipdb

echo.
echo ============================================
echo  Tudo parado.
echo ============================================
pause
