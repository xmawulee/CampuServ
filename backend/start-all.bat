@echo off
set SPRING_PROFILES_ACTIVE=local-dev
set BREVO_API_KEY=REDACTED
set BREVO_SENDER_EMAIL=marshalldalton435@gmail.com
set BREVO_SENDER_NAME=CampusServ
set EMAIL_VERIFICATION_URL=http://localhost:8080/auth/verify-email
set UPLOAD_DIR=c:\Users\allen\Desktop\CampuServ\backend\uploads\


echo Stopping existing services on ports 8761, 8080, 8087, 8083, 8082, 8084, 8085, 8086...
for %%p in (8761 8080 8087 8083 8082 8084 8085 8086) do (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%%p ^| findstr LISTENING') do (
        echo Killing process %%a on port %%p...
        taskkill /f /pid %%a >nul 2>&1
    )
)
ping 127.0.0.1 -n 3 >nul

echo Starting Eureka Server...
start /b cmd /c "cd eureka-server && mvn spring-boot:run"
ping 127.0.0.1 -n 11 >nul
echo Starting API Gateway...
start /b cmd /c "cd api-gateway && mvn spring-boot:run"
ping 127.0.0.1 -n 6 >nul
echo Starting Auth Service...
start /b cmd /c "cd auth-service && mvn spring-boot:run"
ping 127.0.0.1 -n 6 >nul
echo Starting User Service...
start /b cmd /c "cd user-service && mvn spring-boot:run"
echo Starting Request Service...
start /b cmd /c "cd request-service && mvn spring-boot:run"
echo Starting Job Service...
start /b cmd /c "cd job-service && mvn spring-boot:run"
echo Starting Payment Service...
start /b cmd /c "cd payment-service && mvn spring-boot:run"
echo Starting Supporting Service...
start /b cmd /c "cd supporting-service && mvn spring-boot:run"
echo All services are starting in the local terminal.
echo Keeping microservices running in background...
ping 127.0.0.1 -t >nul


