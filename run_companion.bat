@echo off
title Descarga Videos - Native yt-dlp Companion Server
echo ======================================================================
echo           DESCARGA VIDEOS - NATIVE COMPANION SERVER (yt-dlp)
echo ======================================================================
echo  [*] Conectando motor de descarga avanzado con la extension Firefox...
echo  [*] Puerto por defecto: http://127.0.0.1:5000
echo  [*] Modo API CORS: Habilitado para extensiones de navegador.
echo ======================================================================
echo.

python "%~dp0Nueva carpeta\gui_server.py" %*

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] El servidor se detuvo con codigo de error %ERRORLEVEL%.
    pause
)
