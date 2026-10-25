@echo off
title Envíos YA! - Calculadora de Tasas P2P y Generador de Flyers
echo ========================================================
echo   INICIANDO MOTOR DE TASAS BINANCE P2P Y GENERADOR
echo ========================================================
echo.
echo Abriendo navegador en http://localhost:8000 ...
start http://localhost:8000
echo.
echo Presiona Ctrl+C para detener el servidor.
echo.
python -m uvicorn app:app --host 0.0.0.0 --port 8000
pause
