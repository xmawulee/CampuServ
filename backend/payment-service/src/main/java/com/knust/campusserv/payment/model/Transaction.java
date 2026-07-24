package com.knust.campusserv.payment.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "transactions")
public class Transaction {

    @Id
    private String id;

    @Column(name = "job_id", nullable = false)
    private String jobId;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private String status = "HELD"; // 'HELD', 'RELEASED', 'REFUNDED'

    @Column(name = "paystack_reference", unique = true)
    private String paystackReference;

    @Column(name = "payer_name")
    private String payerName;

    @Column(name = "payer_student_id")
    private String payerStudentId;

    @Column(name = "payer_email")
    private String payerEmail;

    @Column(name = "provider_name")
    private String providerName;

    @Column(name = "provider_student_id")
    private String providerStudentId;

    @Column(name = "service_title")
    private String serviceTitle;

    @Column(name = "service_category")
    private String serviceCategory;

    @Column(name = "service_description")
    private String serviceDescription;

    @Column(name = "agreed_bid_amount")
    private BigDecimal agreedBidAmount;

    @Column(name = "platform_commission")
    private BigDecimal platformCommission;

    @Column(name = "provider_payout")
    private BigDecimal providerPayout;

    @Column(name = "payment_method")
    private String paymentMethod;

    @Column(name = "payment_channel")
    private String paymentChannel;

    @Column(name = "escrow_status")
    private String escrowStatus = "IN_ESCROW";

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Column(name = "escrow_released_at")
    private LocalDateTime escrowReleasedAt;

    @Column(name = "campus_zone")
    private String campusZone;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getJobId() { return jobId; }
    public void setJobId(String jobId) { this.jobId = jobId; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPaystackReference() { return paystackReference; }
    public void setPaystackReference(String paystackReference) { this.paystackReference = paystackReference; }

    public String getPayerName() { return payerName; }
    public void setPayerName(String payerName) { this.payerName = payerName; }

    public String getPayerStudentId() { return payerStudentId; }
    public void setPayerStudentId(String payerStudentId) { this.payerStudentId = payerStudentId; }

    public String getPayerEmail() { return payerEmail; }
    public void setPayerEmail(String payerEmail) { this.payerEmail = payerEmail; }

    public String getProviderName() { return providerName; }
    public void setProviderName(String providerName) { this.providerName = providerName; }

    public String getProviderStudentId() { return providerStudentId; }
    public void setProviderStudentId(String providerStudentId) { this.providerStudentId = providerStudentId; }

    public String getServiceTitle() { return serviceTitle; }
    public void setServiceTitle(String serviceTitle) { this.serviceTitle = serviceTitle; }

    public String getServiceCategory() { return serviceCategory; }
    public void setServiceCategory(String serviceCategory) { this.serviceCategory = serviceCategory; }

    public String getServiceDescription() { return serviceDescription; }
    public void setServiceDescription(String serviceDescription) { this.serviceDescription = serviceDescription; }

    public BigDecimal getAgreedBidAmount() { return agreedBidAmount; }
    public void setAgreedBidAmount(BigDecimal agreedBidAmount) { this.agreedBidAmount = agreedBidAmount; }

    public BigDecimal getPlatformCommission() { return platformCommission; }
    public void setPlatformCommission(BigDecimal platformCommission) { this.platformCommission = platformCommission; }

    public BigDecimal getProviderPayout() { return providerPayout; }
    public void setProviderPayout(BigDecimal providerPayout) { this.providerPayout = providerPayout; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getPaymentChannel() { return paymentChannel; }
    public void setPaymentChannel(String paymentChannel) { this.paymentChannel = paymentChannel; }

    public String getEscrowStatus() { return escrowStatus; }
    public void setEscrowStatus(String escrowStatus) { this.escrowStatus = escrowStatus; }

    public LocalDateTime getConfirmedAt() { return confirmedAt; }
    public void setConfirmedAt(LocalDateTime confirmedAt) { this.confirmedAt = confirmedAt; }

    public LocalDateTime getEscrowReleasedAt() { return escrowReleasedAt; }
    public void setEscrowReleasedAt(LocalDateTime escrowReleasedAt) { this.escrowReleasedAt = escrowReleasedAt; }

    public String getCampusZone() { return campusZone; }
    public void setCampusZone(String campusZone) { this.campusZone = campusZone; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
