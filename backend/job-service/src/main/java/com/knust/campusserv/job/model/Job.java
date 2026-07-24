package com.knust.campusserv.job.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "jobs")
public class Job {

    @Id
    private String id;

    @Column(name = "request_id", nullable = false)
    private String requestId;

    @Column(name = "offer_id", nullable = false)
    private String offerId;

    @Column(name = "requester_id", nullable = false)
    private String requesterId;

    @Column(name = "provider_id", nullable = false)
    private String providerId;

    @Column(nullable = false)
    private String status = "ACTIVE"; // 'ACTIVE', 'PROOF_SUBMITTED', 'COMPLETED', 'DISPUTED'

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "completion_code_hash")
    private String completionCodeHash;

    @Column(name = "completion_code")
    private String completionCode;

    @Column(name = "completion_code_expires_at")
    private LocalDateTime completionCodeExpiresAt;

    @Column(name = "completion_code_attempts")
    private Integer completionCodeAttempts = 0;

    @Column(name = "completion_code_locked_until")
    private LocalDateTime completionCodeLockedUntil;

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getRequestId() { return requestId; }
    public void setRequestId(String requestId) { this.requestId = requestId; }

    public String getOfferId() { return offerId; }
    public void setOfferId(String offerId) { this.offerId = offerId; }

    public String getRequesterId() { return requesterId; }
    public void setRequesterId(String requesterId) { this.requesterId = requesterId; }

    public String getProviderId() { return providerId; }
    public void setProviderId(String providerId) { this.providerId = providerId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getCompletionCodeHash() { return completionCodeHash; }
    public void setCompletionCodeHash(String completionCodeHash) { this.completionCodeHash = completionCodeHash; }

    public String getCompletionCode() { return completionCode; }
    public void setCompletionCode(String completionCode) { this.completionCode = completionCode; }

    public LocalDateTime getCompletionCodeExpiresAt() { return completionCodeExpiresAt; }
    public void setCompletionCodeExpiresAt(LocalDateTime completionCodeExpiresAt) { this.completionCodeExpiresAt = completionCodeExpiresAt; }

    public Integer getCompletionCodeAttempts() { return completionCodeAttempts; }
    public void setCompletionCodeAttempts(Integer completionCodeAttempts) { this.completionCodeAttempts = completionCodeAttempts; }

    public LocalDateTime getCompletionCodeLockedUntil() { return completionCodeLockedUntil; }
    public void setCompletionCodeLockedUntil(LocalDateTime completionCodeLockedUntil) { this.completionCodeLockedUntil = completionCodeLockedUntil; }

    @Column(name = "service_mode", nullable = false)
    private String serviceMode;

    @Column(name = "location_address")
    private String locationAddress;

    @Column(name = "location_lat")
    private Double locationLat;

    @Column(name = "location_lng")
    private Double locationLng;

    @Column(name = "location_hint")
    private String locationHint;

    @Column(name = "remote_info", columnDefinition = "TEXT")
    private String remoteInfo;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "job_attachments", joinColumns = @JoinColumn(name = "job_id"))
    @Column(name = "url")
    private List<String> attachmentUrls;

    @Column(name = "request_title")
    private String requestTitle;

    @Column(name = "request_description", columnDefinition = "TEXT")
    private String requestDescription;

    @Column(name = "agreed_price")
    private BigDecimal agreedPrice;

    @Transient
    private String requesterName;

    @Transient
    private String categoryName;

    public String getRequesterName() { return requesterName; }
    public void setRequesterName(String requesterName) { this.requesterName = requesterName; }

    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }

    public String getServiceMode() { return serviceMode; }
    public void setServiceMode(String serviceMode) { this.serviceMode = serviceMode; }

    public String getLocationAddress() { return locationAddress; }
    public void setLocationAddress(String locationAddress) { this.locationAddress = locationAddress; }

    public Double getLocationLat() { return locationLat; }
    public void setLocationLat(Double locationLat) { this.locationLat = locationLat; }

    public Double getLocationLng() { return locationLng; }
    public void setLocationLng(Double locationLng) { this.locationLng = locationLng; }

    public String getLocationHint() { return locationHint; }
    public void setLocationHint(String locationHint) { this.locationHint = locationHint; }

    public String getRemoteInfo() { return remoteInfo; }
    public void setRemoteInfo(String remoteInfo) { this.remoteInfo = remoteInfo; }

    public List<String> getAttachmentUrls() { return attachmentUrls; }
    public void setAttachmentUrls(List<String> attachmentUrls) { this.attachmentUrls = attachmentUrls; }

    public String getRequestTitle() { return requestTitle; }
    public void setRequestTitle(String requestTitle) { this.requestTitle = requestTitle; }

    public String getRequestDescription() { return requestDescription; }
    public void setRequestDescription(String requestDescription) { this.requestDescription = requestDescription; }

    public BigDecimal getAgreedPrice() { return agreedPrice; }
    public void setAgreedPrice(BigDecimal agreedPrice) { this.agreedPrice = agreedPrice; }

    @PrePersist
    @PostLoad
    public void ensureServiceMode() {
        if (this.serviceMode == null) {
            this.serviceMode = "ON_SITE";
        }
    }
}
