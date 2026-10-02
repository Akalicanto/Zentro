@echo off
cd /d "%~dp0"
echo Zentro se iniciara en http://127.0.0.1:5187
echo Para detenerlo, pulsa Ctrl+C en esta ventana.
call npm run dev
