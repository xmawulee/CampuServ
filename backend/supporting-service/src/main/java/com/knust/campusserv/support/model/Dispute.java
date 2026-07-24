package com.knust.campusserv.support.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "disputes")
public class Dispute {

    @Id
    private String id;

    @Column(name = "job_id", nullable = false)
    private String jobId;

    @Column(name = "raised_by_id", nullable = false)
    private String raisedById;

    @Column(name = "reason", nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private DisputeStatus status = DisputeStatus.OPEN;

    @Column(nullable = true)
    @Enumerated(EnumType.STRING)
    private DisputeResolution resolution;

    @Column(name = "resolved_by_admin_id")
    private String resolvedByAdminId;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum DisputeStatus {
        OPEN,
        UNDER_REVIEW,
        RESOLVED
    }

    public enum DisputeResolution {
        RELEASE_TO_PROVIDER,
        REFUND_REQUESTER,
        SPLIT
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getJobId() { return jobId; }
    public void setJobId(String jobId) { this.jobId = jobId; }

    public String getRaisedById() { return raisedById; }
    public void setRaisedById(String raisedById) { this.raisedById = raisedById; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public DisputeStatus getStatus() { return status; }
    public void setStatus(DisputeStatus status) { this.status = status; }

    public DisputeResolution getResolution() { return resolution; }
    public void setResolution(DisputeResolution resolution) { this.resolution = resolution; }

    public String getResolvedByAdminId() { return resolvedByAdminId; }
    public void setResolvedByAdminId(String resolvedByAdminId) { this.resolvedByAdminId = resolvedByAdminId; }

    public LocalDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(LocalDateTime resolvedAt) { this.resolvedAt = resolvedAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
