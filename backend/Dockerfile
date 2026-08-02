# Build stage
FROM maven:3.8.5-openjdk-17-slim AS build
WORKDIR /app
COPY . .
RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:17-jdk-alpine
WORKDIR /app
RUN apk add --no-cache curl

# Copy compiled JARs
COPY --from=build /app/eureka-server/target/*.jar /app/eureka-server.jar
COPY --from=build /app/api-gateway/target/*.jar /app/api-gateway.jar
COPY --from=build /app/auth-service/target/*.jar /app/auth-service.jar
COPY --from=build /app/user-service/target/*.jar /app/user-service.jar
COPY --from=build /app/request-service/target/*.jar /app/request-service.jar
COPY --from=build /app/job-service/target/*.jar /app/job-service.jar
COPY --from=build /app/payment-service/target/*.jar /app/payment-service.jar
COPY --from=build /app/supporting-service/target/*.jar /app/supporting-service.jar

# Copy startup script
COPY start-railway.sh /app/start-railway.sh
RUN chmod +x /app/start-railway.sh

EXPOSE 8080
ENTRYPOINT ["/app/start-railway.sh"]
