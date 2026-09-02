@echo off
cd /d "%~dp0softclinic-genesys-app"
cmd /c npm run dev
echo.
echo [App encerrado - codigo %errorlevel%]
pause
