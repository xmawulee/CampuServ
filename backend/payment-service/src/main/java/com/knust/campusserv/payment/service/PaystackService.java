package com.knust.campusserv.payment.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.OutputStream;
import java.math.BigDecimal;
import java.net.HttpURLConnection;
import java.net.URI;
import java.util.Map;

/**
 * Integrates with the Paystack REST API to initialize transactions.
 *
 * In local-dev mode the secret key is a mock key, so actual API calls will
 * fail gracefully and a simulated checkout URL is returned instead.
 */
@Service
public class PaystackService {

    private static final Logger log = LoggerFactory.getLogger(PaystackService.class);

    private static final String PAYSTACK_INIT_URL = "https://api.paystack.co/transaction/initialize";

    @Value("${paystack.secret-key}")
    private String paystackSecretKey;

    @Value("${paystack.callback-url}")
    private String callbackUrl;

    private final ObjectMapper objectMapper;

    public PaystackService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Initializes a Paystack transaction.
     *
     * @param email      Customer email (required by Paystack).
     * @param amountGHS  Amount in GHS (will be converted to pesewas).
     * @param reference  Unique payment reference.
     * @param metadata   Optional metadata map.
     * @return Map with "authorization_url" and "access_code" from Paystack, or a mock fallback.
     */
    public Map<String, String> initializeTransaction(String email, BigDecimal amountGHS, String reference, Map<String, Object> metadata) {
        // Amount must be in pesewas (kobo equivalent for GHS)
        long amountInPesewas = amountGHS.multiply(new BigDecimal("100")).longValue();

        try {
            Map<String, Object> requestBody = new java.util.LinkedHashMap<>();
            requestBody.put("email", email);
            requestBody.put("amount", amountInPesewas);
            requestBody.put("reference", reference);
            requestBody.put("callback_url", callbackUrl);
            requestBody.put("currency", "GHS");
            if (metadata != null && !metadata.isEmpty()) {
                requestBody.put("metadata", metadata);
            }

            String jsonBody = objectMapper.writeValueAsString(requestBody);

            HttpURLConnection connection = (HttpURLConnection) URI.create(PAYSTACK_INIT_URL).toURL().openConnection();
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Authorization", "Bearer " + paystackSecretKey);
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setDoOutput(true);
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(15000);

            try (OutputStream os = connection.getOutputStream()) {
                os.write(jsonBody.getBytes());
                os.flush();
            }

            int responseCode = connection.getResponseCode();
            if (responseCode == 200) {
                Map<String, Object> response = objectMapper.readValue(connection.getInputStream(), new TypeReference<>() {});
                if (Boolean.TRUE.equals(response.get("status"))) {
                    Map<String, Object> data = (Map<String, Object>) response.get("data");
                    return Map.of(
                            "authorization_url", (String) data.get("authorization_url"),
                            "access_code", (String) data.get("access_code"),
                            "reference", (String) data.get("reference")
                    );
                } else {
                    log.warn("Paystack returned status=false: {}", response.get("message"));
                }
            } else {
                String errorBody = new String(connection.getErrorStream().readAllBytes());
                log.warn("Paystack API returned HTTP {}: {}", responseCode, errorBody);
            }
        } catch (Exception e) {
            log.warn("Paystack API call failed (falling back to mock): {}", e.getMessage());
        }

        // Fallback: return mock checkout URL (useful for local-dev or when API key is a test mock)
        log.info("Using mock checkout URL for reference: {}", reference);
        return Map.of(
                "authorization_url", "https://checkout.paystack.com/mock-session-" + reference,
                "access_code", "mock-" + reference,
                "reference", reference
        );
    }
}
