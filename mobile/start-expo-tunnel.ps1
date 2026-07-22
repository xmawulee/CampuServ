# start-expo-tunnel.ps1
# ─────────────────────────────────────────────────────────────────────────────
# Starts Expo using the persistent ngrok static domain so the QR code URL
# never changes between restarts.
#
# Static domain: https://blank-aide-tile.ngrok-free.dev
# ─────────────────────────────────────────────────────────────────────────────

$STATIC_DOMAIN = "https://blank-aide-tile.ngrok-free.dev"

Write-Host "=========================================="
Write-Host " CampusServ Expo — Static Tunnel Mode"
Write-Host "=========================================="
Write-Host ""

# Kill any lingering ngrok processes so the static domain isn't already claimed
$ngrokProcs = Get-Process -Name "ngrok" -ErrorAction SilentlyContinue
if ($ngrokProcs) {
    Write-Host "[1/3] Stopping old ngrok processes..."
    $ngrokProcs | Stop-Process -Force
    Start-Sleep -Seconds 1
}

# Kill any lingering Expo / Metro processes on port 8081
$port8081 = netstat -ano | Select-String ":8081 " | ForEach-Object {
    ($_ -split '\s+')[-1]
} | Sort-Object -Unique
foreach ($p in $port8081) {
    if ($p -match '^\d+$' -and $p -ne "0") {
        try { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue } catch {}
    }
}

Write-Host "[2/3] Starting ngrok with static domain $STATIC_DOMAIN..."
# Launch ngrok using the named 'expo' tunnel defined in ngrok.yml
Start-Process -NoNewWindow -FilePath "ngrok" -ArgumentList "start expo"

# Wait for ngrok to establish the tunnel
Write-Host "      Waiting 5 seconds for ngrok to connect..."
Start-Sleep -Seconds 5

# Verify the tunnel is up
$tunnelCheck = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -ErrorAction SilentlyContinue
if ($tunnelCheck -and $tunnelCheck.tunnels.Count -gt 0) {
    Write-Host "      Tunnel live: $STATIC_DOMAIN" -ForegroundColor Green
} else {
    Write-Host "      Warning: Could not verify tunnel — Expo will start anyway." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[3/3] Starting Expo Metro Bundler..."
Write-Host "      Your app URL: exp://blank-aide-tile.ngrok-free.dev"
Write-Host "      This URL is PERMANENT — share it once and it works forever!"
Write-Host ""

# Tell Expo to use our already-running ngrok tunnel instead of starting its own
$env:EXPO_PACKAGER_PROXY_URL = $STATIC_DOMAIN

# Load .env variables
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^\s*([^#=]+)=(.*)$") {
            $key = $matches[1].Trim()
            $val = $matches[2].Trim()
            [System.Environment]::SetEnvironmentVariable($key, $val, "Process")
        }
    }
}

# Start Expo without --tunnel flag (ngrok is already running)
$env:EXPO_OFFLINE = "1"
npx expo start --clear --lan
