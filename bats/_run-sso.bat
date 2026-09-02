@echo off
set "JAVA_HOME=C:\Users\wande\.jdks\ms-21.0.8"
cd /d "%~dp0softclinic-genesys-sso"
cmd /c .\gradlew.bat bootRun
echo.
echo [SSO encerrado - codigo %errorlevel%]
pause
