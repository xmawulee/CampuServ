package com.knust.campusserv.support.dto;

import lombok.Data;

@Data
public class AuditLogRequest {
    private String adminId;
    private String actionType;
    private String targetEntity;
    private String targetId;
    private String reason;
}
