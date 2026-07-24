package com.knust.campusserv.payment.dto;

import com.knust.campusserv.payment.model.Transaction;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class TransactionReceiptDto {
    private String transactionId;
    private String paystackReference;
    private String orderId;
    private String payerName;
    private String payerStudentId;
    private String payerEmail;
    private String providerName;
    private String providerStudentId;
    private String serviceTitle;
    private String serviceCategory;
    private String serviceDescription;
    private BigDecimal agreedBidAmount;
    private BigDecimal platformCommission;
    private BigDecimal providerPayout;
    private String paymentMethod;
    private String paymentChannel;
    private String status;
    private String escrowStatus;
    private LocalDateTime initiatedAt;
    private LocalDateTime confirmedAt;
    private LocalDateTime escrowReleasedAt;
    private String campusZone;

    public TransactionReceiptDto(Transaction tx) {
        this.transactionId = tx.getId();
        this.paystackReference = tx.getPaystackReference();
        this.orderId = tx.getJobId();
        this.payerName = tx.getPayerName();
        this.payerStudentId = tx.getPayerStudentId();
        this.payerEmail = tx.getPayerEmail();
        this.providerName = tx.getProviderName();
        this.providerStudentId = tx.getProviderStudentId();
        this.serviceTitle = tx.getServiceTitle();
        this.serviceCategory = tx.getServiceCategory();
        this.serviceDescription = tx.getServiceDescription();
        this.agreedBidAmount = tx.getAgreedBidAmount();
        this.platformCommission = tx.getPlatformCommission();
        this.providerPayout = tx.getProviderPayout();
        this.paymentMethod = tx.getPaymentMethod();
        this.paymentChannel = tx.getPaymentChannel();
        this.status = tx.getStatus();
        this.escrowStatus = tx.getEscrowStatus();
        this.initiatedAt = tx.getCreatedAt();
        this.confirmedAt = tx.getConfirmedAt();
        this.escrowReleasedAt = tx.getEscrowReleasedAt();
        this.campusZone = tx.getCampusZone();
    }

    // Getters and Setters
    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }

    public String getPaystackReference() { return paystackReference; }
    public void setPaystackReference(String paystackReference) { this.paystackReference = paystackReference; }

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }

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

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getEscrowStatus() { return escrowStatus; }
    public void setEscrowStatus(String escrowStatus) { this.escrowStatus = escrowStatus; }

    public LocalDateTime getInitiatedAt() { return initiatedAt; }
    public void setInitiatedAt(LocalDateTime initiatedAt) { this.initiatedAt = initiatedAt; }

    public LocalDateTime getConfirmedAt() { return confirmedAt; }
    public void setConfirmedAt(LocalDateTime confirmedAt) { this.confirmedAt = confirmedAt; }

    public LocalDateTime getEscrowReleasedAt() { return escrowReleasedAt; }
    public void setEscrowReleasedAt(LocalDateTime escrowReleasedAt) { this.escrowReleasedAt = escrowReleasedAt; }

    public String getCampusZone() { return campusZone; }
    public void setCampusZone(String campusZone) { this.campusZone = campusZone; }
}
