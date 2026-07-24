package com.knust.campusserv.request.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "service_requests")
public class ServiceRequest {

    @Id
    private String id;

    @Column(name = "requester_id", nullable = false)
    private String requesterId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id", nullable = false)
    private ServiceCategory category;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private LocalDateTime deadline;

    @Column(nullable = true)
    private String location;

    @Column(name = "service_mode", nullable = false)
    private String serviceMode;

    @Column(nullable = false)
    private String status = "OPEN"; // 'OPEN', 'ASSIGNED', 'COMPLETED', 'CANCELLED'

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "title")
    private String title;

    @Column(name = "budget_min")
    private java.math.BigDecimal budgetMin;

    @Column(name = "budget_max")
    private java.math.BigDecimal budgetMax;

    @Column(name = "timing_type")
    private String timingType;

    @Column(name = "scheduled_date")
    private LocalDateTime scheduledDate;

    @Column(name = "location_type")
    private String locationType;

    @Column(name = "location_detail")
    private String locationDetail;

    @Column(name = "delivery_mode")
    private String deliveryMode;

    @Column(name = "bid_window_closes")
    private LocalDateTime bidWindowCloses;

    @Column(name = "escrow_held")
    private Boolean escrowHeld = false;

    @Column(name = "cancellation_reason")
    private String cancellationReason;

    @Column(name = "target_provider_id")
    private String targetProviderId;

    // Getters and Setters
    public String getTargetProviderId() { return targetProviderId; }
    public void setTargetProviderId(String targetProviderId) { this.targetProviderId = targetProviderId; }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getRequesterId() { return requesterId; }
    public void setRequesterId(String requesterId) { this.requesterId = requesterId; }

    public ServiceCategory getCategory() { return category; }
    public void setCategory(ServiceCategory category) { this.category = category; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalDateTime getDeadline() { return deadline; }
    public void setDeadline(LocalDateTime deadline) { this.deadline = deadline; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public java.math.BigDecimal getBudgetMin() { return budgetMin; }
    public void setBudgetMin(java.math.BigDecimal budgetMin) { this.budgetMin = budgetMin; }

    public java.math.BigDecimal getBudgetMax() { return budgetMax; }
    public void setBudgetMax(java.math.BigDecimal budgetMax) { this.budgetMax = budgetMax; }

    public String getTimingType() { return timingType; }
    public void setTimingType(String timingType) { this.timingType = timingType; }

    public LocalDateTime getScheduledDate() { return scheduledDate; }
    public void setScheduledDate(LocalDateTime scheduledDate) { this.scheduledDate = scheduledDate; }

    public String getLocationType() { return locationType; }
    public void setLocationType(String locationType) { this.locationType = locationType; }

    public String getLocationDetail() { return locationDetail; }
    public void setLocationDetail(String locationDetail) { this.locationDetail = locationDetail; }

    public String getDeliveryMode() { return deliveryMode; }
    public void setDeliveryMode(String deliveryMode) { this.deliveryMode = deliveryMode; }

    public LocalDateTime getBidWindowCloses() { return bidWindowCloses; }
    public void setBidWindowCloses(LocalDateTime bidWindowCloses) { this.bidWindowCloses = bidWindowCloses; }

    public Boolean getEscrowHeld() { return escrowHeld; }
    public void setEscrowHeld(Boolean escrowHeld) { this.escrowHeld = escrowHeld; }

    public String getCancellationReason() { return cancellationReason; }
    public void setCancellationReason(String cancellationReason) { this.cancellationReason = cancellationReason; }

    public String getServiceMode() { return serviceMode; }
    public void setServiceMode(String serviceMode) { this.serviceMode = serviceMode; }

    @PrePersist
    @PostLoad
    public void ensureServiceMode() {
        if (this.serviceMode == null) {
            this.serviceMode = "ON_SITE";
        }
    }
}
