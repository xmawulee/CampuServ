package com.knust.campusserv.job.controller;

import com.knust.campusserv.job.model.Job;
import com.knust.campusserv.job.repository.JobRepository;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/jobs")
public class JobAdminController {

    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private RabbitTemplate rabbitTemplate;

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
    public ResponseEntity<Page<Job>> getJobs(@RequestParam(value = "status", required = false) String status,
                                             @RequestParam(value = "page", defaultValue = "0") int page,
                                             @RequestParam(value = "size", defaultValue = "10") int size,
                                             @RequestHeader(value = "X-User-Role", required = false) String role) {
        if (!"ADMIN".equals(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Page<Job> jobs;
        if (status != null && !status.isEmpty()) {
            jobs = jobRepository.findByStatusOrderByCreatedAtDesc(status, PageRequest.of(page, size));
        } else {
            jobs = jobRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size));
        }

        return ResponseEntity.ok(jobs);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Job>> getUserJobs(@PathVariable("userId") String userId,
                                                 @RequestHeader(value = "X-User-Role", required = false) String role) {
        if (!"ADMIN".equals(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(jobRepository.findByUser(userId));
    }

    @PutMapping("/{id}/force-complete")
    @Transactional
    public ResponseEntity<?> forceCompleteJob(@PathVariable("id") String id,
                                              @RequestBody Map<String, String> requestBody,
                                              @RequestHeader(value = "X-User-Id", required = false) String adminId,
                                              @RequestHeader(value = "X-User-Role", required = false) String role) {
        if (!"ADMIN".equals(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        String reason = requestBody.get("reason");

        Job job = jobRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Job not found"));
        job.setStatus("COMPLETED");
        job.setUpdatedAt(LocalDateTime.now());
        jobRepository.save(job);

        logAudit(adminId != null ? adminId : "SYSTEM", "FORCE_COMPLETE", "JOB", id, reason != null ? reason : "Force completed");

        // Notify both parties via the job-status queue so supporting-service creates user-facing notifications
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("jobId", id);
            event.put("status", "FORCE_COMPLETED");
            event.put("requesterId", job.getRequesterId());
            event.put("providerId", job.getProviderId());
            event.put("requestId", job.getRequestId());
            event.put("adminReason", reason != null ? reason : "Force completed by admin");
            rabbitTemplate.convertAndSend("job-status-queue", event);
        } catch (Exception e) {
            System.err.println("Failed to publish force-complete notification event: " + e.getMessage());
        }

        // Force escrow release
        try {
            restTemplate.put("http://payment-service/payments/release?jobId=" + id, null);
            restTemplate.put("http://request-service/requests/" + job.getRequestId() + "/status?status=COMPLETED", null);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to integrate: " + e.getMessage());
        }

        return ResponseEntity.ok(job);
    }

    @PutMapping("/{id}/cancel")
    @Transactional
    public ResponseEntity<?> cancelJob(@PathVariable("id") String id,
                                       @RequestBody Map<String, String> requestBody,
                                       @RequestHeader(value = "X-User-Id", required = false) String adminId,
                                       @RequestHeader(value = "X-User-Role", required = false) String role) {
        if (!"ADMIN".equals(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        String reason = requestBody.get("reason");

        Job job = jobRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Job not found"));
        job.setStatus("CANCELLED");
        job.setUpdatedAt(LocalDateTime.now());
        jobRepository.save(job);

        logAudit(adminId != null ? adminId : "SYSTEM", "FORCE_CANCEL", "JOB", id, reason != null ? reason : "Force cancelled");

        // Notify both parties via the job-status queue so supporting-service creates user-facing notifications
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("jobId", id);
            event.put("status", "FORCE_CANCELLED");
            event.put("requesterId", job.getRequesterId());
            event.put("providerId", job.getProviderId());
            event.put("requestId", job.getRequestId());
            event.put("adminReason", reason != null ? reason : "Force cancelled by admin");
            rabbitTemplate.convertAndSend("job-status-queue", event);
        } catch (Exception e) {
            System.err.println("Failed to publish force-cancel notification event: " + e.getMessage());
        }

        // Refund escrow
        try {
            restTemplate.put("http://payment-service/payments/refund?jobId=" + id, null);
            restTemplate.put("http://request-service/requests/" + job.getRequestId() + "/status?status=CANCELLED", null);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to integrate: " + e.getMessage());
        }

        return ResponseEntity.ok(job);
    }

    /**
     * Resolve a disputed job.
     * Body: { "resolution": "RELEASE_TO_PROVIDER" | "REFUND_TO_REQUESTER", "reason": "..." }
     * - RELEASE_TO_PROVIDER: admin rules in favor of provider — releases escrow, marks job COMPLETED
     * - REFUND_TO_REQUESTER: admin rules in favor of requester — refunds escrow, marks job CANCELLED
     */
    @PutMapping("/{id}/resolve-dispute")
    @Transactional
    public ResponseEntity<?> resolveDispute(@PathVariable("id") String id,
                                            @RequestBody Map<String, String> requestBody,
                                            @RequestHeader(value = "X-User-Id", required = false) String adminId,
                                            @RequestHeader(value = "X-User-Role", required = false) String role) {
        if (!"ADMIN".equals(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        String resolution = requestBody.get("resolution");
        String reason = requestBody.get("reason");

        if (resolution == null || resolution.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("resolution is required: RELEASE_TO_PROVIDER or REFUND_TO_REQUESTER");
        }

        Job job = jobRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Job not found"));

        if (!"DISPUTED".equals(job.getStatus())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Job is not in DISPUTED status. Current: " + job.getStatus());
        }

        String paymentAction;
        String newJobStatus;

        if ("RELEASE_TO_PROVIDER".equalsIgnoreCase(resolution.trim())) {
            paymentAction = "release";
            newJobStatus = "COMPLETED";
        } else if ("REFUND_TO_REQUESTER".equalsIgnoreCase(resolution.trim())) {
            paymentAction = "refund";
            newJobStatus = "CANCELLED";
        } else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Invalid resolution. Must be RELEASE_TO_PROVIDER or REFUND_TO_REQUESTER.");
        }

        job.setStatus(newJobStatus);
        job.setUpdatedAt(LocalDateTime.now());
        jobRepository.save(job);

        logAudit(adminId != null ? adminId : "SYSTEM", "RESOLVE_DISPUTE_" + resolution.trim().toUpperCase(),
                "JOB", id, reason != null ? reason : "Dispute resolved by admin");

        try {
            restTemplate.put("http://payment-service/payments/" + paymentAction + "?jobId=" + id, null);
            String requestStatus = "COMPLETED".equals(newJobStatus) ? "COMPLETED" : "CANCELLED";
            restTemplate.put("http://request-service/requests/" + job.getRequestId() + "/status?status=" + requestStatus, null);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Dispute resolution recorded but downstream integration failed: " + e.getMessage());
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("jobId", id);
        resp.put("status", newJobStatus);
        resp.put("resolution", resolution.trim().toUpperCase());
        return ResponseEntity.ok(resp);
    }
}
