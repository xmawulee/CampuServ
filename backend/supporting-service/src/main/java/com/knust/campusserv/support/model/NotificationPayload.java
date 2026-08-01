package com.knust.campusserv.support.model;

import java.io.Serializable;

public class NotificationPayload implements Serializable {
    private String type;
    private String entityId;
    private String summary;
    private String severity;
    private String timestamp;
    private String requestId;
    private String offerId;
    private String providerId;
    private String requesterId;
    private Double price;
    private String jobId;

    public NotificationPayload() {}

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    
    public String getEntityId() { return entityId; }
    public void setEntityId(String entityId) { this.entityId = entityId; }
    
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    
    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }
    
    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }

    public String getRequestId() { return requestId; }
    public void setRequestId(String requestId) { this.requestId = requestId; }

    public String getOfferId() { return offerId; }
    public void setOfferId(String offerId) { this.offerId = offerId; }

    public String getProviderId() { return providerId; }
    public void setProviderId(String providerId) { this.providerId = providerId; }

    public String getRequesterId() { return requesterId; }
    public void setRequesterId(String requesterId) { this.requesterId = requesterId; }

    public Double getPrice() { return price; }
    public void setPrice(Double price) { this.price = price; }

    public String getJobId() { return jobId; }
    public void setJobId(String jobId) { this.jobId = jobId; }
}
