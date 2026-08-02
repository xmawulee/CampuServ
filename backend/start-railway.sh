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
java -Dspring.profiles.active=local-dev -Xmx128m -XX:TieredStopAtLevel=1 -jar /app/eureka-server.jar > /app/eureka-server.log 2>&1 &

# Wait for Eureka to initialize
echo "Waiting 15 seconds for Eureka to start..."
sleep 15

# Start all microservices in the background
services="auth-service user-service request-service job-service payment-service supporting-service api-gateway"
for service in $services; do
    echo "Starting $service..."
    java -Dspring.profiles.active=local-dev -Xmx128m -XX:TieredStopAtLevel=1 -jar /app/$service.jar > /app/$service.log 2>&1 &
    sleep 4
done

echo "=================================================="
echo "All microservices launched. Tailing logs of API-Gateway..."
echo "=================================================="

# Ensure log files exist so tail doesn't fail
for service in auth-service user-service request-service job-service payment-service supporting-service api-gateway eureka-server; do
    touch /app/$service.log
done

tail -f /app/*.log
