package com.knust.campusserv.support.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_messages")
public class ChatMessage {

    @Id
    private String id;

    @Column(name = "thread_id", nullable = false)
    private String threadId;

    @Column(name = "sender_id")
    private String senderId;

    @Column(columnDefinition = "TEXT")
    private String content;

    // URL for image messages (nullable)
    @Column(name = "image_url")
    private String imageUrl;

    // Primary timestamp for new messages
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt = LocalDateTime.now();

    // Null = unread; set when the recipient opens the thread
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    @Column(name = "read_at")
    private LocalDateTime readAt;

    // ── Legacy columns: DB has NOT NULL defaults; marked read-only so Hibernate
    //    schema validation passes without our code needing to set them.
    @Column(name = "type", insertable = false, updatable = false)
    private String type;

    @Column(name = "status", insertable = false, updatable = false)
    private String status;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "media_url", insertable = false, updatable = false)
    private String mediaUrl;

    @Column(name = "media_duration_seconds", insertable = false, updatable = false)
    private Integer mediaDurationSeconds;

    @Column(name = "client_temp_id", insertable = false, updatable = false)
    private String clientTempId;

    // ── Getters and Setters ───────────────────────────────────────────────────

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getThreadId() { return threadId; }
    public void setThreadId(String threadId) { this.threadId = threadId; }

    public String getSenderId() { return senderId; }
    public void setSenderId(String senderId) { this.senderId = senderId; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public LocalDateTime getSentAt() { return sentAt; }
    public void setSentAt(LocalDateTime sentAt) { this.sentAt = sentAt; }

    public LocalDateTime getReadAt() { return readAt; }
    public void setReadAt(LocalDateTime readAt) { this.readAt = readAt; }

    // Legacy read-only getters
    public String getType() { return type; }
    public String getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
