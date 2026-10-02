@echo off
cd /d "%~dp0"
echo Zentro se iniciara en http://127.0.0.1:5187
echo Para detenerlo, pulsa Ctrl+C en esta ventana.
set "PATH=%ProgramFiles%\nodejs;%ProgramFiles%\dotnet;%ProgramFiles%\Git\cmd;%PATH%"
call npm.cmd run dev
if errorlevel 1 pause
