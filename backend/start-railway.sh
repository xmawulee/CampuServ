#!/bin/sh

# Set fallback default environment variables for local/in-container networking
export EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=${EUREKA_CLIENT_SERVICEURL_DEFAULTZONE:-http://localhost:8761/eureka/}
export SPRING_RABBITMQ_HOST=${SPRING_RABBITMQ_HOST:-localhost}
export SPRING_DATA_REDIS_HOST=${SPRING_DATA_REDIS_HOST:-localhost}

echo "=================================================="
echo "Starting CampusServ Monolithic-Container Stack..."
echo "=================================================="

# Hyper-optimized JVM configurations for 512MB RAM limit:
# - -XX:+UseSerialGC: Use Serial GC to minimize memory management thread overhead (saves ~25MB RAM per process)
# - -Xint: Interpreted mode to disable JIT compilation native memory consumption
# - -Xss256k: Reduce thread stack size
# - -XX:ReservedCodeCacheSize=8m: Minimize JIT code cache size
# - -XX:CICompilerCount=1: Restrict compiler threads

COMMON_JVM_OPTS="-Xint -Xss256k -XX:+UseSerialGC -XX:ReservedCodeCacheSize=8m -XX:CICompilerCount=1 -Dspring.profiles.active=local-dev"

EUREKA_JVM_OPTS="$COMMON_JVM_OPTS -Xmx24m -Xms24m"
GATEWAY_JVM_OPTS="$COMMON_JVM_OPTS -Xmx32m -Xms32m"
MICROSERVICE_JVM_OPTS="$COMMON_JVM_OPTS -Xmx48m -Xms48m"

# Start Eureka Server first (Registry)
echo "Starting Eureka Server on port 8761..."
java $EUREKA_JVM_OPTS -jar /app/eureka-server.jar &

# Wait for Eureka to initialize
echo "Waiting 12 seconds for Eureka to start..."
sleep 12

# Start all microservices in the background
services="auth-service user-service request-service job-service payment-service supporting-service"
for service in $services; do
    echo "Starting $service..."
    java $MICROSERVICE_JVM_OPTS -jar /app/$service.jar &
    sleep 3
done

# Start API Gateway in foreground to keep container alive
echo "Starting API Gateway in foreground..."
exec java $GATEWAY_JVM_OPTS -jar /app/api-gateway.jar
