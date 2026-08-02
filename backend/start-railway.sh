#!/bin/sh

# Set fallback default environment variables for local/in-container networking
export EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=${EUREKA_CLIENT_SERVICEURL_DEFAULTZONE:-http://localhost:8761/eureka/}
export SPRING_RABBITMQ_HOST=${SPRING_RABBITMQ_HOST:-localhost}
export SPRING_DATA_REDIS_HOST=${SPRING_DATA_REDIS_HOST:-localhost}

echo "=================================================="
echo "Starting CampusServ Monolithic-Container Stack..."
echo "=================================================="

# Start Eureka Server first (Registry)
echo "Starting Eureka Server on port 8761..."
java -Dspring.profiles.active=local-dev -Xmx96m -XX:TieredStopAtLevel=1 -jar /app/eureka-server.jar &

# Wait for Eureka to initialize
echo "Waiting 12 seconds for Eureka to start..."
sleep 12

# Start all microservices in the background
services="auth-service user-service request-service job-service payment-service supporting-service"
for service in $services; do
    echo "Starting $service..."
    java -Dspring.profiles.active=local-dev -Xmx96m -XX:TieredStopAtLevel=1 -jar /app/$service.jar &
    sleep 3
done

# Start API Gateway in foreground to keep container alive
echo "Starting API Gateway in foreground..."
exec java -Dspring.profiles.active=local-dev -Xmx96m -XX:TieredStopAtLevel=1 -jar /app/api-gateway.jar
