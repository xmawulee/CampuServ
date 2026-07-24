package com.knust.campusserv.payment.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "student_wallet_transactions")
public class StudentWalletTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "wallet_txn_id", nullable = false, unique = true, length = 30)
    private String walletTxnId;

    @Column(name = "user_id", nullable = false, length = 50)
    private String userId;

    @Column(nullable = false, length = 30)
    private String type; // 'DEPOSIT', 'ESCROW_HOLD', 'ESCROW_RELEASE', 'ESCROW_REFUND'

    @Column(nullable = false, length = 20)
    private String status = "SUCCESS"; // 'PENDING', 'SUCCESS', 'FAILED', 'PROCESSING'

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "balance_before", nullable = false, precision = 12, scale = 2)
    private BigDecimal balanceBefore;

    @Column(name = "balance_after", nullable = false, precision = 12, scale = 2)
    private BigDecimal balanceAfter;

    @Column(nullable = false, length = 5)
    private String currency = "GHS";

    @Column(name = "reference_id", length = 100, unique = true)
    private String referenceId; // Idempotency key / Paystack ref

    @Column(name = "related_job_id", length = 50)
    private String relatedJobId;

    @Column(length = 255)
    private String narration;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    public StudentWalletTransaction() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getWalletTxnId() { return walletTxnId; }
    public void setWalletTxnId(String walletTxnId) { this.walletTxnId = walletTxnId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public BigDecimal getBalanceBefore() { return balanceBefore; }
    public void setBalanceBefore(BigDecimal balanceBefore) { this.balanceBefore = balanceBefore; }

    public BigDecimal getBalanceAfter() { return balanceAfter; }
    public void setBalanceAfter(BigDecimal balanceAfter) { this.balanceAfter = balanceAfter; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getReferenceId() { return referenceId; }
    public void setReferenceId(String referenceId) { this.referenceId = referenceId; }

    public String getRelatedJobId() { return relatedJobId; }
    public void setRelatedJobId(String relatedJobId) { this.relatedJobId = relatedJobId; }

    public String getNarration() { return narration; }
    public void setNarration(String narration) { this.narration = narration; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
