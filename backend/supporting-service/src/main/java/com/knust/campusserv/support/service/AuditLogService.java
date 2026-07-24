package com.knust.campusserv.support.service;

import com.knust.campusserv.support.dto.AuditLogRequest;
import com.knust.campusserv.support.model.AuditLog;
import com.knust.campusserv.support.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AuditLog createLog(AuditLogRequest request) {
        AuditLog log = AuditLog.builder()
                .adminId(request.getAdminId())
                .actionType(request.getActionType())
                .targetEntity(request.getTargetEntity())
                .targetId(request.getTargetId())
                .reason(request.getReason())
                .build();
        return auditLogRepository.save(log);
    }

    public List<AuditLog> getAllLogs() {
        return auditLogRepository.findAll();
    }
}
