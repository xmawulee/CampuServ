package com.knust.campusserv.support.listener;

import com.knust.campusserv.support.model.*;
import com.knust.campusserv.support.repository.ChatMessageRepository;
import com.knust.campusserv.support.repository.ChatThreadRepository;
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
import java.util.Optional;
import java.util.UUID;

@Component
public class JobStatusListener {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private com.knust.campusserv.support.repository.ReviewRepository reviewRepository;

    @Autowired
    private ChatThreadRepository chatThreadRepository;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

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
                
                // Automatically create Chat Thread for Client & Provider
                initializeChatThread(requestId, requesterId, providerId);
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
                
                // Post system message
                postSystemMessage(requestId, "Request marked as in progress");
                break;
            case "PROOF_SUBMITTED":
                createNotification(requesterId, "Proof Uploaded", "Provider has uploaded completion proof. Review and approve.", "JOB_COMPLETE", jobId);
                createNotification(providerId, "Proof Received", "Your completion proof has been logged successfully.", "JOB_COMPLETE", jobId);
                
                // Post system message
                postSystemMessage(requestId, providerName + " uploaded completion proof");
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

                // Lock thread and post system message
                lockChatThread(requestId, "This conversation is closed.");
                break;
            case "DISPUTED":
                createNotification(requesterId, "Dispute Logged", "Dispute case filed. Support team will review evidence.", "DISPUTE_UPDATE", jobId);
                createNotification(providerId, "Job Disputed", "A dispute has been raised. Payout held pending resolution.", "DISPUTE_UPDATE", jobId);
                
                // Lock thread and post system message
                lockChatThread(requestId, "A dispute has been raised. This conversation is closed.");
                break;
            case "CANCELLED":
                createNotification(requesterId, "Job Cancelled", "The request has been cancelled. Escrow balance is REFUNDED.", "JOB_COMPLETE", jobId);
                createNotification(providerId, "Job Cancelled", "The request has been cancelled by the client.", "JOB_COMPLETE", jobId);
                // Lock thread and post system message
                lockChatThread(requestId, "This conversation is closed.");
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
                lockChatThread(requestId, "Admin force-completed this job. Reason: " + adminReason);
                break;
            }
            case "FORCE_CANCELLED": {
                // Admin overrode the job to CANCELLED — both parties must be told the reason
                String adminReason = (String) event.getOrDefault("adminReason", "Admin decision");
                String cancelMsg = "Admin action: Job marked CANCELLED. Reason: " + adminReason;
                createNotification(requesterId, "Job Force-Cancelled by Admin", cancelMsg, "ADMIN_ACTION", jobId);
                createNotification(providerId, "Job Force-Cancelled by Admin", cancelMsg, "ADMIN_ACTION", jobId);
                lockChatThread(requestId, "Admin force-cancelled this job. Reason: " + adminReason);
                break;
            }
        }
    }

    private void initializeChatThread(String requestId, String clientId, String providerId) {
        if (requestId == null || clientId == null || providerId == null) return;
        
        Optional<ChatThread> existing = chatThreadRepository.findByRequestId(requestId);
        if (existing.isEmpty()) {
            ChatThread thread = new ChatThread();
            thread.setId("thd-" + UUID.randomUUID().toString());
            thread.setRequestId(requestId);
            thread.setClientId(clientId);
            thread.setProviderId(providerId);
            thread.setStatus("OPEN");
            chatThreadRepository.save(thread);

            // Save first system message
            ChatMessage sysMsg = new ChatMessage();
            sysMsg.setId("msg-" + UUID.randomUUID().toString());
            sysMsg.setThreadId(thread.getId());
            sysMsg.setSenderId(null);
            sysMsg.setType(MessageType.SYSTEM);
            sysMsg.setContent("Conversation started.");
            sysMsg.setStatus(MessageStatus.SENT);
            sysMsg.setCreatedAt(LocalDateTime.now());
            chatMessageRepository.save(sysMsg);

            // Broadcast message
            messagingTemplate.convertAndSend("/topic/chat/" + thread.getId(), sysMsg);
        }
    }

    private void lockChatThread(String requestId, String lockReason) {
        if (requestId == null) return;
        
        chatThreadRepository.findByRequestId(requestId).ifPresent(thread -> {
            thread.setStatus("LOCKED");
            chatThreadRepository.save(thread);

            ChatMessage sysMsg = new ChatMessage();
            sysMsg.setId("msg-" + UUID.randomUUID().toString());
            sysMsg.setThreadId(thread.getId());
            sysMsg.setSenderId(null);
            sysMsg.setType(MessageType.SYSTEM);
            sysMsg.setContent(lockReason);
            sysMsg.setStatus(MessageStatus.SENT);
            sysMsg.setCreatedAt(LocalDateTime.now());
            chatMessageRepository.save(sysMsg);

            // Broadcast message
            messagingTemplate.convertAndSend("/topic/chat/" + thread.getId(), sysMsg);
        });
    }

    private void postSystemMessage(String requestId, String content) {
        if (requestId == null) return;
        
        chatThreadRepository.findByRequestId(requestId).ifPresent(thread -> {
            ChatMessage sysMsg = new ChatMessage();
            sysMsg.setId("msg-" + UUID.randomUUID().toString());
            sysMsg.setThreadId(thread.getId());
            sysMsg.setSenderId(null);
            sysMsg.setType(MessageType.SYSTEM);
            sysMsg.setContent(content);
            sysMsg.setStatus(MessageStatus.SENT);
            sysMsg.setCreatedAt(LocalDateTime.now());
            chatMessageRepository.save(sysMsg);

            // Broadcast message
            messagingTemplate.convertAndSend("/topic/chat/" + thread.getId(), sysMsg);
        });
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
