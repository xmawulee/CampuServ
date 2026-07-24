package com.knust.campusserv.support.controller;

import com.knust.campusserv.support.model.*;
import com.knust.campusserv.support.repository.ChatMessageRepository;
import com.knust.campusserv.support.repository.ChatThreadRepository;
import com.knust.campusserv.support.service.FileStorageService;
import com.knust.campusserv.support.service.RateLimiterService;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/chats")
public class ChatController {

    @Autowired
    private ChatThreadRepository chatThreadRepository;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private RateLimiterService rateLimiterService;

    // 1. REST GET Thread Details by Request ID (with auto-initialization fallback)
    @GetMapping("/thread/request/{requestId}")
    public ResponseEntity<?> getThreadByRequest(
            @PathVariable("requestId") String requestId,
            @RequestHeader("X-User-Id") String userId) {

        Optional<ChatThread> threadOpt = chatThreadRepository.findByRequestId(requestId);
        
        ChatThread thread = null;
        if (threadOpt.isEmpty()) {
            // Fallback check: Query service_requests to see if it exists and is accepted/assigned
            try {
                Map<String, Object> reqMap = jdbcTemplate.queryForMap(
                        "SELECT status, requester_id FROM service_requests WHERE id = ?", requestId);
                
                String reqStatus = (String) reqMap.get("status");
                String requesterId = (String) reqMap.get("requester_id");

                if ("ASSIGNED".equals(reqStatus) || "COMPLETED".equals(reqStatus) || "CANCELLED".equals(reqStatus)) {
                    // Find accepted provider
                    String providerId = jdbcTemplate.queryForObject(
                            "SELECT provider_id FROM offers WHERE request_id = ? AND status = 'ACCEPTED' LIMIT 1",
                            String.class, requestId);

                    if (providerId != null) {
                        // Dynamically create the thread
                        thread = new ChatThread();
                        thread.setId("thd-" + UUID.randomUUID().toString());
                        thread.setRequestId(requestId);
                        thread.setClientId(requesterId);
                        thread.setProviderId(providerId);
                        thread.setStatus("COMPLETED".equals(reqStatus) || "CANCELLED".equals(reqStatus) ? "LOCKED" : "OPEN");
                        thread = chatThreadRepository.save(thread);

                        // Post first system message
                        ChatMessage sysMsg = new ChatMessage();
                        sysMsg.setId("msg-" + UUID.randomUUID().toString());
                        sysMsg.setThreadId(thread.getId());
                        sysMsg.setSenderId(null);
                        sysMsg.setType(MessageType.SYSTEM);
                        sysMsg.setContent("Thread created by system.");
                        sysMsg.setCreatedAt(LocalDateTime.now());
                        chatMessageRepository.save(sysMsg);
                    }
                }
            } catch (Exception e) {
                // Log and ignore
                e.printStackTrace();
            }
        } else {
            thread = threadOpt.get();
        }

        if (thread == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Thread not found");
        }

        String otherParticipantId = userId.equals(thread.getClientId()) ? thread.getProviderId() : thread.getClientId();
        Map<String, Object> otherParticipant = new HashMap<>();
        otherParticipant.put("id", otherParticipantId);
        try {
            Map<String, Object> userMap = jdbcTemplate.queryForMap(
                    "SELECT full_name, profile_picture_url FROM users WHERE id = ?", otherParticipantId);
            otherParticipant.put("fullName", userMap.get("full_name"));
            otherParticipant.put("profilePictureUrl", userMap.get("profile_picture_url"));
        } catch (Exception e) {
            otherParticipant.put("fullName", "User");
            otherParticipant.put("profilePictureUrl", null);
        }

        long msgCount = 0;
        try {
            Long count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM chat_messages WHERE thread_id = ?", Long.class, thread.getId());
            msgCount = count != null ? count : 0;
        } catch (Exception ignored) {}

        Map<String, Object> resp = new HashMap<>();
        resp.put("id", thread.getId());
        resp.put("requestId", thread.getRequestId());
        resp.put("clientId", thread.getClientId());
        resp.put("providerId", thread.getProviderId());
        resp.put("status", thread.getStatus());
        resp.put("createdAt", thread.getCreatedAt());
        resp.put("otherParticipant", otherParticipant);
        resp.put("hasHistory", msgCount > 0);

        return ResponseEntity.ok(resp);
    }

    // 2. WebSocket Message Mapping
    @MessageMapping("/chat/{threadId}/send")
    public void sendMessage(
            @DestinationVariable String threadId,
            ChatMessage chatMessage,
            Principal principal) {
        
        Optional<ChatThread> threadOpt = chatThreadRepository.findById(threadId);
        if (threadOpt.isEmpty()) return;

        ChatThread thread = threadOpt.get();
        if ("LOCKED".equals(thread.getStatus())) return;

        chatMessage.setId("msg-" + UUID.randomUUID().toString());
        chatMessage.setThreadId(threadId);
        chatMessage.setCreatedAt(LocalDateTime.now());
        
        chatMessageRepository.save(chatMessage);
        
        // No setLastMessageAt
        // chatThreadRepository.save(thread);

        messagingTemplate.convertAndSend("/topic/chat/" + threadId, chatMessage);
    }

    // 3. REST GET Messages
    @GetMapping("/thread/{threadId}/messages")
    public ResponseEntity<?> getMessages(
            @PathVariable("threadId") String threadId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        
        Page<ChatMessage> messages = chatMessageRepository.findByThreadIdOrderByCreatedAtDesc(
                threadId,
                PageRequest.of(page, size, Sort.by("createdAt").descending())
        );
        return ResponseEntity.ok(messages.getContent());
    }

    // 4. REST POST File Attachment
    @PostMapping("/thread/{threadId}/attachment")
    public ResponseEntity<?> uploadAttachment(
            @PathVariable("threadId") String threadId,
            @RequestParam("file") MultipartFile file,
            @RequestHeader("X-User-Id") String userId) {
        
        try {
            Optional<ChatThread> threadOpt = chatThreadRepository.findById(threadId);
            if (threadOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Thread not found");
            }

            ChatThread thread = threadOpt.get();
            if ("LOCKED".equals(thread.getStatus())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Thread is locked");
            }

            String fileUrl = fileStorageService.storeFile(file);
            
            ChatMessage chatMessage = new ChatMessage();
            chatMessage.setId("msg-" + UUID.randomUUID().toString());
            chatMessage.setThreadId(threadId);
            chatMessage.setSenderId(userId);
            chatMessage.setType(MessageType.TEXT);
            chatMessage.setMediaUrl(fileUrl);
            chatMessage.setContent("");
            chatMessage.setCreatedAt(LocalDateTime.now());
            
            chatMessageRepository.save(chatMessage);
            // No setLastMessageAt
            // chatThreadRepository.save(thread);

            messagingTemplate.convertAndSend("/topic/chat/" + threadId, chatMessage);

            return ResponseEntity.ok(chatMessage);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }
}