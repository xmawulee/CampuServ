package com.knust.campusserv.support.listener;

import com.knust.campusserv.support.model.AdminNotification;
import com.knust.campusserv.support.model.NotificationPayload;
import com.knust.campusserv.support.repository.AdminNotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
public class AdminNotificationListener {

    private static final Logger logger = LoggerFactory.getLogger(AdminNotificationListener.class);

    @Autowired
    private AdminNotificationRepository repository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @RabbitListener(queues = "admin_notifications_queue")
    public void handleAdminNotification(NotificationPayload payload) {
        logger.info("Received admin notification: {}", payload.getType());

        try {
            // Save to DB
            AdminNotification notification = new AdminNotification();
            notification.setType(payload.getType());
            notification.setEntityId(payload.getEntityId());
            notification.setSummary(payload.getSummary());
            notification.setSeverity(payload.getSeverity());
            // Timestamp is set to now() by default in constructor/entity

            notification = repository.save(notification);

            // Re-emit to STOMP WebSocket for admins
            messagingTemplate.convertAndSend("/topic/admin/notifications", notification);
            logger.info("Broadcasted admin notification to STOMP: {}", notification.getId());

            // If it's a resolved verification or status change, also notify the specific user
            if ("provider.verification.resolved".equals(payload.getType()) || "user.status.changed".equals(payload.getType())) {
                String userId = payload.getEntityId();
                if (userId != null && !userId.trim().isEmpty()) {
                    java.util.Map<String, Object> userStatusPayload = new java.util.HashMap<>();
                    userStatusPayload.put("userId", userId);
                    userStatusPayload.put("type", payload.getType());
                    userStatusPayload.put("summary", payload.getSummary());

                    if ("user.status.changed".equals(payload.getType())) {
                        String summary = payload.getSummary() != null ? payload.getSummary().toUpperCase() : "";
                        if (summary.contains("SUSPENDED")) {
                            userStatusPayload.put("status", "ACCOUNT_RESTRICTED");
                            userStatusPayload.put("accountStatus", "SUSPENDED");
                        } else if (summary.contains("BANNED")) {
                            userStatusPayload.put("status", "ACCOUNT_RESTRICTED");
                            userStatusPayload.put("accountStatus", "BANNED");
                        } else if (summary.contains("ACTIVE")) {
                            userStatusPayload.put("status", "ACCOUNT_ACTIVATED");
                            userStatusPayload.put("accountStatus", "ACTIVE");
                        }
                    }

                    messagingTemplate.convertAndSend("/topic/user/" + userId + "/status", userStatusPayload);
                    logger.info("Broadcasted user status update to STOMP for user: {}", userId);
                }
            }
        } catch (Exception e) {
            logger.error("Failed to process admin notification", e);
        }
    }
}
