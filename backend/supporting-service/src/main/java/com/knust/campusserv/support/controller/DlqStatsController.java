package com.knust.campusserv.support.controller;

import org.springframework.amqp.core.AmqpAdmin;
import org.springframework.amqp.core.QueueInformation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Admin endpoint to inspect Dead-Letter Queue depths across all monitored queues.
 * GET /admin/dlq/stats — returns name, messageCount, consumerCount for each DLQ.
 */
@RestController
@RequestMapping("/admin/dlq")
public class DlqStatsController {

    private static final List<String> MONITORED_DLQ_NAMES = List.of(
            "provider.verification.dlq",
            "provider_verification_queue.dlq",
            "user.status.updated.dlq",
            "provider.review.submitted.dlq",
            "admin_notifications_queue.dlq",
            "job-status-queue.dlq"
    );

    @Autowired(required = false)
    private AmqpAdmin amqpAdmin;

    @GetMapping("/stats")
    public ResponseEntity<?> getDlqStats() {
        if (amqpAdmin == null) {
            return ResponseEntity.status(503).body(Map.of("error", "AMQP admin not available"));
        }

        List<Map<String, Object>> stats = new ArrayList<>();
        for (String queueName : MONITORED_DLQ_NAMES) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("queue", queueName);
            try {
                QueueInformation info = amqpAdmin.getQueueInfo(queueName);
                if (info != null) {
                    entry.put("messageCount", info.getMessageCount());
                    entry.put("consumerCount", info.getConsumerCount());
                    entry.put("status", info.getMessageCount() > 0 ? "NEEDS_ATTENTION" : "OK");
                } else {
                    entry.put("messageCount", 0);
                    entry.put("consumerCount", 0);
                    entry.put("status", "QUEUE_NOT_FOUND");
                }
            } catch (Exception e) {
                entry.put("error", e.getMessage());
                entry.put("status", "ERROR");
            }
            stats.add(entry);
        }

        int totalPoisoned = stats.stream()
                .mapToInt(e -> e.get("messageCount") instanceof Number n ? n.intValue() : 0)
                .sum();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalPoisonedMessages", totalPoisoned);
        result.put("queues", stats);
        return ResponseEntity.ok(result);
    }
}
