@echo off
setlocal
set "BASE=%~dp0"
if "%BASE:~-1%"=="\" set "BASE=%BASE:~0,-1%"

echo ============================================
echo  Verificando Docker Desktop
echo ============================================
docker info >nul 2>&1
if not errorlevel 1 goto dockerok

echo Docker Desktop nao esta rodando. Abrindo...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

:waitdocker
echo Aguardando Docker iniciar (isso pode levar ~1 minuto)...
timeout /t 5 /nobreak >nul
docker info >nul 2>&1
if errorlevel 1 goto waitdocker

:dockerok
echo Docker pronto.

echo.
echo ============================================
echo  Subindo banco de dados (Docker: banco-re)
echo ============================================
docker start banco-re >nul 2>&1
if errorlevel 1 (
    docker run -d --name banco-re -p 5432:5432 -e POSTGRES_PASSWORD=postgres vtzndv/banco-re:latest
)

where wt >nul 2>&1
if errorlevel 1 goto fallback

echo.
echo ============================================
echo  Abrindo tudo em UMA janela (Windows Terminal, com abas)
echo ============================================
wt -w softclinic new-tab --title "SSO" -d "%BASE%" cmd /k "%BASE%\_run-sso.bat"
wt -w softclinic new-tab --title "Gateway" -d "%BASE%" cmd /k "%BASE%\_run-gateway.bat"
wt -w softclinic new-tab --title "API" -d "%BASE%" cmd /k "%BASE%\_run-api.bat"
wt -w softclinic new-tab --title "App" -d "%BASE%" cmd /k "%BASE%\_run-app.bat"
goto done

:fallback
echo Windows Terminal nao encontrado, abrindo em janelas separadas...
start "SSO - 8787" cmd /k "%BASE%\_run-sso.bat"
start "Gateway - 8080" cmd /k "%BASE%\_run-gateway.bat"
start "API - 8888" cmd /k "%BASE%\_run-api.bat"
start "App - 3000" cmd /k "%BASE%\_run-app.bat"

:done
echo.
echo ============================================
echo  Tudo disparado!
echo  Se uma aba/janela mostrar erro, ela fica aberta
echo  (nao fecha sozinha) - so fechar quando quiser.
echo  Tempo estimado ate tudo pronto: ~2 minutos.
echo    SSO      -^> http://localhost:8787
echo    Gateway  -^> http://localhost:8080
echo    API      -^> http://localhost:8888
echo    App      -^> http://localhost:3000
echo ============================================
pause
