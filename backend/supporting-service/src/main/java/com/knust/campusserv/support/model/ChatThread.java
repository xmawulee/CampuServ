package com.knust.campusserv.support.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "chat_threads",
    uniqueConstraints = @UniqueConstraint(name = "uq_student_provider", columnNames = {"student_id", "provider_id"})
)
public class ChatThread {

    @Id
    private String id;

    // ── New student-provider pair fields ──────────────────────────────────────
    @Column(name = "student_id")
    private String studentId;

    // provider_id already existed in the legacy schema; re-used here
    @Column(name = "provider_id", nullable = false)
    private String providerId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "last_message_at")
    private LocalDateTime lastMessageAt = LocalDateTime.now();

    // ── Legacy columns: kept to satisfy DB NOT NULL constraints on old rows ───
    // New rows will receive null-safe defaults via the database column defaults.
    @Column(name = "request_id", insertable = false, updatable = false)
    private String requestId;

    @Column(name = "client_id", insertable = false, updatable = false)
    private String clientId;

    @Column(name = "status", insertable = false, updatable = false)
    private String status;

    // ── Getters and Setters ───────────────────────────────────────────────────

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public String getProviderId() { return providerId; }
    public void setProviderId(String providerId) { this.providerId = providerId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getLastMessageAt() { return lastMessageAt; }
    public void setLastMessageAt(LocalDateTime lastMessageAt) { this.lastMessageAt = lastMessageAt; }

    // Legacy getters (read-only)
    public String getRequestId() { return requestId; }
    public String getClientId() { return clientId; }
    public String getStatus() { return status; }
}
