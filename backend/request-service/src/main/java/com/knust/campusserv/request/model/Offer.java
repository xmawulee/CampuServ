package com.knust.campusserv.request.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "offers")
public class Offer {

    @Id
    private String id;

    @Column(name = "request_id", nullable = false)
    private String requestId;

    @Column(name = "provider_id", nullable = false)
    private String providerId;

    @Column(nullable = false)
    private BigDecimal price;

    @Column(nullable = false)
    private String eta;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(nullable = false)
    private String status = "PENDING"; // 'PENDING', 'ACCEPTED', 'DECLINED'

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "offer_attachments", joinColumns = @JoinColumn(name = "offer_id"))
    @Column(name = "url")
    private List<String> attachmentUrls;

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getRequestId() { return requestId; }
    public void setRequestId(String requestId) { this.requestId = requestId; }

    public String getProviderId() { return providerId; }
    public void setProviderId(String providerId) { this.providerId = providerId; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public String getEta() { return eta; }
    public void setEta(String eta) { this.eta = eta; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public List<String> getAttachmentUrls() { return attachmentUrls; }
    public void setAttachmentUrls(List<String> attachmentUrls) { this.attachmentUrls = attachmentUrls; }
}
