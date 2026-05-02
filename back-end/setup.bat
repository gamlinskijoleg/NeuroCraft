@echo off
echo ======================================
echo EasyRoad Backend Setup
echo ======================================
echo.

REM Create virtual environment
echo [1/2] Creating virtual environment...
python -m venv venv
echo ✓ Virtual environment created

echo.
echo [2/2] Activating virtual environment and installing dependencies...
call venv\Scripts\activate.bat
pip install -r requirements.txt
echo ✓ Dependencies installed

echo ======================================
echo Setup Complete!
echo ======================================
echo.
echo To start the server, run:
echo   run_server.bat
echo.
echo Or manually:
echo   venv\Scripts\activate.bat
echo   python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000
echo.
pause
