package com.knust.campusserv.payment.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import java.util.Arrays;

@Component
public class SecurityConfigValidator {

    private final Environment environment;

    @Value("${paystack.secret-key:}")
    private String paystackSecretKey;

    @Value("${paystack.webhook-secret:}")
    private String paystackWebhookSecret;

    public SecurityConfigValidator(Environment environment) {
        this.environment = environment;
    }

    @PostConstruct
    public void validate() {
        boolean isLocalDev = Arrays.asList(environment.getActiveProfiles()).contains("local-dev");
        if (isLocalDev) {
            return;
        }

        String defaultPaystackKey = "sk_test_mock_paystack_secret_key_ghana_knust";
        if (paystackSecretKey == null || paystackSecretKey.trim().isEmpty() || paystackSecretKey.equals(defaultPaystackKey)) {
            throw new IllegalStateException("FATAL: PAYSTACK_SECRET_KEY must be set and cannot be the default placeholder value in non-local-dev environments.");
        }

        String defaultWebhookSecret = "whsec_mock_paystack_webhook_verification_signature";
        if (paystackWebhookSecret == null || paystackWebhookSecret.trim().isEmpty() || paystackWebhookSecret.equals(defaultWebhookSecret)) {
            throw new IllegalStateException("FATAL: PAYSTACK_WEBHOOK_SECRET must be set and cannot be the default placeholder value in non-local-dev environments.");
        }
    }
}
