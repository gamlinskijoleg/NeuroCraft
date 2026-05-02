@echo off
REM Activate virtual environment
call venv\Scripts\activate.bat

REM Run the FastAPI server
python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000

pause
