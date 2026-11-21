@echo off
echo ==============================================================================
echo HotelManagementOS - Build Local AI KYC Vision Extractor Model
echo ==============================================================================
echo.

where ollama >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Ollama command line is not found on your system PATH!
    echo Please download and install Ollama from: https://ollama.com/download/windows
    echo After installing, open a new command prompt and re-run this script.
    pause
    exit /b 1
)

echo [1/3] Checking base model (llama3.2-vision)...
echo Pulling llama3.2-vision (if not already downloaded)...
ollama pull llama3.2-vision

echo.
echo [2/3] Building custom KYC model 'hotel-id-extractor' from Modelfile...
ollama create hotel-id-extractor -f Modelfile

echo.
echo [3/3] Verifying model installation...
ollama list | findstr "hotel-id-extractor"

if %ERRORLEVEL% equ 0 (
    echo.
    echo ==============================================================================
    echo [SUCCESS] 'hotel-id-extractor' is ready!
    echo Your HotelManagementOS backend will now automatically use this local vision AI!
    echo ==============================================================================
) else (
    echo.
    echo [WARNING] Model build completed. Please check 'ollama list' to confirm.
)

pause
