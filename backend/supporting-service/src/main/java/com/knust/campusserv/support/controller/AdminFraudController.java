package com.knust.campusserv.support.controller;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/admin/fraud-scoring")
public class AdminFraudController {


    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired(required = false)
    private RabbitTemplate rabbitTemplate;

    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> calculateUserRiskScore(
            @PathVariable String userId,
            @RequestHeader(value = "X-User-Role", required = false) String role) {

        if (!"ADMIN".equals(role)) {
            return ResponseEntity.status(403).body("Only admins can access risk scoring.");
        }

        Map<String, Object> riskResult = computeRiskScore(userId);
        return ResponseEntity.ok(riskResult);
    }

    @GetMapping("/flagged")
    public ResponseEntity<?> getFlaggedUsers(
            @RequestHeader(value = "X-User-Role", required = false) String role) {

        if (!"ADMIN".equals(role)) {
            return ResponseEntity.status(403).body("Only admins can view flagged users.");
        }

        List<Map<String, Object>> flaggedUsers = new ArrayList<>();
        try {
            List<String> userIds = jdbcTemplate.queryForList("SELECT id FROM users LIMIT 100", String.class);
            for (String uId : userIds) {
                Map<String, Object> scoreData = computeRiskScore(uId);
                int score = (int) scoreData.get("riskScore");
                if (score >= 30) {
                    flaggedUsers.add(scoreData);
                }
            }
        } catch (Exception e) {
            System.err.println("Could not query user list for risk scoring: " + e.getMessage());
        }

        return ResponseEntity.ok(flaggedUsers);
    }

    private Map<String, Object> computeRiskScore(String userId) {
        int score = 0;
        List<String> riskFactors = new ArrayList<>();

        // Factor 1: Failed completion code attempts
        try {
            Integer failedCodeCount = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM jobs WHERE (requester_id = ? OR provider_id = ?) AND completion_code_attempts >= 3",
                Integer.class, userId, userId);
            if (failedCodeCount != null && failedCodeCount > 0) {
                score += 40;
                riskFactors.add("MULTIPLE_FAILED_COMPLETION_CODES (" + failedCodeCount + " occurrences)");
            }
        } catch (Exception ignored) {}

        // Factor 2: Active or open disputes
        try {
            Integer disputeCount = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM disputes WHERE (raised_by_id = ? OR defendant_id = ?) AND status = 'OPEN'",
                Integer.class, userId, userId);
            if (disputeCount != null && disputeCount > 0) {
                score += 30 * disputeCount;
                riskFactors.add("OPEN_DISPUTES_COUNT (" + disputeCount + ")");
            }
        } catch (Exception ignored) {}

        // Factor 3: Rapid high-frequency bidding (Velocity)
        try {
            Integer rapidBids = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM offers WHERE provider_id = ? AND created_at >= NOW() - INTERVAL '10 minutes'",
                Integer.class, userId);
            if (rapidBids != null && rapidBids >= 5) {
                score += 35;
                riskFactors.add("HIGH_BID_VELOCITY (" + rapidBids + " bids in 10 mins)");
            }
        } catch (Exception ignored) {}

        // Factor 4: High request cancellation rate
        try {
            Integer cancellations = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM service_requests WHERE requester_id = ? AND status = 'CANCELLED' AND created_at >= NOW() - INTERVAL '24 hours'",
                Integer.class, userId);
            if (cancellations != null && cancellations >= 3) {
                score += 25;
                riskFactors.add("EXCESSIVE_CANCELLATIONS (" + cancellations + " in 24 hours)");
            }
        } catch (Exception ignored) {}

        score = Math.min(100, score);
        String riskLevel = score >= 70 ? "HIGH_RISK_SUSPICIOUS" : (score >= 30 ? "MEDIUM" : "LOW");

        Map<String, Object> result = new HashMap<>();
        result.put("userId", userId);
        result.put("riskScore", score);
        result.put("riskLevel", riskLevel);
        result.put("riskFactors", riskFactors);
        result.put("assessedAt", java.time.LocalDateTime.now().toString());

        // Broadcast automated high risk alert to STOMP if score >= 70
        if (score >= 70 && messagingTemplate != null) {
            try {
                Map<String, Object> alert = new HashMap<>();
                alert.put("type", "AUTOMATED_FRAUD_ALERT");
                alert.put("userId", userId);
                alert.put("riskScore", score);
                alert.put("riskLevel", riskLevel);
                alert.put("summary", "Automated Fraud Engine flagged user " + userId + " with risk score " + score);
                messagingTemplate.convertAndSend("/topic/admin/notifications", alert);
            } catch (Exception e) {
                System.err.println("Could not broadcast fraud alert: " + e.getMessage());
            }
        }

        return result;
    }
}
