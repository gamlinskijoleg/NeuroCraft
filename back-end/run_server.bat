@echo off
REM Activate virtual environment
call venv\Scripts\activate.bat

REM Enable local debug crops
set ENVIRONMENT=local
set SAVE_DEBUG_CROPS=true

REM Run the FastAPI server
python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000

pause
