package com.knust.campusserv.support.controller;

import com.knust.campusserv.support.model.CallLog;
import com.knust.campusserv.support.model.CallSignal;
import com.knust.campusserv.support.model.ChatThread;
import com.knust.campusserv.support.repository.CallLogRepository;
import com.knust.campusserv.support.repository.ChatThreadRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Controller
public class CallController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private ChatThreadRepository chatThreadRepository;

    @Autowired
    private CallLogRepository callLogRepository;

    // 1. Relays incoming call offer from Caller to Callee
    @MessageMapping("/call/{threadId}/offer")
    public void handleOffer(
            @DestinationVariable String threadId,
            CallSignal signal,
            Principal principal) {

        if (principal == null) return;
        String callerId = principal.getName();

        ChatThread thread = verifyAndGetOpenThread(threadId, callerId);
        if (thread == null) return;

        // Initialize Call Log
        CallLog log = new CallLog();
        log.setId("call-" + UUID.randomUUID().toString());
        log.setThreadId(threadId);
        log.setCallerId(callerId);
        log.setCalleeId(signal.getTargetUserId());
        log.setStartedAt(LocalDateTime.now());
        log.setStatus("missed"); // Default status is missed unless accepted or declined
        callLogRepository.save(log);

        signal.setCallerId(callerId);
        signal.setCallLogId(log.getId());
        signal.setThreadId(threadId);

        // Forward to the callee's personal incoming call topic
        messagingTemplate.convertAndSend(
                "/topic/call/" + signal.getTargetUserId() + "/incoming", 
                signal
        );
    }

    // 2. Relays call answer from Callee back to Caller
    @MessageMapping("/call/{threadId}/answer")
    public void handleAnswer(
            @DestinationVariable String threadId,
            CallSignal signal,
            Principal principal) {

        if (principal == null) return;
        String calleeId = principal.getName();

        ChatThread thread = verifyAndGetOpenThread(threadId, calleeId);
        if (thread == null) return;

        // Update Call Log to note call started/connected
        if (signal.getCallLogId() != null) {
            callLogRepository.findById(signal.getCallLogId()).ifPresent(log -> {
                log.setStatus("completed");
                log.setStartedAt(LocalDateTime.now()); // Record connection start
                callLogRepository.save(log);
            });
        }

        signal.setThreadId(threadId);

        // Forward answer to Caller's specific channel
        messagingTemplate.convertAndSend(
                "/topic/call/" + threadId + "/" + signal.getTargetUserId(), 
                signal
        );
    }

    // 3. Relays ICE Candidates between Caller and Callee
    @MessageMapping("/call/{threadId}/ice-candidate")
    public void handleIceCandidate(
            @DestinationVariable String threadId,
            CallSignal signal,
            Principal principal) {

        if (principal == null) return;
        String senderId = principal.getName();

        ChatThread thread = verifyAndGetOpenThread(threadId, senderId);
        if (thread == null) return;

        signal.setThreadId(threadId);

        // Relay candidate to the other participant's signaling channel
        messagingTemplate.convertAndSend(
                "/topic/call/" + threadId + "/" + signal.getTargetUserId(), 
                signal
        );
    }

    // 4. Relays Decline signal
    @MessageMapping("/call/{threadId}/decline")
    public void handleDecline(
            @DestinationVariable String threadId,
            CallSignal signal,
            Principal principal) {

        if (principal == null) return;
        String calleeId = principal.getName();

        ChatThread thread = verifyAndGetOpenThread(threadId, calleeId);
        if (thread == null) return;

        // Update Call Log
        if (signal.getCallLogId() != null) {
            callLogRepository.findById(signal.getCallLogId()).ifPresent(log -> {
                log.setStatus("declined");
                log.setEndedAt(LocalDateTime.now());
                log.setDurationSeconds(0);
                callLogRepository.save(log);
            });
        }

        signal.setThreadId(threadId);

        // Forward decline to Caller
        messagingTemplate.convertAndSend(
                "/topic/call/" + threadId + "/" + signal.getTargetUserId(), 
                signal
        );
    }

    // 5. Relays Hangup signal
    @MessageMapping("/call/{threadId}/hangup")
    public void handleHangup(
            @DestinationVariable String threadId,
            CallSignal signal,
            Principal principal) {

        if (principal == null) return;
        String senderId = principal.getName();

        ChatThread thread = verifyAndGetOpenThread(threadId, senderId);
        if (thread == null) return;

        // Calculate and log call duration
        if (signal.getCallLogId() != null) {
            callLogRepository.findById(signal.getCallLogId()).ifPresent(log -> {
                LocalDateTime end = LocalDateTime.now();
                log.setEndedAt(end);
                if ("completed".equals(log.getStatus()) && log.getStartedAt() != null) {
                    long secs = Duration.between(log.getStartedAt(), end).getSeconds();
                    log.setDurationSeconds((int) secs);
                } else {
                    log.setDurationSeconds(0);
                }
                callLogRepository.save(log);
            });
        }

        signal.setThreadId(threadId);

        // Forward hangup to target
        messagingTemplate.convertAndSend(
                "/topic/call/" + threadId + "/" + signal.getTargetUserId(), 
                signal
        );
    }

    private ChatThread verifyAndGetOpenThread(String threadId, String userId) {
        Optional<ChatThread> threadOpt = chatThreadRepository.findById(threadId);
        if (threadOpt.isEmpty()) return null;

        ChatThread thread = threadOpt.get();
        if (!thread.getClientId().equals(userId) && !thread.getProviderId().equals(userId)) {
            return null;
        }

        if (!"OPEN".equals(thread.getStatus())) {
            return null;
        }

        return thread;
    }
}
