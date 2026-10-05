@echo off
rem Launcher do servidor MCP do Hub Manager (stdio).
rem Nada pode ir para stdout aqui fora o proprio servidor: stdout e o canal do protocolo MCP.
rem Runtime: o Hub Manager.exe instalado (Electron rodando como Node) ou, na falta dele, o Node do PATH.
setlocal
set "MCP_SCRIPT=%~dp0dev-manager-mcp.mjs"

if defined HUB_MANAGER_EXE if exist "%HUB_MANAGER_EXE%" (
  set "TARGET_EXE=%HUB_MANAGER_EXE%"
  goto run_app
)
if defined DEV_MANAGER_EXE if exist "%DEV_MANAGER_EXE%" (
  set "TARGET_EXE=%DEV_MANAGER_EXE%"
  goto run_app
)
if exist "%LOCALAPPDATA%\Programs\Hub Manager\Hub Manager.exe" (
  set "TARGET_EXE=%LOCALAPPDATA%\Programs\Hub Manager\Hub Manager.exe"
  goto run_app
)
if exist "%ProgramFiles%\Hub Manager\Hub Manager.exe" (
  set "TARGET_EXE=%ProgramFiles%\Hub Manager\Hub Manager.exe"
  goto run_app
)
if exist "%LOCALAPPDATA%\Programs\Dev Manager\Dev Manager.exe" (
  set "TARGET_EXE=%LOCALAPPDATA%\Programs\Dev Manager\Dev Manager.exe"
  goto run_app
)
if exist "%ProgramFiles%\Dev Manager\Dev Manager.exe" (
  set "TARGET_EXE=%ProgramFiles%\Dev Manager\Dev Manager.exe"
  goto run_app
)

where node >nul 2>nul
if not errorlevel 1 goto run_node

echo [hub-manager-mcp] Hub Manager.exe nao encontrado e Node.js nao esta no PATH. 1>&2
echo [hub-manager-mcp] Instale o Hub Manager pelo Setup ou defina HUB_MANAGER_EXE com o caminho do executavel. 1>&2
exit /b 1

:run_app
set "ELECTRON_RUN_AS_NODE=1"
"%TARGET_EXE%" "%MCP_SCRIPT%" %*
exit /b %errorlevel%

:run_node
node "%MCP_SCRIPT%" %*
exit /b %errorlevel%
