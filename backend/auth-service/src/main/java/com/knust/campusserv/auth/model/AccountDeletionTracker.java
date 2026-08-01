package com.knust.campusserv.auth.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "account_deletion_trackers")
public class AccountDeletionTracker {

    @Id
    @Column(name = "user_id")
    private String userId;

    @Column(nullable = false)
    private String email;

    @Column(name = "user_svc_ack")
    private boolean userSvcAck = false;

    @Column(name = "request_svc_ack")
    private boolean requestSvcAck = false;

    @Column(name = "job_svc_ack")
    private boolean jobSvcAck = false;

    @Column(name = "payment_svc_ack")
    private boolean paymentSvcAck = false;

    @Column(name = "support_svc_ack")
    private boolean supportSvcAck = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public AccountDeletionTracker() {}

    public AccountDeletionTracker(String userId, String email) {
        this.userId = userId;
        this.email = email;
    }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public boolean isUserSvcAck() { return userSvcAck; }
    public void setUserSvcAck(boolean userSvcAck) { this.userSvcAck = userSvcAck; }

    public boolean isRequestSvcAck() { return requestSvcAck; }
    public void setRequestSvcAck(boolean requestSvcAck) { this.requestSvcAck = requestSvcAck; }

    public boolean isJobSvcAck() { return jobSvcAck; }
    public void setJobSvcAck(boolean jobSvcAck) { this.jobSvcAck = jobSvcAck; }

    public boolean isPaymentSvcAck() { return paymentSvcAck; }
    public void setPaymentSvcAck(boolean paymentSvcAck) { this.paymentSvcAck = paymentSvcAck; }

    public boolean isSupportSvcAck() { return supportSvcAck; }
    public void setSupportSvcAck(boolean supportSvcAck) { this.supportSvcAck = supportSvcAck; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
