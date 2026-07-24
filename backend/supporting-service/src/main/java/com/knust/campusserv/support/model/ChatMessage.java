package com.knust.campusserv.support.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_messages")
public class ChatMessage {

    @Id
    private String id;

    @Column(name = "thread_id", nullable = false)
    private String threadId;

    @Column(name = "sender_id", nullable = true)
    private String senderId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MessageType type = MessageType.TEXT;

    @Column(columnDefinition = "TEXT")
    private String content;

    // Kept for future media-sharing feature — not used by text-chat flow
    @Column(name = "media_url")
    private String mediaUrl;

    @Column(name = "media_duration_seconds")
    private Integer mediaDurationSeconds;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MessageStatus status = MessageStatus.SENT;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    // Client-generated temp ID echoed back for optimistic-send reconciliation.
    // Nullable — absent on system messages.
    @Column(name = "client_temp_id")
    private String clientTempId;

    // Timestamp at which the other participant read this message.
    // Nullable — null means unread. Adequate for 1:1 threads.
    @Column(name = "read_at")
    private LocalDateTime readAt;

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getThreadId() { return threadId; }
    public void setThreadId(String threadId) { this.threadId = threadId; }

    public String getSenderId() { return senderId; }
    public void setSenderId(String senderId) { this.senderId = senderId; }

    public MessageType getType() { return type; }
    public void setType(MessageType type) { this.type = type; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getMediaUrl() { return mediaUrl; }
    public void setMediaUrl(String mediaUrl) { this.mediaUrl = mediaUrl; }

    public Integer getMediaDurationSeconds() { return mediaDurationSeconds; }
    public void setMediaDurationSeconds(Integer mediaDurationSeconds) { this.mediaDurationSeconds = mediaDurationSeconds; }

    public MessageStatus getStatus() { return status; }
    public void setStatus(MessageStatus status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public String getClientTempId() { return clientTempId; }
    public void setClientTempId(String clientTempId) { this.clientTempId = clientTempId; }

    public LocalDateTime getReadAt() { return readAt; }
    public void setReadAt(LocalDateTime readAt) { this.readAt = readAt; }
}
