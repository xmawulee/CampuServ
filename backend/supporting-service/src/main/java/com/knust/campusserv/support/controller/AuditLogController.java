package com.knust.campusserv.support.controller;

import com.knust.campusserv.support.dto.AuditLogRequest;
import com.knust.campusserv.support.model.AuditLog;
import com.knust.campusserv.support.service.AuditLogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/admin/audit")
public class AuditLogController {

    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @PostMapping
    public ResponseEntity<AuditLog> createLog(@RequestBody AuditLogRequest request) {
        return ResponseEntity.ok(auditLogService.createLog(request));
    }

    @GetMapping
    public ResponseEntity<List<AuditLog>> getLogs(@RequestHeader("X-User-Role") String role) {
        if (!"ADMIN".equals(role)) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(auditLogService.getAllLogs());
    }
}
