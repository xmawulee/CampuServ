# Script to start Expo with Cloudflare Tunnel automatically!
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Starting Expo via Cloudflare Tunnel" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Kill existing cloudflared tunnels running for Expo (port 8081)
# Note: we don't kill all cloudflared, only the ones with 8081
$runningCloudflared = Get-CimInstance Win32_Process | Where-Object { $_.Name -match "cloudflared" -and $_.CommandLine -match "8081" }
if ($runningCloudflared) {
    Stop-Process -Id $runningCloudflared.ProcessId -Force -ErrorAction SilentlyContinue
}

Write-Host "Cleaning up orphaned Metro bundler processes on port 8081..." -ForegroundColor DarkGray
$port8081Pids = (Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue).OwningProcess
if ($port8081Pids) {
    foreach ($procId in $port8081Pids) {
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
}

$logFile = "cloudflare-expo.log"
if (Test-Path $logFile) { Remove-Item $logFile -Force }

Write-Host "Launching Cloudflare Tunnel for Metro (port 8081)..."
Start-Process -FilePath "cloudflared" -ArgumentList "tunnel --protocol http2 --url http://localhost:8081" -RedirectStandardError $logFile -WindowStyle Hidden

Write-Host "Waiting for tunnel URL..."
$tunnelUrl = $null
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $logFile) {
        $lines = Get-Content $logFile
        foreach ($line in $lines) {
            if ($line -match "https://([a-zA-Z0-9-]+\.trycloudflare\.com)") {
                $tunnelUrl = $matches[1]
                break
            }
        }
    }
    if ($tunnelUrl) { break }
}

if (-not $tunnelUrl) {
    Write-Host "Failed to get Cloudflare Tunnel URL! Check $logFile" -ForegroundColor Red
    exit 1
}

Write-Host "Cloudflare Tunnel active at: " -NoNewline
Write-Host "https://$tunnelUrl" -ForegroundColor Green

Write-Host "Configuring Expo to use Cloudflare Tunnel..."
$env:REACT_NATIVE_PACKAGER_HOSTNAME = $tunnelUrl
$env:EXPO_PACKAGER_PROXY_URL = "https://$tunnelUrl"

# Run Expo!
Write-Host "Starting Expo server (with clean cache)..." -ForegroundColor Cyan
npx expo start -c
