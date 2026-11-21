@echo off
title SPTech AI Attendance System Launcher
echo ========================================================
echo    SPTech AI Attendance & Payroll Demo Launcher
echo ========================================================
echo.

echo 1. Launching InsightFace AI Biometric Microservice (Port 5001)...
start "SPTech AI Microservice (5001)" cmd /k "cd /d %~dp0 && python ai_service\main.py"
timeout /t 4 /nobreak >nul

echo 2. Launching Node.js Backend API Server (Port 5000)...
start "SPTech Backend API (5000)" cmd /k "cd /d %~dp0backend && npm start"
timeout /t 3 /nobreak >nul

echo 3. Launching Frontend & Kiosk Progressive Web App (Port 3000)...
start "SPTech Frontend PWA (3000)" cmd /k "cd /d %~dp0frontend && npm run dev -- --port 3000 --host"
timeout /t 3 /nobreak >nul

echo.
echo ========================================================
echo  All 3 services are active!
echo  - Mobile Kiosk PWA: http://localhost:3000/kiosk
echo  - Admin Management: http://localhost:3000/login
echo ========================================================
pause
