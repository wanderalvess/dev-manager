@echo off
rem Instala os extras colocados nesta mesma pasta do release (links no LEIA-ME.txt):
rem   - Modelo do RAG:          sentence-transformers-all-MiniLM-L6-v2.tar.gz
rem   - Oracle Instant Client:  instantclient-*-windows.x64-*.zip  (Basic e, para backup, Tools)
rem Usa o tar nativo do Windows 10+, que extrai .tar.gz e .zip.
setlocal enableextensions
set "HERE=%~dp0"
set "MODELS_DIR=%APPDATA%\dev-manager\models"
set "MODEL_NAME=fast-all-MiniLM-L6-v2"
if not defined ORACLE_DIR set "ORACLE_DIR=C:\oracle"
set "FOUND=0"
rem Caminho fixo: um tar GNU no PATH (ex.: Git for Windows) nao entende caminhos C:\.
set "TAR=%SystemRoot%\System32\tar.exe"

if not exist "%TAR%" goto no_tar

for %%F in ("%HERE%sentence-transformers-all-MiniLM-L6-v2.tar.gz" "%HERE%%MODEL_NAME%.tar.gz") do (
  if exist "%%~F" call :install_model "%%~F"
)

for %%F in ("%HERE%instantclient-*.zip") do call :install_oracle "%%~F"

if "%FOUND%"=="0" echo Nenhum extra encontrado nesta pasta. Veja o LEIA-ME.txt para os links de download.
if exist "%ORACLE_DIR%\instantclient_*" (
  echo.
  echo Pastas do Instant Client em %ORACLE_DIR%:
  for /d %%D in ("%ORACLE_DIR%\instantclient_*") do echo   %%D
  echo Informe a pasta em Banco de Dados - Conexao - "Diretorio do Oracle Instant Client".
)
goto end

:install_model
set "FOUND=1"
echo Instalando o modelo do RAG a partir de %~nx1 ...
if not exist "%MODELS_DIR%" mkdir "%MODELS_DIR%"
"%TAR%" -xzf "%~1" -C "%MODELS_DIR%"
if exist "%MODELS_DIR%\%MODEL_NAME%\model.onnx" (
  echo   OK: modelo instalado em %MODELS_DIR%\%MODEL_NAME%
) else (
  echo   ATENCAO: model.onnx nao encontrado em %MODELS_DIR%\%MODEL_NAME% depois de extrair.
)
exit /b 0

:install_oracle
set "FOUND=1"
echo Extraindo %~nx1 para %ORACLE_DIR% ...
if not exist "%ORACLE_DIR%" mkdir "%ORACLE_DIR%"
"%TAR%" -xf "%~1" -C "%ORACLE_DIR%"
if errorlevel 1 echo   ATENCAO: falha ao extrair %~nx1.
exit /b 0

:no_tar
echo O utilitario tar do Windows nao foi encontrado - requer Windows 10 versao 1803 ou mais nova.
echo Extraia os arquivos manualmente seguindo o LEIA-ME.txt.

:end
echo.
pause
