package com.knust.campusserv.support.service;

import com.knust.campusserv.support.dto.AuditLogRequest;
import com.knust.campusserv.support.model.AuditLog;
import com.knust.campusserv.support.repository.AuditLogRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public AuditLog createLog(AuditLogRequest request) {
        AuditLog log = new AuditLog();
        log.setAdminId(request.getAdminId());
        log.setActionType(request.getActionType());
        log.setTargetEntity(request.getTargetEntity());
        log.setTargetId(request.getTargetId());
        log.setReason(request.getReason());
        return auditLogRepository.save(log);
    }

    public List<AuditLog> getAllLogs() {
        return auditLogRepository.findAll();
    }
}
