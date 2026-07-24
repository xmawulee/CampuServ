package com.knust.campusserv.support.listener;

import com.knust.campusserv.support.model.Notification;
import com.knust.campusserv.support.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

@Component
public class ProviderVerificationListener {

    private static final Logger logger = LoggerFactory.getLogger(ProviderVerificationListener.class);

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @RabbitListener(queues = "provider_verification_queue")
    public void handleVerificationEvent(Map<String, String> payload) {
        String providerId = payload.get("providerId");
        String status = payload.get("status");
        String reason = payload.get("reason");

        logger.info("Received provider verification event for provider {}: {}", providerId, status);

        try {
            Notification notification = new Notification();
            notification.setId("notif-" + UUID.randomUUID().toString());
            notification.setUserId(providerId);
            notification.setIsRead(false);
            notification.setType("SYSTEM");

            if ("VERIFIED".equals(status)) {
                notification.setTitle("Provider Account Verified");
                notification.setMessage("Congratulations! Your provider account has been verified. You can now accept jobs.");
            } else if ("REJECTED".equals(status)) {
                notification.setTitle("Provider Account Rejected");
                notification.setMessage("Your provider account application was rejected. Reason: " + reason + ". Please update your details and try again.");
            } else {
                return; // Unknown status
            }

            notificationRepository.save(notification);

            // Notify user over STOMP notifications topic
            messagingTemplate.convertAndSend("/topic/user/" + providerId + "/notifications", notification);

            // Also push a canonical status update event over STOMP status topic
            java.util.Map<String, Object> statusPayload = new java.util.HashMap<>();
            statusPayload.put("userId", providerId);
            statusPayload.put("role", "PROVIDER");
            statusPayload.put("accountStatus", "ACTIVE");

            if ("VERIFIED".equalsIgnoreCase(status) || "APPROVED".equalsIgnoreCase(status)) {
                statusPayload.put("status", "APPROVED");
                statusPayload.put("verificationStatus", "APPROVED");
                statusPayload.put("primaryRoleVerified", true);
                statusPayload.put("rejectionReason", null);
            } else if ("REJECTED".equalsIgnoreCase(status)) {
                statusPayload.put("status", "REJECTED");
                statusPayload.put("verificationStatus", "REJECTED");
                statusPayload.put("primaryRoleVerified", false);
                statusPayload.put("rejectionReason", reason != null ? reason : "");
            }
            messagingTemplate.convertAndSend("/topic/user/" + providerId + "/status", statusPayload);

        } catch (Exception e) {
            logger.error("Error processing provider verification event", e);
        }
    }
}
