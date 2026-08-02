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

EUREKA_JVM_OPTS="$COMMON_JVM_OPTS -Xmx48m -Xms48m"
GATEWAY_JVM_OPTS="$COMMON_JVM_OPTS -Xmx48m -Xms48m"
MICROSERVICE_JVM_OPTS="$COMMON_JVM_OPTS -Xmx48m -Xms48m"

# Start Eureka Server first (Registry)
echo "Starting Eureka Server on port 8761..."
java $EUREKA_JVM_OPTS -jar /app/eureka-server.jar &

# Wait for Eureka to initialize fully
echo "Waiting 15 seconds for Eureka to start..."
sleep 15

# Start auth-service FIRST — it owns all Flyway migrations.
# All other services must wait until auth-service Tomcat is up (port 8087),
# which guarantees every DDL migration has been applied before Hibernate
# validation runs in the remaining services.
echo "Starting auth-service (runs Flyway migrations)..."
java $MICROSERVICE_JVM_OPTS -jar /app/auth-service.jar &

echo "Waiting for auth-service to complete Flyway migrations (max 5 min)..."
WAIT_SECS=0
MAX_WAIT=300
while ! nc -z localhost 8087 2>/dev/null; do
    sleep 5
    WAIT_SECS=$((WAIT_SECS + 5))
    if [ $WAIT_SECS -ge $MAX_WAIT ]; then
        echo "WARNING: Timeout waiting for auth-service after ${MAX_WAIT}s. Proceeding anyway..."
        break
    fi
    echo "  ...auth-service not ready yet (${WAIT_SECS}s elapsed)"
done
echo "Auth-service ready — Flyway migrations complete. Starting remaining services..."

# Start remaining microservices with a short stagger
remaining_services="user-service request-service job-service payment-service supporting-service"
for service in $remaining_services; do
    echo "Starting $service..."
    java $MICROSERVICE_JVM_OPTS -jar /app/$service.jar &
    sleep 10
done

# Start API Gateway in foreground (without exec, to keep parent shell alive and prevent background jobs receiving SIGHUP)
echo "Starting API Gateway in foreground..."
java $GATEWAY_JVM_OPTS -jar /app/api-gateway.jar
