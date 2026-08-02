# Load environment variables from .env file if it exists
if (Test-Path "$PSScriptRoot\.env") {
    Get-Content "$PSScriptRoot\.env" | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            $parts = $line.Split('=', 2)
            if ($parts.Length -eq 2) {
                $name = $parts[0].Trim()
                $value = $parts[1].Trim().Trim('"').Trim("'")
                [System.Environment]::SetEnvironmentVariable($name, $value)
                Set-Item "env:$name" $value
            }
        }
    }
}
$env:SPRING_PROFILES_ACTIVE = "local-dev"
$env:EMAIL_VERIFICATION_URL = "http://localhost:8080/auth/verify-email"
$env:UPLOAD_DIR = "$PSScriptRoot\uploads\"
Remove-Item Env:PORT -ErrorAction SilentlyContinue


# Start infrastructure
docker-compose up -d

# Stop any running Java processes to avoid port conflicts
Write-Host "Stopping any running Java processes..."
Stop-Process -Name java -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Clear specific microservice ports if they are still held using netstat (much faster, avoids Get-NetTCPConnection hangs)
$ports = @(8761, 8080, 8087, 8083, 8082, 8084, 8085, 8086)
Write-Host "Clearing microservice ports if held..."
foreach ($port in $ports) {
    $netstat = netstat -ano | Select-String ":$port\s+"
    foreach ($line in $netstat) {
        if ($line -match '(\d+)$') {
            $pidToKill = [int]$Matches[1]
            if ($pidToKill -ne 0 -and $pidToKill -ne $PID) {
                Write-Host "Killing process $pidToKill listening on port $port..."
                Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
            }
        }
    }
}
Start-Sleep -Seconds 2

# Wait a few seconds for DB and RabbitMQ to be ready
Start-Sleep -Seconds 8

$modules = @(
    "eureka-server", 
    "api-gateway", 
    "auth-service", 
    "user-service", 
    "request-service", 
    "job-service", 
    "payment-service", 
    "supporting-service"
)

foreach ($module in $modules) {
    Write-Host "Starting $module (headless)..."
    $logFile = "$PSScriptRoot\$module.log"
    $errFile = "$PSScriptRoot\$module-err.log"
    
    Start-Process -FilePath "C:\Tools\maven\bin\mvn.cmd" -ArgumentList "spring-boot:run -Dspring-boot.run.jvmArguments=`"-Dspring.profiles.active=local-dev -DJWT_SECRET=$env:JWT_SECRET -DINTERNAL_SERVICE_SECRET=$env:INTERNAL_SERVICE_SECRET -DBREVO_API_KEY=$env:BREVO_API_KEY -DBREVO_SENDER_EMAIL=$env:BREVO_SENDER_EMAIL -DBREVO_SENDER_NAME=$env:BREVO_SENDER_NAME -Xmx192m -XX:TieredStopAtLevel=1`"" -WorkingDirectory "$PSScriptRoot\$module" -WindowStyle Hidden -RedirectStandardOutput $logFile -RedirectStandardError $errFile
    
    if ($module -eq "eureka-server") {
        Write-Host "Waiting 15 seconds for Eureka to initialize..."
        Start-Sleep -Seconds 15
    }
    
    if ($module -eq "auth-service") {
        Write-Host "Waiting 30 seconds for auth-service to complete Flyway migrations before starting others..."
        Start-Sleep -Seconds 30
    }
}

Write-Host "All services started in headless mode. Logs are being written to backend folder."
Write-Host "Keeping script alive to prevent child processes from being terminated..."
while ($true) {
    Start-Sleep -Seconds 60
}
