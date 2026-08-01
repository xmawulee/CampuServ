package com.knust.campusserv.payment.messaging;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Service
public class PaymentDeletionConsumer {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private RabbitTemplate rabbitTemplate;

    @RabbitListener(queues = "payment-service.account.deletion")
    @Transactional
    public void handleAccountDeletion(Map<String, String> payload) {
        String userId = payload.get("userId");
        if (userId == null) return;

        System.out.println("[PaymentDeletionConsumer] Starting deletion processing for userId: " + userId);

        // 1. Delete active wallets (pre-checks verify balance is zero)
        jdbcTemplate.update("DELETE FROM student_wallets WHERE user_id = ?", userId);
        jdbcTemplate.update("DELETE FROM provider_wallets WHERE user_id = ?", userId);

        // 2. Delete payout methods
        jdbcTemplate.update("DELETE FROM payout_methods WHERE user_id = ?", userId);

        // 3. Anonymize transactions payer/provider details
        jdbcTemplate.update(
            "UPDATE transactions SET payer_student_id = 'DELETED', payer_name = 'Deleted User', payer_email = 'deleted@campusserv.com' WHERE payer_student_id = ?",
            userId
        );
        jdbcTemplate.update(
            "UPDATE transactions SET provider_student_id = 'DELETED', provider_name = 'Deleted Provider' WHERE provider_student_id = ?",
            userId
        );

        // 4. Anonymize wallet ledger entries
        jdbcTemplate.update(
            "UPDATE student_wallet_transactions SET user_id = 'DELETED' WHERE user_id = ?",
            userId
        );
        jdbcTemplate.update(
            "UPDATE provider_wallet_transactions SET user_id = 'DELETED' WHERE user_id = ?",
            userId
        );

        System.out.println("[PaymentDeletionConsumer] Completed payment-service cleanup for: " + userId);

        // 5. Send acknowledgment event
        Map<String, String> ack = new HashMap<>();
        ack.put("userId", userId);
        ack.put("serviceName", "payment-service");
        rabbitTemplate.convertAndSend("account.deletion.acknowledgment", ack);
    }
}
