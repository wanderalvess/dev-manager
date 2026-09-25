@echo off
rem Launcher do servidor MCP do Dev Manager (stdio).
rem Nada pode ir para stdout aqui fora o proprio servidor: stdout e o canal do protocolo MCP.
rem Runtime: o Dev Manager.exe instalado (Electron rodando como Node) ou, na falta dele, o Node do PATH.
setlocal
set "MCP_SCRIPT=%~dp0dev-manager-mcp.mjs"

if defined DEV_MANAGER_EXE if exist "%DEV_MANAGER_EXE%" goto run_app
set "DEV_MANAGER_EXE=%LOCALAPPDATA%\Programs\Dev Manager\Dev Manager.exe"
if exist "%DEV_MANAGER_EXE%" goto run_app
set "DEV_MANAGER_EXE=%ProgramFiles%\Dev Manager\Dev Manager.exe"
if exist "%DEV_MANAGER_EXE%" goto run_app

where node >nul 2>nul
if not errorlevel 1 goto run_node

echo [dev-manager-mcp] Dev Manager.exe nao encontrado e Node.js nao esta no PATH. 1>&2
echo [dev-manager-mcp] Instale o Dev Manager pelo Setup ou defina DEV_MANAGER_EXE com o caminho do executavel. 1>&2
exit /b 1

:run_app
set "ELECTRON_RUN_AS_NODE=1"
"%DEV_MANAGER_EXE%" "%MCP_SCRIPT%" %*
exit /b %errorlevel%

:run_node
node "%MCP_SCRIPT%" %*
exit /b %errorlevel%
