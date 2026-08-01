package com.knust.campusserv.auth.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class BrevoEmailService {

    private static final Logger log = LoggerFactory.getLogger(BrevoEmailService.class);

    @Value("${BREVO_API_KEY:placeholder}")
    private String apiKey;

    @Value("${BREVO_SENDER_EMAIL:marshalldalton435@gmail.com}")
    private String senderEmail;

    @Value("${BREVO_SENDER_NAME:CampusServ}")
    private String senderName;

    private final RestTemplate restTemplate;

    public BrevoEmailService() {
        this.restTemplate = new RestTemplate();
    }

    public void sendPasswordResetCodeEmail(String recipientEmail, String recipientName, String code) {
        log.info("==================================================================");
        log.info("PASSWORD RESET CODE GENERATED FOR [{}]:", recipientEmail);
        log.info("CODE: {}", code);
        log.info("EXPIRES IN: 10 minutes");
        log.info("==================================================================");

        if (apiKey == null || apiKey.trim().isEmpty() || apiKey.startsWith("your_")) {
            log.warn("Brevo API key is not configured or is placeholding. Skipping HTTP call; code is logged above for dev testing.");
            return;
        }

        try {
            String url = "https://api.brevo.com/v3/smtp/email";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", apiKey.trim());

            Map<String, Object> body = new HashMap<>();
            body.put("sender", Map.of("email", senderEmail, "name", senderName));
            body.put("to", List.of(Map.of("email", recipientEmail, "name", recipientName != null ? recipientName : "CampusServ User")));
            body.put("subject", "CampusServ - Password Reset Code");
            
            String htmlContent = "<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; borderRadius: 8px;\">" +
                    "<h2 style=\"color: #008080;\">CampusServ Password Reset</h2>" +
                    "<p>Hello " + (recipientName != null ? recipientName : "User") + ",</p>" +
                    "<p>We received a request to reset the password for your CampusServ account.</p>" +
                    "<p>Please enter the following 6-digit verification code in the app to proceed:</p>" +
                    "<p style=\"margin: 25px 0; text-align: center;\">" +
                    "<span style=\"font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #008080; background-color: #f4fbfb; padding: 10px 20px; border: 1px dashed #008080; border-radius: 6px;\">" + code + "</span>" +
                    "</p>" +
                    "<p><strong>Note:</strong> This verification code expires in <strong>10 minutes</strong>.</p>" +
                    "<p>If you did not request a password reset, please ignore this email or contact support if you have security concerns.</p>" +
                    "<hr style=\"border: none; border-top: 1px solid #eeeeee; margin: 20px 0;\" />" +
                    "<p style=\"font-size: 12px; color: #888888;\">CampusServ Team &bull; KNUST Campus</p>" +
                    "</div>";

            body.put("htmlContent", htmlContent);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            restTemplate.postForEntity(url, request, String.class);
            log.info("Successfully sent password reset code email via Brevo to {}", recipientEmail);
        } catch (Exception e) {
            log.error("Failed to send password reset code email via Brevo to {}: {}", recipientEmail, e.getMessage());
        }
    }

    public void sendVerificationCodeEmail(String recipientEmail, String recipientName, String code, int expiryMinutes) {
        log.info("==================================================================");
        log.info("VERIFICATION CODE GENERATED FOR [{}]:", recipientEmail);
        log.info("CODE: {}", code);
        log.info("EXPIRES IN: {} minutes", expiryMinutes);
        log.info("==================================================================");

        if (apiKey == null || apiKey.trim().isEmpty() || apiKey.startsWith("your_")) {
            log.warn("Brevo API key is not configured or is placeholding. Skipping HTTP call; code is logged above for dev testing.");
            return;
        }

        try {
            String url = "https://api.brevo.com/v3/smtp/email";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", apiKey.trim());

            Map<String, Object> body = new HashMap<>();
            body.put("sender", Map.of("email", senderEmail, "name", senderName));
            body.put("to", List.of(Map.of("email", recipientEmail, "name", recipientName != null ? recipientName : "CampusServ User")));
            body.put("subject", "CampusServ - Verify Your Email Address");
            
            String htmlContent = "<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;\">" +
                    "<h2 style=\"color: #004E98;\">CampusServ Signup Verification</h2>" +
                    "<p>Hello " + (recipientName != null ? recipientName : "User") + ",</p>" +
                    "<p>Thank you for registering with CampusServ! To complete your signup and verify your email, please use the following 6-digit code:</p>" +
                    "<p style=\"margin: 25px 0; text-align: center;\">" +
                    "<span style=\"font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #FF6700; background-color: #f5f5f5; padding: 10px 20px; border-radius: 6px; border: 1px dashed #d0d0d0; display: inline-block;\">" + code + "</span>" +
                    "</p>" +
                    "<p><strong>Note:</strong> This verification code expires in <strong>" + expiryMinutes + " minutes</strong>.</p>" +
                    "<p>If you did not initiate this signup, you can safely ignore this email.</p>" +
                    "<hr style=\"border: none; border-top: 1px solid #eeeeee; margin: 20px 0;\" />" +
                    "<p style=\"font-size: 12px; color: #888888;\">CampusServ Team &bull; KNUST Campus</p>" +
                    "</div>";

            body.put("htmlContent", htmlContent);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            restTemplate.postForEntity(url, request, String.class);
            log.info("Successfully sent verification email via Brevo to {}", recipientEmail);
        } catch (Exception e) {
            log.error("Failed to send verification email via Brevo to {}: {}", recipientEmail, e.getMessage());
        }
    }
}
