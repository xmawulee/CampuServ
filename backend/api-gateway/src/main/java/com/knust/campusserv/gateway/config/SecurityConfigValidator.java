package com.knust.campusserv.gateway.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import java.util.Arrays;

@Component
public class SecurityConfigValidator {

    private final Environment environment;

    @Value("${jwt.secret:}")
    private String jwtSecret;

    public SecurityConfigValidator(Environment environment) {
        this.environment = environment;
    }

    @PostConstruct
    public void validate() {
        boolean isLocalDev = Arrays.asList(environment.getActiveProfiles()).contains("local-dev");
        if (isLocalDev) {
            return;
        }

        String defaultJwtSecret = "dGhlLXN1cGVyLXNlY3JldC1jb25mZGVudGlhbC1qd3Qta2V5LWZvci1jYW1wdXNzZXJ2LWtudXN0LWdyb3VwLTg4";
        if (jwtSecret == null || jwtSecret.trim().isEmpty() || jwtSecret.equals(defaultJwtSecret)) {
            throw new IllegalStateException("FATAL: JWT_SECRET must be set and cannot be the default placeholder value in non-local-dev environments.");
        }
    }
}
