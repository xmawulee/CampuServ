package com.knust.campusserv.support.controller;

import com.knust.campusserv.support.model.ChatMessage;
import com.knust.campusserv.support.model.ChatThread;
import com.knust.campusserv.support.repository.ChatMessageRepository;
import com.knust.campusserv.support.repository.ChatThreadRepository;
import com.knust.campusserv.support.repository.NotificationRepository;
import com.knust.campusserv.support.model.Notification;
import com.knust.campusserv.support.service.FileStorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

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
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private NotificationRepository notificationRepository;

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. POST /chats/start — Idempotently resolve or create a student-provider thread
    // ─────────────────────────────────────────────────────────────────────────────
    @PostMapping("/start")
    public ResponseEntity<?> startChat(
            @RequestHeader("X-User-Id") String callerId,
            @RequestHeader("X-User-Role") String callerRole,
            @RequestBody Map<String, String> body) {

        String providerId = body.get("providerId");
        String studentId = body.get("studentId");

        if ((providerId == null || providerId.isBlank()) && (studentId == null || studentId.isBlank())) {
            return ResponseEntity.badRequest().body("providerId or studentId is required");
        }

        if (providerId != null && !providerId.isBlank()) {
            if (providerId.equals(callerId)) {
                return ResponseEntity.badRequest().body("Cannot chat with yourself");
            }
            studentId = callerId;
        } else {
            if (studentId.equals(callerId)) {
                return ResponseEntity.badRequest().body("Cannot chat with yourself");
            }
            providerId = callerId;
        }

        final String finalStudentId = studentId;
        final String finalProviderId = providerId;

        Optional<ChatThread> existing = chatThreadRepository.findByStudentIdAndProviderId(finalStudentId, finalProviderId);
        ChatThread thread = existing.orElseGet(() -> {
            ChatThread t = new ChatThread();
            t.setId("thd-" + UUID.randomUUID());
            t.setStudentId(finalStudentId);
            t.setProviderId(finalProviderId);
            t.setCreatedAt(LocalDateTime.now());
            t.setLastMessageAt(LocalDateTime.now());
            return chatThreadRepository.save(t);
        });

        return ResponseEntity.ok(buildThreadSummary(thread, callerId));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. GET /chats — List all threads for the calling user
    // ─────────────────────────────────────────────────────────────────────────────
    @GetMapping
    public ResponseEntity<?> getChats(@RequestHeader("X-User-Id") String userId) {
        List<ChatThread> threads = chatThreadRepository.findByUserId(userId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (ChatThread t : threads) {
            result.add(buildThreadSummary(t, userId));
        }
        return ResponseEntity.ok(result);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 3. GET /chats/{threadId}/messages — Paginated message history
    // ─────────────────────────────────────────────────────────────────────────────
    @GetMapping("/{threadId}/messages")
    public ResponseEntity<?> getMessages(
            @PathVariable String threadId,
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "40") int size) {

        if (!isParticipant(threadId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Not a participant of this thread");
        }

        Page<ChatMessage> messages = chatMessageRepository.findByThreadIdOrderBySentAtDesc(
                threadId, PageRequest.of(page, size));

        return ResponseEntity.ok(messages.getContent());
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 4. POST /chats/{threadId}/messages — Send a text message
    // ─────────────────────────────────────────────────────────────────────────────
    @PostMapping("/{threadId}/messages")
    public ResponseEntity<?> sendMessage(
            @PathVariable String threadId,
            @RequestHeader("X-User-Id") String senderId,
            @RequestBody Map<String, String> body) {

        Optional<ChatThread> threadOpt = chatThreadRepository.findById(threadId);
        if (threadOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Thread not found");
        }
        ChatThread thread = threadOpt.get();

        if (!senderId.equals(thread.getStudentId()) && !senderId.equals(thread.getProviderId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Not a participant");
        }

        String content = body.getOrDefault("content", "").trim();
        String imageUrl = body.get("imageUrl");

        if (content.isEmpty() && (imageUrl == null || imageUrl.isBlank())) {
            return ResponseEntity.badRequest().body("Message must have content or imageUrl");
        }

        ChatMessage msg = new ChatMessage();
        msg.setId("msg-" + UUID.randomUUID());
        msg.setThreadId(threadId);
        msg.setSenderId(senderId);
        msg.setContent(content.isEmpty() ? null : content);
        msg.setImageUrl(imageUrl);
        msg.setSentAt(LocalDateTime.now());
        chatMessageRepository.save(msg);

        // Update thread's last activity timestamp
        thread.setLastMessageAt(msg.getSentAt());
        chatThreadRepository.save(thread);

        // Broadcast via STOMP
        messagingTemplate.convertAndSend("/topic/chat.thread." + threadId, msg);

        // Notify the other participant if they may not be listening
        String recipientId = senderId.equals(thread.getStudentId()) ? thread.getProviderId() : thread.getStudentId();
        sendChatNotification(recipientId, senderId, threadId, content.isEmpty() ? "📷 Image" : content);

        return ResponseEntity.ok(msg);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 4b. POST /chats/{threadId}/messages/image — Upload and send image message
    // ─────────────────────────────────────────────────────────────────────────────
    @PostMapping("/{threadId}/messages/image")
    public ResponseEntity<?> sendImageMessage(
            @PathVariable String threadId,
            @RequestHeader("X-User-Id") String senderId,
            @RequestParam("file") MultipartFile file) {

        Optional<ChatThread> threadOpt = chatThreadRepository.findById(threadId);
        if (threadOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Thread not found");
        }
        ChatThread thread = threadOpt.get();

        if (!senderId.equals(thread.getStudentId()) && !senderId.equals(thread.getProviderId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Not a participant");
        }

        try {
            String imageUrl = fileStorageService.storeFile(file);

            ChatMessage msg = new ChatMessage();
            msg.setId("msg-" + UUID.randomUUID());
            msg.setThreadId(threadId);
            msg.setSenderId(senderId);
            msg.setImageUrl(imageUrl);
            msg.setSentAt(LocalDateTime.now());
            chatMessageRepository.save(msg);

            thread.setLastMessageAt(msg.getSentAt());
            chatThreadRepository.save(thread);

            messagingTemplate.convertAndSend("/topic/chat.thread." + threadId, msg);

            String recipientId = senderId.equals(thread.getStudentId()) ? thread.getProviderId() : thread.getStudentId();
            sendChatNotification(recipientId, senderId, threadId, "📷 Image");

            return ResponseEntity.ok(msg);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to upload image: " + e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 5. POST /chats/{threadId}/read — Mark messages as read
    // ─────────────────────────────────────────────────────────────────────────────
    @PostMapping("/{threadId}/read")
    public ResponseEntity<?> markAsRead(
            @PathVariable String threadId,
            @RequestHeader("X-User-Id") String userId) {

        if (!isParticipant(threadId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Not a participant");
        }

        int count = chatMessageRepository.markThreadAsRead(threadId, userId, LocalDateTime.now());
        return ResponseEntity.ok(Map.of("marked", count));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────────

    private boolean isParticipant(String threadId, String userId) {
        return chatThreadRepository.findById(threadId)
                .map(t -> userId.equals(t.getStudentId()) || userId.equals(t.getProviderId()))
                .orElse(false);
    }

    private Map<String, Object> buildThreadSummary(ChatThread thread, String viewerId) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", thread.getId());
        map.put("studentId", thread.getStudentId());
        map.put("providerId", thread.getProviderId());
        map.put("createdAt", thread.getCreatedAt());
        map.put("lastMessageAt", thread.getLastMessageAt());

        // Resolve the other participant's profile
        String otherUserId = viewerId.equals(thread.getStudentId()) ? thread.getProviderId() : thread.getStudentId();
        map.put("otherUserId", otherUserId);
        try {
            Map<String, Object> userRow = jdbcTemplate.queryForMap(
                    "SELECT full_name, profile_picture_url FROM users WHERE id = ?", otherUserId);
            map.put("otherUserName", userRow.get("full_name"));
            map.put("otherUserAvatar", userRow.get("profile_picture_url"));
        } catch (Exception e) {
            map.put("otherUserName", "User");
            map.put("otherUserAvatar", null);
        }

        // Last message preview
        chatMessageRepository.findTopByThreadIdOrderBySentAtDesc(thread.getId()).ifPresent(last -> {
            map.put("lastMessage", last.getContent() != null ? last.getContent() : "📷 Image");
            map.put("lastMessageSenderId", last.getSenderId());
            map.put("lastMessageAt", last.getSentAt());
        });

        // Unread count for the viewer
        long unread = chatMessageRepository.countByThreadIdAndSenderIdNotAndReadAtIsNull(thread.getId(), viewerId);
        map.put("unreadCount", unread);

        return map;
    }

    private void sendChatNotification(String recipientId, String senderId, String threadId, String preview) {
        try {
            // Resolve sender name
            String senderName = "Someone";
            try {
                Map<String, Object> row = jdbcTemplate.queryForMap("SELECT full_name FROM users WHERE id = ?", senderId);
                senderName = (String) row.get("full_name");
                if (senderName != null) {
                    senderName = senderName.split(" ")[0]; // First name only
                }
            } catch (Exception ignored) {}

            Notification notification = new Notification();
            notification.setId("ntf-" + UUID.randomUUID());
            notification.setUserId(recipientId);
            notification.setTitle("New message from " + senderName);
            notification.setMessage(preview.length() > 80 ? preview.substring(0, 80) + "…" : preview);
            notification.setType("CHAT_MESSAGE");
            notification.setReferenceId(threadId);
            notification.setIsRead(false);
            notificationRepository.save(notification);

            // Real-time push
            messagingTemplate.convertAndSend("/topic/user/" + recipientId + "/notifications", notification);
        } catch (Exception e) {
            System.err.println("Failed to send chat notification: " + e.getMessage());
        }
    }
}