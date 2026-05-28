@echo off
echo TIR Fleet Management baslatiliyor...

start "API" cmd /k "cd /d %~dp0 && uvicorn backend.main:app --reload --port 8000"
timeout /t 3 /nobreak > nul
start "Dashboard" cmd /k "cd /d %~dp0 && streamlit run dashboard/app.py --server.port 8501"
timeout /t 2 /nobreak > nul
start "Telegram Bot" cmd /k "cd /d %~dp0 && py bot/main.py"

echo.
echo API: http://localhost:8000
echo Dashboard: http://localhost:8501
echo Bot: Calisıyor
