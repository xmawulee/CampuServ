package com.knust.campusserv.support.messaging;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Service
public class SupportDeletionConsumer {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private RabbitTemplate rabbitTemplate;

    @RabbitListener(queues = "supporting-service.account.deletion")
    @Transactional
    public void handleAccountDeletion(Map<String, String> payload) {
        String userId = payload.get("userId");
        if (userId == null) return;

        System.out.println("[SupportDeletionConsumer] Starting deletion processing for userId: " + userId);

        // 1. Delete standard in-app notifications
        jdbcTemplate.update("DELETE FROM notifications WHERE user_id = ?", userId);
        jdbcTemplate.update("DELETE FROM admin_notifications WHERE user_id = ?", userId);

        // 2. Anonymize chat history so counterparty messages remain intact
        jdbcTemplate.update("UPDATE chat_messages SET sender_id = 'DELETED' WHERE sender_id = ?", userId);
        jdbcTemplate.update("UPDATE chat_threads SET client_id = 'DELETED' WHERE client_id = ?", userId);
        jdbcTemplate.update("UPDATE chat_threads SET provider_id = 'DELETED' WHERE provider_id = ?", userId);

        // 3. Anonymize call logs
        jdbcTemplate.update("UPDATE call_logs SET caller_id = 'DELETED' WHERE caller_id = ?", userId);
        jdbcTemplate.update("UPDATE call_logs SET callee_id = 'DELETED' WHERE callee_id = ?", userId);

        // 4. Anonymize reviews
        jdbcTemplate.update("UPDATE reviews SET reviewer_id = 'DELETED' WHERE reviewer_id = ?", userId);
        jdbcTemplate.update("UPDATE reviews SET reviewee_id = 'DELETED' WHERE reviewee_id = ?", userId);

        // 5. Anonymize disputes
        jdbcTemplate.update("UPDATE disputes SET raised_by_id = 'DELETED' WHERE raised_by_id = ?", userId);

        System.out.println("[SupportDeletionConsumer] Completed supporting-service cleanup for: " + userId);

        // 6. Send acknowledgment event
        Map<String, String> ack = new HashMap<>();
        ack.put("userId", userId);
        ack.put("serviceName", "supporting-service");
        rabbitTemplate.convertAndSend("account.deletion.acknowledgment", ack);
    }
}
