package com.knust.campusserv.support.controller;

import com.knust.campusserv.support.model.Dispute;
import com.knust.campusserv.support.model.DisputeEvidence;
import com.knust.campusserv.support.service.DisputeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.knust.campusserv.support.model.AuditLog;
import com.knust.campusserv.support.repository.AuditLogRepository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/disputes")
public class DisputeController {

    @Autowired
    private DisputeService disputeService;

    @Autowired
    private AuditLogRepository auditLogRepository;

    private void logAudit(String adminId, String actionType, String targetEntity, String targetId, String reason) {
        try {
            AuditLog log = new AuditLog();
            log.setAdminId(adminId);
            log.setActionType(actionType);
            log.setTargetEntity(targetEntity);
            log.setTargetId(targetId);
            log.setReason(reason);
            auditLogRepository.save(log);
        } catch (Exception e) {
            System.err.println("Failed to log audit event: " + e.getMessage());
        }
    }

    @PostMapping("/{jobId}")
    public ResponseEntity<?> raiseDispute(@PathVariable("jobId") String jobId,
                                          @RequestBody Map<String, String> body,
                                          @RequestHeader("X-User-Id") String userId) {
        try {
            Dispute dispute = disputeService.raiseDispute(jobId, userId, body.get("reason"));
            return ResponseEntity.ok(dispute);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/evidence")
    public ResponseEntity<?> addEvidence(@PathVariable("id") String disputeId,
                                         @RequestBody Map<String, String> body,
                                         @RequestHeader("X-User-Id") String userId) {
        try {
            DisputeEvidence evidence = disputeService.addEvidence(disputeId, userId, body.get("fileUrl"), body.get("description"));
            return ResponseEntity.ok(evidence);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getDispute(@PathVariable("id") String disputeId) {
        try {
            Dispute dispute = disputeService.getDispute(disputeId);
            List<DisputeEvidence> evidence = disputeService.getEvidenceForDispute(disputeId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("dispute", dispute);
            response.put("evidence", evidence);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<Page<Dispute>> getAllDisputes(@RequestParam(value = "status", required = false) String statusStr,
                                                        @RequestParam(value = "page", defaultValue = "0") int page,
                                                        @RequestParam(value = "size", defaultValue = "10") int size,
                                                        @RequestHeader(value = "X-User-Role", required = false) String role) {
        if (!"ADMIN".equals(role)) {
            return ResponseEntity.status(403).build();
        }

        Dispute.DisputeStatus status = null;
        if (statusStr != null && !statusStr.isEmpty()) {
            try {
                status = Dispute.DisputeStatus.valueOf(statusStr);
            } catch (Exception ignored) {}
        }

        return ResponseEntity.ok(disputeService.getDisputes(status, PageRequest.of(page, size)));
    }

    @PutMapping("/{id}/resolve")
    public ResponseEntity<?> resolveDispute(@PathVariable("id") String disputeId,
                                            @RequestBody Map<String, String> body,
                                            @RequestHeader(value = "X-User-Role", required = false) String role,
                                            @RequestHeader(value = "X-User-Id", required = false) String adminId) {
        if (!"ADMIN".equals(role)) {
            return ResponseEntity.status(403).body("Only admins can resolve disputes.");
        }

        try {
            Dispute.DisputeResolution resolution = Dispute.DisputeResolution.valueOf(body.get("resolution"));
            Dispute dispute = disputeService.resolveDispute(disputeId, resolution, body.get("note"), adminId);
            
            logAudit(adminId != null ? adminId : "SYSTEM", "RESOLVE_DISPUTE_" + resolution, "DISPUTE", disputeId, body.get("note"));
            
            return ResponseEntity.ok(dispute);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
