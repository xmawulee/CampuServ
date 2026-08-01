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

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

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
                    if (!notificationRepository.existsByUserIdAndTypeAndReferenceId(targetProviderId, "DIRECT_HIRE_REQUEST", payload.getEntityId())) {
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
                } else if (summary != null && summary.startsWith("CATEGORY:")) {
                    String categoryId = summary.substring(9);
                    String requestTitle = "Request";
                    String categoryName = "Category";
                    try {
                        requestTitle = jdbcTemplate.queryForObject("SELECT title FROM service_requests WHERE id = ?", String.class, payload.getEntityId());
                        categoryName = jdbcTemplate.queryForObject("SELECT name FROM service_categories WHERE id = ?", String.class, categoryId);
                    } catch (Exception ex) {
                        logger.warn("AdminNotificationListener: failed to retrieve details for request.created: {}", ex.getMessage());
                    }

                    try {
                        java.util.List<java.util.Map<String, Object>> providers = jdbcTemplate.queryForList(
                            "SELECT DISTINCT u.id FROM users u " +
                            "JOIN provider_categories pc ON u.id = pc.provider_id " +
                            "JOIN provider_profiles pp ON u.id = pp.id " +
                            "WHERE pc.category_id = ? " +
                            "  AND u.is_verified = true " +
                            "  AND (u.primary_role = 'PROVIDER' OR (u.secondary_role = 'PROVIDER' AND u.secondary_role_status = 'APPROVED') OR u.is_provider = true) " +
                            "  AND (pp.notify_new_requests IS NULL OR pp.notify_new_requests = true)", categoryId);

                        for (java.util.Map<String, Object> prov : providers) {
                            String pId = (String) prov.get("id");
                            if (pId != null && !notificationRepository.existsByUserIdAndTypeAndReferenceId(pId, "MATCHING_REQUEST_CREATED", payload.getEntityId())) {
                                com.knust.campusserv.support.model.Notification userNotification = new com.knust.campusserv.support.model.Notification();
                                userNotification.setId("ntf-" + java.util.UUID.randomUUID().toString());
                                userNotification.setUserId(pId);
                                userNotification.setTitle("New Matching Request");
                                userNotification.setMessage("New request '" + requestTitle + "' matches your service category '" + categoryName + "'");
                                userNotification.setType("MATCHING_REQUEST_CREATED");
                                userNotification.setReferenceId(payload.getEntityId());
                                userNotification.setIsRead(false);
                                notificationRepository.save(userNotification);
                                messagingTemplate.convertAndSend("/topic/user/" + pId + "/notifications", userNotification);
                            }
                        }
                    } catch (Exception ex) {
                        logger.error("AdminNotificationListener: failed to dispatch CATEGORY request.created notifications: {}", ex.getMessage());
                    }
                }

            } else if ("request.cancelled".equals(payload.getType())) {
                String requestId = payload.getEntityId();
                if (requestId != null && !requestId.trim().isEmpty()) {
                    java.util.Map<String, Object> cancelPayload = new java.util.HashMap<>();
                    cancelPayload.put("type", "REQUEST_CANCELLED");
                    cancelPayload.put("requestId", requestId);

                    messagingTemplate.convertAndSend("/topic/request." + requestId + ".bids", cancelPayload);
                    messagingTemplate.convertAndSend("/topic/requests.feed", cancelPayload);
                    logger.info("Broadcasted request.cancelled STOMP event for request: {}", requestId);

                    try {
                        String title = jdbcTemplate.queryForObject("SELECT title FROM service_requests WHERE id = ?", String.class, requestId);
                        java.util.List<String> providerIds = jdbcTemplate.queryForList(
                            "SELECT DISTINCT provider_id FROM offers WHERE request_id = ? AND status = 'PENDING'",
                            String.class, requestId);
                        for (String pId : providerIds) {
                            if (pId != null && !notificationRepository.existsByUserIdAndTypeAndReferenceId(pId, "REQUEST_CANCELLED", requestId)) {
                                com.knust.campusserv.support.model.Notification userNotification = new com.knust.campusserv.support.model.Notification();
                                userNotification.setId("ntf-" + java.util.UUID.randomUUID().toString());
                                userNotification.setUserId(pId);
                                userNotification.setTitle("Request Cancelled");
                                userNotification.setMessage("The request '" + title + "' you bid on has been cancelled by the student.");
                                userNotification.setType("REQUEST_CANCELLED");
                                userNotification.setReferenceId(requestId);
                                userNotification.setIsRead(false);
                                notificationRepository.save(userNotification);
                                messagingTemplate.convertAndSend("/topic/user/" + pId + "/notifications", userNotification);
                            }
                        }
                    } catch (Exception ex) {
                        logger.warn("AdminNotificationListener: failed to process request.cancelled notification dispatch: {}", ex.getMessage());
                    }
                }
            } else if ("offer.accepted".equals(payload.getType())) {
                String requestId = payload.getRequestId();
                String offerId = payload.getOfferId();
                String providerId = payload.getProviderId();
                String requesterId = payload.getRequesterId();

                if (requestId != null && offerId != null) {
                    String title = "Request";
                    String providerName = "Provider";
                    try {
                        title = jdbcTemplate.queryForObject("SELECT title FROM service_requests WHERE id = ?", String.class, requestId);
                        providerName = jdbcTemplate.queryForObject("SELECT full_name FROM users WHERE id = ?", String.class, providerId);
                    } catch (Exception ex) {
                        logger.warn("AdminNotificationListener: failed to retrieve details for offer.accepted: {}", ex.getMessage());
                    }

                    if (providerId != null && !notificationRepository.existsByUserIdAndTypeAndReferenceId(providerId, "BID_ACCEPTED", offerId)) {
                        com.knust.campusserv.support.model.Notification winnerNotif = new com.knust.campusserv.support.model.Notification();
                        winnerNotif.setId("ntf-" + java.util.UUID.randomUUID().toString());
                        winnerNotif.setUserId(providerId);
                        winnerNotif.setTitle("Bid Accepted");
                        winnerNotif.setMessage("Your bid was accepted! You have a new job '" + title + "'");
                        winnerNotif.setType("BID_ACCEPTED");
                        winnerNotif.setReferenceId(offerId);
                        winnerNotif.setIsRead(false);
                        notificationRepository.save(winnerNotif);
                        messagingTemplate.convertAndSend("/topic/user/" + providerId + "/notifications", winnerNotif);
                    }

                    if (requesterId != null && !notificationRepository.existsByUserIdAndTypeAndReferenceId(requesterId, "JOB_STARTED", offerId)) {
                        com.knust.campusserv.support.model.Notification studentNotif = new com.knust.campusserv.support.model.Notification();
                        studentNotif.setId("ntf-" + java.util.UUID.randomUUID().toString());
                        studentNotif.setUserId(requesterId);
                        studentNotif.setTitle("Job Initialized");
                        studentNotif.setMessage("You accepted " + providerName + "'s bid for '" + title + "'. Escrow held.");
                        studentNotif.setType("JOB_STARTED");
                        studentNotif.setReferenceId(offerId);
                        studentNotif.setIsRead(false);
                        notificationRepository.save(studentNotif);
                        messagingTemplate.convertAndSend("/topic/user/" + requesterId + "/notifications", studentNotif);
                    }

                    try {
                        java.util.List<String> otherProviders = jdbcTemplate.queryForList(
                            "SELECT DISTINCT provider_id FROM offers WHERE request_id = ? AND provider_id != ?",
                            String.class, requestId, providerId);
                        for (String otherPId : otherProviders) {
                            if (otherPId != null && !notificationRepository.existsByUserIdAndTypeAndReferenceId(otherPId, "BID_REJECTED", requestId)) {
                                com.knust.campusserv.support.model.Notification loserNotif = new com.knust.campusserv.support.model.Notification();
                                loserNotif.setId("ntf-" + java.util.UUID.randomUUID().toString());
                                loserNotif.setUserId(otherPId);
                                loserNotif.setTitle("Request Closed");
                                loserNotif.setMessage("Your bid on '" + title + "' was not selected this time.");
                                loserNotif.setType("BID_REJECTED");
                                loserNotif.setReferenceId(requestId);
                                loserNotif.setIsRead(false);
                                notificationRepository.save(loserNotif);
                                messagingTemplate.convertAndSend("/topic/user/" + otherPId + "/notifications", loserNotif);
                            }
                        }
                    } catch (Exception ex) {
                        logger.error("AdminNotificationListener: failed to dispatch BID_REJECTED notifications: {}", ex.getMessage());
                    }
                }
            } else if ("offer.withdrawn".equals(payload.getType())) {
                String requestId = payload.getRequestId();
                String offerId = payload.getOfferId();
                String providerId = payload.getProviderId();
                String requesterId = payload.getRequesterId();

                if (requestId != null && offerId != null && requesterId != null) {
                    String title = "Request";
                    String providerName = "Provider";
                    try {
                        title = jdbcTemplate.queryForObject("SELECT title FROM service_requests WHERE id = ?", String.class, requestId);
                        providerName = jdbcTemplate.queryForObject("SELECT full_name FROM users WHERE id = ?", String.class, providerId);
                    } catch (Exception ex) {
                        logger.warn("AdminNotificationListener: failed to retrieve details for offer.withdrawn: {}", ex.getMessage());
                    }

                    if (!notificationRepository.existsByUserIdAndTypeAndReferenceId(requesterId, "BID_WITHDRAWN", offerId)) {
                        com.knust.campusserv.support.model.Notification userNotification = new com.knust.campusserv.support.model.Notification();
                        userNotification.setId("ntf-" + java.util.UUID.randomUUID().toString());
                        userNotification.setUserId(requesterId);
                        userNotification.setTitle("Bid Withdrawn");
                        userNotification.setMessage(providerName + " withdrew their bid on your request '" + title + "'");
                        userNotification.setType("BID_WITHDRAWN");
                        userNotification.setReferenceId(offerId);
                        userNotification.setIsRead(false);
                        notificationRepository.save(userNotification);
                        messagingTemplate.convertAndSend("/topic/user/" + requesterId + "/notifications", userNotification);
                    }
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
