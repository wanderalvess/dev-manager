@echo off
setlocal
set "BASE=%~dp0"
if "%BASE:~-1%"=="\" set "BASE=%BASE:~0,-1%"

:menu
cls
echo ============================================
echo   Reiniciar servico - SoftClinic Genesys
echo ============================================
echo   1 - SSO      (porta 8787)
echo   2 - Gateway  (porta 8080)
echo   3 - API      (porta 8888)
echo   4 - App      (porta 3000)
echo   5 - Todos
echo   0 - Cancelar
echo ============================================
set /p opt="Escolha uma opcao: "

if "%opt%"=="1" (call :restart_one "SSO" 8787 _run-sso.bat & goto end)
if "%opt%"=="2" (call :restart_one "Gateway" 8080 _run-gateway.bat & goto end)
if "%opt%"=="3" (call :restart_one "API" 8888 _run-api.bat & goto end)
if "%opt%"=="4" (call :restart_one "App" 3000 _run-app.bat & goto end)
if "%opt%"=="5" goto restart_all
if "%opt%"=="0" goto end

echo.
echo Opcao invalida.
timeout /t 2 /nobreak >nul
goto menu

:restart_all
call :restart_one "SSO" 8787 _run-sso.bat
call :restart_one "Gateway" 8080 _run-gateway.bat
call :restart_one "API" 8888 _run-api.bat
call :restart_one "App" 3000 _run-app.bat
goto end

:restart_one
set "NAME=%~1"
set "PORT=%~2"
set "SCRIPT=%~3"

echo.
echo ============================================
echo  Parando %NAME% (porta %PORT%)
echo ============================================
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
    taskkill /F /T /PID %%p >nul 2>&1
)
timeout /t 2 /nobreak >nul

echo Subindo %NAME% de novo...
where wt >nul 2>&1
if errorlevel 1 (
    start "%NAME%" cmd /k "%BASE%\%SCRIPT%"
) else (
    wt -w softclinic new-tab --title "%NAME%" -d "%BASE%" cmd /k "%BASE%\%SCRIPT%"
)
goto :eof

:end
echo.
echo ============================================
echo  Feito. A aba/janela antiga (se existia) fica
echo  parada na tela - pode fechar ela manualmente.
echo ============================================
pause
