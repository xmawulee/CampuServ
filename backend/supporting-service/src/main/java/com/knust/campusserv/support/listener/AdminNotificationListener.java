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
    private com.knust.campusserv.support.repository.NotificationRepository notificationRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @RabbitListener(queues = "admin_notifications_queue")
    public void handleAdminNotification(NotificationPayload payload) {
        logger.info("Received admin notification: {}", payload.getType());

        try {
            // Save to DB (non-blocking for real-time broadcasts)
            try {
                AdminNotification notification = new AdminNotification();
                notification.setType(payload.getType());
                notification.setEntityId(payload.getEntityId());
                notification.setSummary(payload.getSummary());
                notification.setSeverity(payload.getSeverity() != null ? payload.getSeverity() : "INFO");

                notification = repository.save(notification);

                // Re-emit to STOMP WebSocket for admins
                messagingTemplate.convertAndSend("/topic/admin/notifications", notification);
                logger.info("Broadcasted admin notification to STOMP: {}", notification.getId());
            } catch (Exception dbErr) {
                logger.warn("Could not save AdminNotification to DB: {}", dbErr.getMessage());
            }


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
            } else if ("wallet.updated".equals(payload.getType())) {
                String userId = payload.getEntityId();
                if (userId != null && !userId.trim().isEmpty()) {
                    java.util.Map<String, Object> walletNotif = new java.util.HashMap<>();
                    walletNotif.put("type", "WALLET_UPDATE");
                    walletNotif.put("userId", userId);
                    walletNotif.put("summary", payload.getSummary());
                    messagingTemplate.convertAndSend("/topic/user/" + userId + "/notifications", walletNotif);
                    logger.info("Broadcasted wallet update notification to STOMP for user: {}", userId);
                }
            } else if ("request.created".equals(payload.getType())) {
                java.util.Map<String, Object> feedPayload = new java.util.HashMap<>();
                feedPayload.put("type", "REQUEST_CREATED");
                feedPayload.put("requestId", payload.getEntityId());
                messagingTemplate.convertAndSend("/topic/requests.feed", feedPayload);
                logger.info("Broadcasted new request event to STOMP /topic/requests.feed for request: {}", payload.getEntityId());

                String summary = payload.getSummary();
                if (summary != null && summary.startsWith("TARGET:")) {
                    String targetProviderId = summary.substring(7);
                    com.knust.campusserv.support.model.Notification userNotification = new com.knust.campusserv.support.model.Notification();
                    userNotification.setId("ntf-" + java.util.UUID.randomUUID().toString());
                    userNotification.setUserId(targetProviderId);
                    userNotification.setTitle("Direct Hire Request");
                    userNotification.setMessage("A student has sent you a direct service request.");
                    userNotification.setType("DIRECT_HIRE_REQUEST");
                    userNotification.setReferenceId(payload.getEntityId());
                    userNotification.setIsRead(false);
                    notificationRepository.save(userNotification);
                    messagingTemplate.convertAndSend("/topic/user/" + targetProviderId + "/notifications", userNotification);
                }

            } else if ("request.cancelled".equals(payload.getType())) {
                String requestId = payload.getEntityId();
                if (requestId != null && !requestId.trim().isEmpty()) {
                    java.util.Map<String, Object> cancelPayload = new java.util.HashMap<>();
                    cancelPayload.put("type", "REQUEST_CANCELLED");
                    cancelPayload.put("requestId", requestId);

                    // Broadcast to bidding providers and anyone watching open feed
                    messagingTemplate.convertAndSend("/topic/request." + requestId + ".bids", cancelPayload);
                    messagingTemplate.convertAndSend("/topic/requests.feed", cancelPayload);
                    logger.info("Broadcasted request.cancelled STOMP event for request: {}", requestId);
                }
            } else if (payload.getType() != null && payload.getType().startsWith("job.")) {
                java.util.Map<String, Object> jobPayload = new java.util.HashMap<>();
                jobPayload.put("type", "JOB_UPDATE");
                jobPayload.put("eventType", payload.getType());
                jobPayload.put("jobId", payload.getEntityId());
                jobPayload.put("summary", payload.getSummary());

                // Broadcast job status updates to provider and student topics
                String summary = payload.getSummary();
                if (summary != null) {
                    // Extract providerId or studentId if included in summary format "PROVIDER:xyz|STUDENT:abc"
                    String[] parts = summary.split("\\|");
                    for (String part : parts) {
                        if (part.startsWith("PROVIDER:")) {
                            String pId = part.substring(9);
                            messagingTemplate.convertAndSend("/topic/provider/" + pId + "/job-updates", jobPayload);
                        } else if (part.startsWith("STUDENT:")) {
                            String sId = part.substring(8);
                            messagingTemplate.convertAndSend("/topic/user/" + sId + "/notifications", jobPayload);
                        }
                    }
                }
                if (payload.getEntityId() != null) {
                    messagingTemplate.convertAndSend("/topic/job." + payload.getEntityId() + ".status", jobPayload);
                }
                logger.info("Broadcasted STOMP event for {}", payload.getType());
            }

        } catch (Exception e) {
            logger.error("Failed to process admin notification", e);
        }
    }
}
