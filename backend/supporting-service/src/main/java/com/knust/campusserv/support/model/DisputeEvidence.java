package com.knust.campusserv.support.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "dispute_evidence")
public class DisputeEvidence {

    @Id
    private String id;

    @Column(name = "dispute_id", nullable = false)
    private String disputeId;

    @Column(name = "uploaded_by_user_id", nullable = false)
    private String uploadedByUserId;

    @Column(name = "file_url", columnDefinition = "TEXT")
    private String fileUrl;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getDisputeId() { return disputeId; }
    public void setDisputeId(String disputeId) { this.disputeId = disputeId; }

    public String getUploadedByUserId() { return uploadedByUserId; }
    public void setUploadedByUserId(String uploadedByUserId) { this.uploadedByUserId = uploadedByUserId; }

    public String getFileUrl() { return fileUrl; }
    public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
