package com.knust.campusserv.request.controller;

import com.knust.campusserv.request.model.ServiceRequest;
import com.knust.campusserv.request.repository.ServiceRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/admin/requests")
public class AdminRequestController {

    @Autowired
    private ServiceRequestRepository requestRepository;

    @Autowired
    private RabbitTemplate rabbitTemplate;

    @Autowired
    private RestTemplate restTemplate;

    private void logAudit(String adminId, String actionType, String targetEntity, String targetId, String reason) {
        try {
            Map<String, String> payload = new HashMap<>();
            payload.put("adminId", adminId);
            payload.put("actionType", actionType);
            payload.put("targetEntity", targetEntity);
            payload.put("targetId", targetId);
            payload.put("reason", reason);
            restTemplate.postForEntity("http://supporting-service/admin/audit", payload, Void.class);
        } catch (Exception e) {
            System.err.println("Failed to log audit event: " + e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<List<ServiceRequest>> getAllRequests() {
        return ResponseEntity.ok(requestRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getRequestById(@PathVariable String id) {
        Optional<ServiceRequest> reqOpt = requestRepository.findById(id);
        if (reqOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Request not found");
        }
        return ResponseEntity.ok(reqOpt.get());
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<?> forceCancelRequest(@PathVariable String id, @RequestBody Map<String, String> requestBody, @RequestHeader(value = "X-User-Id", required = false) String adminId) {
        String reason = requestBody.get("reason");
        Optional<ServiceRequest> reqOpt = requestRepository.findById(id);
        if (reqOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Request not found");
        }
        
        ServiceRequest request = reqOpt.get();
        request.setStatus("CANCELLED");
        request.setUpdatedAt(LocalDateTime.now());
        requestRepository.save(request);

        logAudit(adminId != null ? adminId : "SYSTEM", "FORCE_CANCEL", "REQUEST", id, reason != null ? reason : "Force cancelled");

        Map<String, String> adminNotification = new HashMap<>();
        adminNotification.put("type", "request.status.forced");
        adminNotification.put("entityId", id);
        adminNotification.put("summary", "Request " + id + " force-cancelled by admin");
        adminNotification.put("severity", "WARN");
        rabbitTemplate.convertAndSend("admin.notifications", "", adminNotification);

        return ResponseEntity.ok(request);
    }
}
