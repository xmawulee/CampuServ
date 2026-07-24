package com.knust.campusserv.job.controller;

import com.knust.campusserv.job.model.Job;
import com.knust.campusserv.job.repository.JobRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/jobs")
public class JobController {

    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private org.springframework.amqp.rabbit.core.RabbitTemplate rabbitTemplate;

    @Autowired
    private org.springframework.web.client.RestTemplate restTemplate;

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    private static final int COMPLETION_CODE_LENGTH = 6;
    private static final int MAX_CODE_ATTEMPTS = 5;
    private static final int CODE_LOCKOUT_MINUTES = 15;
    private static final int CODE_EXPIRY_MINUTES = 30;

    // ── GET endpoints ──

    @GetMapping("/provider/{providerId}/summary")
    public ResponseEntity<?> getProviderSummary(@PathVariable String providerId) {
        long activeCount = jobRepository.countByProviderIdAndStatus(providerId, "ACTIVE")
                + jobRepository.countByProviderIdAndStatus(providerId, "PROOF_SUBMITTED")
                + jobRepository.countByProviderIdAndStatus(providerId, "AWAITING_CODE")
                + jobRepository.countByProviderIdAndStatus(providerId, "DISPUTED");
        long completedCount = jobRepository.countByProviderIdAndStatus(providerId, "COMPLETED");
        long disputedCount = jobRepository.countByProviderIdAndStatus(providerId, "DISPUTED");
        BigDecimal totalEarnings = jobRepository.sumCompletedEarningsByProviderId(providerId);

        List<String> activeStatuses = Arrays.asList("ACTIVE", "AWAITING_CODE", "PROOF_SUBMITTED", "DISPUTED");
        List<Job> activeJobs = jobRepository.findByProviderIdAndStatusInOrderByUpdatedAtDesc(
                providerId, activeStatuses, PageRequest.of(0, 10)).getContent();
        activeJobs.forEach(this::populateTransientFields);

        List<Job> completedJobs = jobRepository.findByProviderIdAndStatusInOrderByUpdatedAtDesc(
                providerId, Arrays.asList("COMPLETED"), PageRequest.of(0, 10)).getContent();
        completedJobs.forEach(this::populateTransientFields);

        List<Job> disputedJobs = jobRepository.findByProviderIdAndStatusInOrderByUpdatedAtDesc(
                providerId, Arrays.asList("DISPUTED"), PageRequest.of(0, 10)).getContent();
        disputedJobs.forEach(this::populateTransientFields);

        Map<String, Object> activeBucket = new HashMap<>();
        activeBucket.put("count", activeCount);
        activeBucket.put("jobs", activeJobs);

        Map<String, Object> inProgressBucket = new HashMap<>();
        inProgressBucket.put("count", activeCount);
        inProgressBucket.put("jobs", activeJobs);

        Map<String, Object> completedBucket = new HashMap<>();
        completedBucket.put("count", completedCount);
        completedBucket.put("jobs", completedJobs);

        Map<String, Object> disputedBucket = new HashMap<>();
        disputedBucket.put("count", disputedCount);
        disputedBucket.put("jobs", disputedJobs);

        Map<String, Object> summary = new HashMap<>();
        summary.put("active", activeBucket);
        summary.put("inProgress", inProgressBucket);
        summary.put("completed", completedBucket);
        summary.put("disputed", disputedBucket);
        summary.put("totalEarnings", totalEarnings != null ? totalEarnings : BigDecimal.ZERO);

        return ResponseEntity.ok(summary);
    }

    @GetMapping("/provider/{providerId}")
    public ResponseEntity<?> getProviderJobs(
            @PathVariable String providerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Job> jobPage;
        if (status != null && !status.trim().isEmpty()) {
            // Support comma-separated statuses like "COMPLETED,CANCELLED"
            List<String> statuses = Arrays.asList(status.trim().toUpperCase().split(","));
            jobPage = jobRepository.findByProviderIdAndStatusInOrderByUpdatedAtDesc(
                    providerId, statuses, pageable);
        } else {
            jobPage = jobRepository.findByProviderIdOrderByUpdatedAtDesc(providerId, pageable);
        }

        jobPage.getContent().forEach(this::populateTransientFields);

        Map<String, Object> response = new HashMap<>();
        response.put("content", jobPage.getContent());
        response.put("totalElements", jobPage.getTotalElements());
        response.put("totalPages", jobPage.getTotalPages());
        response.put("currentPage", jobPage.getNumber());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{jobId}")
    public ResponseEntity<?> getJobById(
            @PathVariable String jobId,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        Optional<Job> jobOpt = jobRepository.findById(jobId);
        if (jobOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Job not found.");
        }
        Job job = jobOpt.get();
        populateTransientFields(job);
        if (userId != null && !userId.equals(job.getRequesterId())) {
            job.setCompletionCode(null);
        }
        return ResponseEntity.ok(job);
    }

    @GetMapping("/request/{requestId}")
    public ResponseEntity<?> getJobByRequestId(
            @PathVariable String requestId,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        Optional<Job> jobOpt = jobRepository.findByRequestId(requestId);
        if (jobOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("No job found for this request.");
        }
        Job job = jobOpt.get();
        populateTransientFields(job);
        if (userId != null && !userId.equals(job.getRequesterId())) {
            job.setCompletionCode(null);
        }
        return ResponseEntity.ok(job);
    }

    // ── POST /jobs — Create a job (called internally by request-service after offer accepted) ──

    @PostMapping
    public ResponseEntity<?> createJob(@RequestBody Map<String, Object> body) {
        String requestId = (String) body.get("requestId");
        String offerId = (String) body.get("offerId");
        String requesterId = (String) body.get("requesterId");
        String providerId = (String) body.get("providerId");
        String serviceMode = (String) body.getOrDefault("serviceMode", "ON_SITE");
        String requestTitle = (String) body.get("requestTitle");
        String requestDescription = (String) body.get("requestDescription");
        BigDecimal agreedPrice = body.get("agreedPrice") != null ? new BigDecimal(body.get("agreedPrice").toString()) : BigDecimal.ZERO;
        String locationAddress = (String) body.get("locationAddress");
        // Location coordinates — passed by request-service from request_locations table
        Double locationLat = body.get("locationLat") != null ? Double.parseDouble(body.get("locationLat").toString()) : null;
        Double locationLng = body.get("locationLng") != null ? Double.parseDouble(body.get("locationLng").toString()) : null;
        String locationHint = (String) body.get("locationHint");

        if (requestId == null || offerId == null || requesterId == null || providerId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Missing required fields: requestId, offerId, requesterId, providerId.");
        }

        // Prevent duplicate jobs for the same request
        Optional<Job> existing = jobRepository.findByRequestId(requestId);
        if (existing.isPresent()) {
            return ResponseEntity.ok(existing.get()); // Idempotent: return existing job
        }

        Job job = new Job();
        job.setId("job-" + UUID.randomUUID().toString());
        job.setRequestId(requestId);
        job.setOfferId(offerId);
        job.setRequesterId(requesterId);
        job.setProviderId(providerId);
        job.setStatus("ACTIVE");
        job.setServiceMode(serviceMode);
        job.setRequestTitle(requestTitle);
        job.setRequestDescription(requestDescription);
        job.setAgreedPrice(agreedPrice);
        job.setLocationAddress(locationAddress);
        job.setLocationLat(locationLat);
        job.setLocationLng(locationLng);
        job.setLocationHint(locationHint);
        job.setCreatedAt(LocalDateTime.now());
        job.setUpdatedAt(LocalDateTime.now());

        Job saved = jobRepository.save(job);

        // Publish job.created event
        Map<String, Object> event = new HashMap<>();
        event.put("type", "job.created");
        event.put("jobId", saved.getId());
        event.put("requestId", requestId);
        event.put("requesterId", requesterId);
        event.put("providerId", providerId);
        event.put("agreedPrice", agreedPrice);
        try {
            rabbitTemplate.convertAndSend("admin.notifications", "", event);
        } catch (Exception e) {
            System.err.println("Failed to publish job.created event: " + e.getMessage());
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // ── PUT /jobs/{jobId}/start — Provider starts the job ──

    @PutMapping("/{jobId}/start")
    public ResponseEntity<?> startJob(
            @PathVariable String jobId,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {

        Optional<Job> jobOpt = jobRepository.findById(jobId);
        if (jobOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Job not found.");
        }

        Job job = jobOpt.get();
        if (!"ACTIVE".equals(job.getStatus())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Job cannot be started. Current status: " + job.getStatus());
        }

        // Advance status to IN_PROGRESS so the provider's stepper moves forward
        job.setStatus("IN_PROGRESS");
        job.setUpdatedAt(LocalDateTime.now());
        jobRepository.save(job);

        // Publish job.started event
        publishJobEvent("job.started", job);

        return ResponseEntity.ok(job);
    }

    // ── POST /jobs/{jobId}/mark-complete — Provider marks job as complete (generates completion code) ──

    @PostMapping("/{jobId}/mark-complete")
    public ResponseEntity<?> markComplete(
            @PathVariable String jobId,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {

        Optional<Job> jobOpt = jobRepository.findById(jobId);
        if (jobOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Job not found.");
        }

        Job job = jobOpt.get();
        if (!"ACTIVE".equals(job.getStatus()) && !"IN_PROGRESS".equals(job.getStatus())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Job is not active. Current status: " + job.getStatus());
        }

        // Generate 6-digit completion code
        String plainCode = generateCompletionCode();
        String codeHash = hashCode(plainCode);

        job.setStatus("AWAITING_CODE");
        job.setCompletionCodeHash(codeHash);
        job.setCompletionCode(plainCode);
        job.setCompletionCodeExpiresAt(LocalDateTime.now().plusMinutes(CODE_EXPIRY_MINUTES));
        job.setCompletionCodeAttempts(0);
        job.setCompletionCodeLockedUntil(null);
        job.setUpdatedAt(LocalDateTime.now());
        jobRepository.save(job);

        // Publish event with the code for the requester (delivered via STOMP)
        Map<String, Object> event = new HashMap<>();
        event.put("type", "job.awaiting_code");
        event.put("jobId", job.getId());
        event.put("requestId", job.getRequestId());
        event.put("requesterId", job.getRequesterId());
        event.put("providerId", job.getProviderId());
        event.put("status", "AWAITING_CODE");
        event.put("completionCode", plainCode);
        event.put("code", plainCode);
        try {
            rabbitTemplate.convertAndSend("admin.notifications", "", event);
        } catch (Exception e) {
            System.err.println("Failed to publish completion code event: " + e.getMessage());
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("status", "AWAITING_CODE");
        resp.put("message", "Completion code sent to requester.");
        return ResponseEntity.ok(resp);
    }

    // ── POST /jobs/{jobId}/confirm-completion — Requester enters completion code ──

    @PostMapping("/{jobId}/confirm-completion")
    public ResponseEntity<?> confirmCompletion(
            @PathVariable String jobId,
            @RequestBody Map<String, String> body) {

        String code = body.get("code");
        if (code == null || code.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Completion code is required.");
        }

        Optional<Job> jobOpt = jobRepository.findById(jobId);
        if (jobOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Job not found.");
        }

        Job job = jobOpt.get();
        if (!"AWAITING_CODE".equals(job.getStatus())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Job is not awaiting completion code. Current status: " + job.getStatus());
        }

        // Check lockout
        if (job.getCompletionCodeLockedUntil() != null && LocalDateTime.now().isBefore(job.getCompletionCodeLockedUntil())) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body("Too many failed attempts. Try again after " + job.getCompletionCodeLockedUntil());
        }

        // Check expiry
        if (job.getCompletionCodeExpiresAt() != null && LocalDateTime.now().isAfter(job.getCompletionCodeExpiresAt())) {
            return ResponseEntity.status(HttpStatus.GONE).body("Completion code has expired. Ask provider to regenerate.");
        }

        // Verify code
        String codeHash = hashCode(code.trim());
        if (!codeHash.equals(job.getCompletionCodeHash())) {
            int attempts = (job.getCompletionCodeAttempts() != null ? job.getCompletionCodeAttempts() : 0) + 1;
            job.setCompletionCodeAttempts(attempts);
            if (attempts >= MAX_CODE_ATTEMPTS) {
                job.setCompletionCodeLockedUntil(LocalDateTime.now().plusMinutes(CODE_LOCKOUT_MINUTES));
                jobRepository.save(job);
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .body("Too many failed attempts. Locked for " + CODE_LOCKOUT_MINUTES + " minutes.");
            }
            jobRepository.save(job);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Invalid completion code. " + (MAX_CODE_ATTEMPTS - attempts) + " attempts remaining.");
        }

        // Code is valid — complete the job
        job.setStatus("COMPLETED");
        job.setCompletionCodeHash(null);
        job.setCompletionCode(null);
        job.setCompletionCodeExpiresAt(null);
        job.setCompletionCodeAttempts(0);
        job.setCompletionCodeLockedUntil(null);
        job.setUpdatedAt(LocalDateTime.now());
        jobRepository.save(job);

        // Release escrow
        releaseEscrow(job);

        // Update request status to COMPLETED
        try {
            restTemplate.put("http://request-service/requests/" + job.getRequestId() + "/status?status=COMPLETED", null);
        } catch (Exception e) {
            System.err.println("Failed to update request status to COMPLETED: " + e.getMessage());
        }

        // Publish completion event
        publishJobEvent("job.completed", job);

        return ResponseEntity.ok(job);
    }

    // ── PUT /jobs/{jobId}/complete — Direct completion (for remote jobs without code) ──

    @PutMapping("/{jobId}/complete")
    public ResponseEntity<?> completeJobDirect(
            @PathVariable String jobId,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {

        Optional<Job> jobOpt = jobRepository.findById(jobId);
        if (jobOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Job not found.");
        }

        Job job = jobOpt.get();
        if (!"ACTIVE".equals(job.getStatus()) && !"AWAITING_CODE".equals(job.getStatus())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Job cannot be completed. Current status: " + job.getStatus());
        }

        job.setStatus("COMPLETED");
        job.setCompletionCodeHash(null);
        job.setCompletionCode(null);
        job.setCompletionCodeExpiresAt(null);
        job.setCompletionCodeAttempts(0);
        job.setCompletionCodeLockedUntil(null);
        job.setUpdatedAt(LocalDateTime.now());
        jobRepository.save(job);

        // Release escrow
        releaseEscrow(job);

        // Update request status to COMPLETED
        try {
            restTemplate.put("http://request-service/requests/" + job.getRequestId() + "/status?status=COMPLETED", null);
        } catch (Exception e) {
            System.err.println("Failed to update request status to COMPLETED: " + e.getMessage());
        }

        // Publish completion event
        publishJobEvent("job.completed", job);

        return ResponseEntity.ok(job);
    }

    // ── POST /jobs/{jobId}/regenerate-code — Regenerate completion code ──

    @PostMapping("/{jobId}/regenerate-code")
    public ResponseEntity<?> regenerateCode(
            @PathVariable String jobId,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {

        Optional<Job> jobOpt = jobRepository.findById(jobId);
        if (jobOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Job not found.");
        }

        Job job = jobOpt.get();
        if (!"AWAITING_CODE".equals(job.getStatus())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Job is not awaiting completion code.");
        }

        // Generate new code
        String plainCode = generateCompletionCode();
        String codeHash = hashCode(plainCode);

        job.setCompletionCodeHash(codeHash);
        job.setCompletionCode(plainCode);
        job.setCompletionCodeExpiresAt(LocalDateTime.now().plusMinutes(CODE_EXPIRY_MINUTES));
        job.setCompletionCodeAttempts(0);
        job.setCompletionCodeLockedUntil(null);
        job.setUpdatedAt(LocalDateTime.now());
        jobRepository.save(job);

        // Publish event with new code
        Map<String, Object> event = new HashMap<>();
        event.put("type", "job.code_regenerated");
        event.put("jobId", job.getId());
        event.put("requestId", job.getRequestId());
        event.put("requesterId", job.getRequesterId());
        event.put("providerId", job.getProviderId());
        event.put("status", "AWAITING_CODE");
        event.put("completionCode", plainCode);
        event.put("code", plainCode);
        try {
            rabbitTemplate.convertAndSend("admin.notifications", "", event);
        } catch (Exception e) {
            System.err.println("Failed to publish code regeneration event: " + e.getMessage());
        }

        return ResponseEntity.ok(Map.of("status", "AWAITING_CODE", "message", "New completion code sent to requester."));
    }

    // ── PUT /jobs/{jobId}/dispute — Raise a dispute ──

    @PutMapping("/{jobId}/dispute")
    public ResponseEntity<?> disputeJob(
            @PathVariable String jobId,
            @RequestBody(required = false) Map<String, String> body,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {

        Optional<Job> jobOpt = jobRepository.findById(jobId);
        if (jobOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Job not found.");
        }

        Job job = jobOpt.get();
        if ("COMPLETED".equals(job.getStatus()) || "DISPUTED".equals(job.getStatus()) || "CANCELLED".equals(job.getStatus())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Job cannot be disputed. Current status: " + job.getStatus());
        }

        job.setStatus("DISPUTED");
        job.setUpdatedAt(LocalDateTime.now());
        jobRepository.save(job);

        // Publish dispute event
        Map<String, Object> event = new HashMap<>();
        event.put("type", "job.disputed");
        event.put("jobId", job.getId());
        event.put("requestId", job.getRequestId());
        event.put("requesterId", job.getRequesterId());
        event.put("providerId", job.getProviderId());
        event.put("raisedBy", userId != null ? userId : "unknown");
        event.put("description", body != null ? body.getOrDefault("description", "") : "");
        try {
            rabbitTemplate.convertAndSend("admin.notifications", "", event);
        } catch (Exception e) {
            System.err.println("Failed to publish dispute event: " + e.getMessage());
        }

        return ResponseEntity.ok(job);
    }

    // ── Private Helpers ──

    private String generateCompletionCode() {
        SecureRandom random = new SecureRandom();
        StringBuilder code = new StringBuilder();
        for (int i = 0; i < COMPLETION_CODE_LENGTH; i++) {
            code.append(random.nextInt(10));
        }
        return code.toString();
    }

    private String hashCode(String code) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(code.getBytes());
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                String h = Integer.toHexString(0xff & b);
                if (h.length() == 1) hex.append('0');
                hex.append(h);
            }
            return hex.toString();
        } catch (Exception e) {
            throw new RuntimeException("Failed to hash completion code", e);
        }
    }

    private void releaseEscrow(Job job) {
        try {
            restTemplate.put("http://payment-service/payments/release?jobId=" + job.getId(), null);
        } catch (Exception e) {
            System.err.println("Escrow release failed for job " + job.getId() + ": " + e.getMessage());
        }
    }

    private void publishJobEvent(String type, Job job) {
        Map<String, Object> event = new HashMap<>();
        event.put("type", type);
        event.put("jobId", job.getId());
        event.put("requestId", job.getRequestId());
        event.put("requesterId", job.getRequesterId());
        event.put("providerId", job.getProviderId());
        event.put("status", job.getStatus());
        try {
            rabbitTemplate.convertAndSend("admin.notifications", "", event);
        } catch (Exception e) {
            System.err.println("Failed to publish " + type + " event: " + e.getMessage());
        }
    }

    private void populateTransientFields(Job job) {
        if (job == null) return;
        try {
            String name = jdbcTemplate.queryForObject(
                "SELECT full_name FROM users WHERE id = ?", String.class, job.getRequesterId()
            );
            job.setRequesterName(name != null ? name : "Client");
        } catch (Exception e) {
            job.setRequesterName("Client");
        }

        try {
            String cat = jdbcTemplate.queryForObject(
                "SELECT sc.name FROM service_requests sr JOIN service_categories sc ON sr.category_id = sc.id WHERE sr.id = ?",
                String.class, job.getRequestId()
            );
            job.setCategoryName(cat != null ? cat : "Service");
        } catch (Exception e) {
            job.setCategoryName("Service");
        }
    }
}
