$env:SPRING_PROFILES_ACTIVE = "local-dev"
$env:BREVO_API_KEY = "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"
$env:BREVO_SENDER_EMAIL = "marshalldalton435@gmail.com"
$env:BREVO_SENDER_NAME = "CampusServ"
$env:EMAIL_VERIFICATION_URL = "http://localhost:8080/auth/verify-email"
$env:UPLOAD_DIR = "$PSScriptRoot\uploads\"
$env:JWT_SECRET = "dGhlLXN1cGVyLXNlY3JldC1jb25mZGVudGlhbC1qd3Qta2V5LWZvci1jYW1wdXNzZXJ2LWtudXN0LWdyb3VwLTg4"
$env:INTERNAL_SERVICE_SECRET = "default_internal_service_secret_knust_campusserv_2026"
$env:GOOGLE_API_KEY = "AIzaSyCO_EY_6hSn0bxRQJdZq9GLdX5_LIIhcK0"
$env:ADMIN_SEED_EMAIL = "admin@campusserv.com"
$env:ADMIN_SEED_PASSWORD = "admin123"

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
    
    Start-Process -FilePath "C:\Tools\maven\bin\mvn.cmd" -ArgumentList "spring-boot:run -Dspring-boot.run.jvmArguments=`"-Xmx192m -XX:TieredStopAtLevel=1`"" -WorkingDirectory "$PSScriptRoot\$module" -WindowStyle Hidden -RedirectStandardOutput $logFile -RedirectStandardError $errFile
    
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
