package com.knust.campusserv.support.model;

import java.io.Serializable;

public class NotificationPayload implements Serializable {
    private String type;
    private String entityId;
    private String summary;
    private String severity;
    private String timestamp;

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
}
