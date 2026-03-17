@echo off
title Chatbot Platform Launcher
echo ==========================================
echo 🔥 STARTING CHATBOT PLATFORM 🚀
echo ==========================================

:: 1. Start Backend
echo 🟢 Launching Backend Engine...
start cmd /k "cd backend-api && npm run dev"

:: 2. Wait 5 seconds for DB to connect
timeout /t 5 /nobreak > nul

:: 3. Start Frontend
echo 🔵 Launching Frontend Dashboard...
start cmd /k "cd frontend-dashboard && npm run dev"

:: 4. Start Cloudflare Tunnel
echo ☁️ Launching Cloudflare Tunnel...
start cmd /k "cloudflared tunnel --url http://localhost:4000"

:: 5. Open Live Debug Log
echo 📜 Opening Separate Log Monitor...
echo Waiting for first message to create log file...
timeout /t 3 /nobreak > nul
start powershell -NoExit -Command "if (Test-Path 'backend-api/webhook_debug.log') { Get-Content 'backend-api/webhook_debug.log' -Wait } else { Write-Host 'Waiting for first message to generate log...'; while (!(Test-Path 'backend-api/webhook_debug.log')) { Start-Sleep -s 1 }; Get-Content 'backend-api/webhook_debug.log' -Wait }"

echo ==========================================
echo ✅ ALL SYSTEMS INITIALIZED
echo 1. Copy URL from Cloudflare window
echo 2. Update Meta Dashboard: URL/api/webhook
echo 3. Verify Token: yuvraj_secret_token_2026
echo ==========================================
pause