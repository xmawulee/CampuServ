package com.knust.campusserv.job.event;

import java.time.LocalDateTime;

public class JobCompletedEvent {
    private String jobId;
    private String clientId;
    private String providerId;
    private String requestId;
    private LocalDateTime completedAt;

    public JobCompletedEvent() {
    }

    public JobCompletedEvent(String jobId, String clientId, String providerId, String requestId, LocalDateTime completedAt) {
        this.jobId = jobId;
        this.clientId = clientId;
        this.providerId = providerId;
        this.requestId = requestId;
        this.completedAt = completedAt;
    }

    public String getJobId() {
        return jobId;
    }

    public void setJobId(String jobId) {
        this.jobId = jobId;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getProviderId() {
        return providerId;
    }

    public void setProviderId(String providerId) {
        this.providerId = providerId;
    }

    public String getRequestId() {
        return requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }
}
