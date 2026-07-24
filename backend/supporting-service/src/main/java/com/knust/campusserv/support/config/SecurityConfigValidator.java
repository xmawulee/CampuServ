package com.knust.campusserv.support.config;

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

    @Value("${google.api.key:}")
    private String googleApiKey;

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

        String defaultGoogleKey = "AIzaSyCO_EY_6hSn0bxRQJdZq9GLdX5_LIIhcK0";
        if (googleApiKey == null || googleApiKey.trim().isEmpty() || googleApiKey.equals(defaultGoogleKey)) {
            throw new IllegalStateException("FATAL: GOOGLE_API_KEY must be set and cannot be the default placeholder value in non-local-dev environments.");
        }
    }
}
