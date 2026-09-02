@echo off
set "JAVA_HOME=C:\Users\wande\.jdks\ms-21.0.8"
cd /d "%~dp0softclinic-genesys-api"
cmd /c .\mvnw.cmd spring-boot:run
echo.
echo [API encerrada - codigo %errorlevel%]
pause
