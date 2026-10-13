@echo off
cd /d "%~dp0"
if not exist .venv (py -m venv .venv)
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe server.py --host 0.0.0.0 --port 8844
pause
