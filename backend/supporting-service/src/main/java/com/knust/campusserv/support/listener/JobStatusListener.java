package com.knust.campusserv.support.listener;

import com.knust.campusserv.support.model.*;
import com.knust.campusserv.support.repository.NotificationRepository;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component
public class JobStatusListener {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private com.knust.campusserv.support.repository.ReviewRepository reviewRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @RabbitListener(queues = "job-status-queue")
    public void receiveStatusChange(Map<String, Object> event) {
        String jobId = (String) event.get("jobId");
        String status = (String) event.get("status");
        String requesterId = (String) event.get("requesterId");
        String providerId = (String) event.get("providerId");
        String requestId = (String) event.get("requestId");

        System.out.println("Received RabbitMQ event for job: " + jobId + " status: " + status);

        if (status == null || jobId == null) return;

        String providerName = getProviderFirstName(providerId);

        // Always broadcast the job status change to the provider so their dashboard can refresh
        Map<String, String> statusPayload = new HashMap<>();
        statusPayload.put("type", "job.status.changed");
        statusPayload.put("jobId", jobId);
        statusPayload.put("status", status);
        messagingTemplate.convertAndSend("/topic/provider/" + providerId + "/job-updates", statusPayload);
        messagingTemplate.convertAndSend("/topic/job." + jobId + ".status", statusPayload);

        switch (status) {
            case "ACTIVE":
                createNotification(requesterId, "Job Initialized", "Your request is assigned. Escrow funds are HELD.", "JOB_STARTED", jobId);
                createNotification(providerId, "New Service Job", "Your offer was accepted! You can now start the job.", "JOB_STARTED", jobId);
                break;
            case "AWAITING_CODE":
                String completionCode = (String) event.get("completionCode");
                if (completionCode != null) {
                    createNotification(requesterId, "Completion Code Ready", "Use code " + completionCode + " to confirm completion of your job.", "JOB_STARTED", jobId);
                    Map<String, String> payload = new HashMap<>();
                    payload.put("code", completionCode);
                    payload.put("jobId", jobId);
                    messagingTemplate.convertAndSend("/topic/user/" + requesterId + "/completion-code", payload);
                }
                break;
            case "IN_PROGRESS":
                createNotification(requesterId, "Work Started", "Provider has started working on your request.", "JOB_STARTED", jobId);
                break;
            case "EN_ROUTE_TO_PICKUP":
                createNotification(requesterId, "En Route to Pickup", "Provider is en route to pick up your package.", "JOB_STARTED", jobId);
                break;
            case "EN_ROUTE_TO_DROPOFF":
                createNotification(requesterId, "En Route to Drop-off", "Provider has picked up your package and is en route to drop-off.", "JOB_STARTED", jobId);
                break;
            case "PROOF_SUBMITTED":
                createNotification(requesterId, "Proof Uploaded", "Provider has uploaded completion proof. Review and approve.", "JOB_COMPLETE", jobId);
                createNotification(providerId, "Proof Received", "Your completion proof has been logged successfully.", "JOB_COMPLETE", jobId);
                break;
            case "COMPLETED":
                createNotification(requesterId, "Job Complete", "Transaction finished. Payout released to provider.", "PAYMENT_RELEASED", jobId);
                createNotification(providerId, "Payout Released", "Earnings released! Subtracted 12% service charge.", "PAYMENT_RELEASED", jobId);

                // Increment provider completed jobs count in both users and provider_profiles tables
                try {
                    jdbcTemplate.update("UPDATE users SET completed_jobs_count = COALESCE(completed_jobs_count, 0) + 1 WHERE id = ?", providerId);
                    jdbcTemplate.update("UPDATE provider_profiles SET completed_jobs_count = COALESCE(completed_jobs_count, 0) + 1 WHERE id = ?", providerId);
                } catch (Exception e) {
                    System.err.println("Failed to increment completed jobs count: " + e.getMessage());
                }

                // Create pending review
                createPendingReview(jobId, requesterId, providerId);
                break;
            case "DISPUTED":
                createNotification(requesterId, "Dispute Logged", "Dispute case filed. Support team will review evidence.", "DISPUTE_UPDATE", jobId);
                createNotification(providerId, "Job Disputed", "A dispute has been raised. Payout held pending resolution.", "DISPUTE_UPDATE", jobId);
                break;
            case "CANCELLED":
                createNotification(requesterId, "Job Cancelled", "The request has been cancelled. Escrow balance is REFUNDED.", "JOB_COMPLETE", jobId);
                createNotification(providerId, "Job Cancelled", "The request has been cancelled by the client.", "JOB_COMPLETE", jobId);
                break;
            case "FORCE_COMPLETED": {
                // Admin overrode the job to COMPLETED — both parties must be told the reason
                String adminReason = (String) event.getOrDefault("adminReason", "Admin decision");
                String fcMsg = "Admin action: Job marked COMPLETED. Reason: " + adminReason;
                createNotification(requesterId, "Job Force-Completed by Admin", fcMsg, "ADMIN_ACTION", jobId);
                createNotification(providerId, "Job Force-Completed by Admin", fcMsg, "ADMIN_ACTION", jobId);
                // Increment provider completed jobs count
                try {
                    jdbcTemplate.update("UPDATE users SET completed_jobs_count = COALESCE(completed_jobs_count, 0) + 1 WHERE id = ?", providerId);
                    jdbcTemplate.update("UPDATE provider_profiles SET completed_jobs_count = COALESCE(completed_jobs_count, 0) + 1 WHERE id = ?", providerId);
                } catch (Exception e) {
                    System.err.println("Failed to increment completed jobs count after force-complete: " + e.getMessage());
                }
                break;
            }
            case "FORCE_CANCELLED": {
                // Admin overrode the job to CANCELLED — both parties must be told the reason
                String adminReason = (String) event.getOrDefault("adminReason", "Admin decision");
                String cancelMsg = "Admin action: Job marked CANCELLED. Reason: " + adminReason;
                createNotification(requesterId, "Job Force-Cancelled by Admin", cancelMsg, "ADMIN_ACTION", jobId);
                createNotification(providerId, "Job Force-Cancelled by Admin", cancelMsg, "ADMIN_ACTION", jobId);
                break;
            }
        }
    }

    private void createNotification(String userId, String title, String message, String type, String referenceId) {
        Notification notification = new Notification();
        notification.setId("ntf-" + UUID.randomUUID().toString());
        notification.setUserId(userId);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setIsRead(false);
        notification.setType(type);
        notification.setReferenceId(referenceId);
        notificationRepository.save(notification);

        try {
            messagingTemplate.convertAndSend("/topic/user/" + userId + "/notifications", notification);
        } catch (Exception e) {
            System.err.println("Failed to broadcast notification: " + e.getMessage());
        }
    }

    private String getProviderFirstName(String providerId) {
        try {
            Map<?, ?> userProfile = restTemplate.getForObject("http://user-service/users/" + providerId, Map.class);
            if (userProfile != null && userProfile.containsKey("fullName")) {
                String fullName = (String) userProfile.get("fullName");
                return getFirstName(fullName);
            }
        } catch (Exception e) {
            System.err.println("Failed to fetch provider name: " + e.getMessage());
        }
        return "Provider";
    }

    private String getFirstName(String fullName) {
        if (fullName == null || fullName.trim().isEmpty()) {
            return "Provider";
        }
        return fullName.trim().split("\\s+")[0];
    }

    private void createPendingReview(String jobId, String requesterId, String providerId) {
        // Pending reviews not supported in this model
    }
}
