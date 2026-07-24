$env:SPRING_PROFILES_ACTIVE = "local-dev"
$env:BREVO_API_KEY = "REDACTED"
$env:BREVO_SENDER_EMAIL = "marshalldalton435@gmail.com"
$env:BREVO_SENDER_NAME = "CampusServ"
$env:EMAIL_VERIFICATION_URL = "http://localhost:8080/auth/verify-email"
$env:UPLOAD_DIR = "$PSScriptRoot\uploads\"
$env:JWT_SECRET = "dGhlLXN1cGVyLXNlY3JldC1jb25mZGVudGlhbC1qd3Qta2V5LWZvci1jYW1wdXNzZXJ2LWtudXN0LWdyb3VwLTg4"
$env:GOOGLE_API_KEY = "AIzaSyCO_EY_6hSn0bxRQJdZq9GLdX5_LIIhcK0"
$env:ADMIN_SEED_EMAIL = "admin@campusserv.com"
$env:ADMIN_SEED_PASSWORD = "admin123"

# Start infrastructure
docker-compose up -d

# Stop any running Java processes to avoid port conflicts
Write-Host "Stopping any running Java processes..."
Stop-Process -Name java -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Clear specific microservice ports if they are still held
$ports = @(8761, 8080, 8087, 8083, 8082, 8084, 8085, 8086)
Write-Host "Clearing microservice ports if held..."
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            $owningPid = $conn.OwningProcess
            if ($owningPid -and $owningPid -ne 0) {
                Write-Host "Killing process $owningPid listening on port $port..."
                Stop-Process -Id $owningPid -Force -ErrorAction SilentlyContinue
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
}

Write-Host "All services started in headless mode. Logs are being written to backend folder."
Write-Host "Keeping script alive to prevent child processes from being terminated..."
while ($true) {
    Start-Sleep -Seconds 60
}
