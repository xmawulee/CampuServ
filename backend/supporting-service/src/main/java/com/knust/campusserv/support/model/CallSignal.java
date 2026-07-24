package com.knust.campusserv.support.model;

public class CallSignal {
    private String sdp;
    private String type; // 'offer', 'answer', 'candidate', 'decline', 'hangup'
    private Object candidate; // ICE candidate payload
    private String targetUserId;
    private String callerId;
    private String callerName;
    private String callerAvatarUrl;
    private String threadId;
    private String callLogId;

    // Getters and Setters
    public String getSdp() { return sdp; }
    public void setSdp(String sdp) { this.sdp = sdp; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public Object getCandidate() { return candidate; }
    public void setCandidate(Object candidate) { this.candidate = candidate; }

    public String getTargetUserId() { return targetUserId; }
    public void setTargetUserId(String targetUserId) { this.targetUserId = targetUserId; }

    public String getCallerId() { return callerId; }
    public void setCallerId(String callerId) { this.callerId = callerId; }

    public String getCallerName() { return callerName; }
    public void setCallerName(String callerName) { this.callerName = callerName; }

    public String getCallerAvatarUrl() { return callerAvatarUrl; }
    public void setCallerAvatarUrl(String callerAvatarUrl) { this.callerAvatarUrl = callerAvatarUrl; }

    public String getThreadId() { return threadId; }
    public void setThreadId(String threadId) { this.threadId = threadId; }

    public String getCallLogId() { return callLogId; }
    public void setCallLogId(String callLogId) { this.callLogId = callLogId; }
}
