package com.knust.campusserv.auth.controller;

import com.knust.campusserv.auth.model.User;
import com.knust.campusserv.auth.repository.UserRepository;
import com.knust.campusserv.auth.service.AuthService;
import com.knust.campusserv.auth.service.EventPublisher;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuthService authService;

    @Autowired
    private EventPublisher eventPublisher;

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

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

    @GetMapping("/counts")
    public ResponseEntity<?> getCounts() {
        Map<String, Integer> counts = new HashMap<>();

        // Pending provider verifications
        long pending = userRepository.findAll().stream()
                .filter(u -> ("PROVIDER".equalsIgnoreCase(u.getSecondaryRole()) && "PENDING_VERIFICATION".equalsIgnoreCase(u.getSecondaryRoleStatus())) ||
                             "PENDING_VERIFICATION".equalsIgnoreCase(u.getVerificationStatus()))
                .count();
        counts.put("pendingProviders", (int) pending);
        counts.put("pendingVerifications", (int) pending);

        // Open disputes — from disputes table
        int openDisputes = 0;
        try {
            Integer d = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM disputes WHERE status NOT IN ('RESOLVED')", Integer.class);
            openDisputes = d != null ? d : 0;
        } catch (Exception e) {
            System.err.println("getCounts: disputes query failed: " + e.getMessage());
        }
        counts.put("openDisputes", openDisputes);

        // Unresolved reports — same as open disputes (no separate reports table yet)
        counts.put("unresolvedReports", openDisputes);

        // Active jobs — jobs in non-terminal statuses
        int activeJobs = 0;
        try {
            Integer j = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM jobs WHERE status IN ('ACTIVE', 'AWAITING_CODE', 'PROOF_SUBMITTED', 'DISPUTED')",
                Integer.class);
            activeJobs = j != null ? j : 0;
        } catch (Exception e) {
            System.err.println("getCounts: jobs query failed: " + e.getMessage());
        }
        counts.put("activeJobs", activeJobs);

        // Total users registered today
        int totalUsersToday = 0;
        try {
            Integer u = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE", Integer.class);
            totalUsersToday = u != null ? u : 0;
        } catch (Exception e) {
            System.err.println("getCounts: users-today query failed: " + e.getMessage());
        }
        counts.put("totalUsersToday", totalUsersToday);

        return ResponseEntity.ok(counts);
    }

    private String resolveUserServiceCategory(User u) {
        if (u.getServiceCategory() != null && !u.getServiceCategory().trim().isEmpty()) {
            return u.getServiceCategory().trim();
        }
        try {
            List<String> categories = jdbcTemplate.queryForList(
                "SELECT sc.name FROM provider_services ps JOIN service_categories sc ON ps.category_id = sc.id WHERE ps.provider_id = ?",
                String.class, u.getId()
            );
            if (!categories.isEmpty()) {
                return String.join(", ", categories);
            }
            List<String> catIds = jdbcTemplate.queryForList(
                "SELECT category_id FROM provider_services WHERE provider_id = ?",
                String.class, u.getId()
            );
            if (!catIds.isEmpty()) {
                return String.join(", ", catIds);
            }
        } catch (Exception e) {
            System.err.println("Failed to resolve provider services for user " + u.getId() + ": " + e.getMessage());
        }
        return null;
    }

    @GetMapping({"/verification/queue", "/providers/pending"})
    public ResponseEntity<?> getVerificationQueue() {
        List<com.knust.campusserv.auth.dto.PendingProviderResponse> pendingUsers = userRepository.findAll().stream()
                .filter(u -> ("PROVIDER".equalsIgnoreCase(u.getSecondaryRole()) && "PENDING_VERIFICATION".equalsIgnoreCase(u.getSecondaryRoleStatus())) || 
                             "PENDING_VERIFICATION".equalsIgnoreCase(u.getVerificationStatus()))
                .map(u -> {
                    u.setServiceCategory(resolveUserServiceCategory(u));
                    List<String> duplicates = userRepository.findAll().stream()
                        .filter(other -> !other.getId().equals(u.getId()) && 
                                         u.getStudentIdPhotoUrl() != null && 
                                         u.getStudentIdPhotoUrl().equals(other.getStudentIdPhotoUrl()))
                        .map(User::getEmail)
                        .toList();
                    return new com.knust.campusserv.auth.dto.PendingProviderResponse(u, duplicates);
                })
                .toList();
        return ResponseEntity.ok(pendingUsers);
    }

    @PostMapping({"/verification/{userId}/approve", "/providers/{userId}/approve"})
    public ResponseEntity<?> approveVerification(@PathVariable("userId") String userId, @RequestHeader(value = "X-User-Id", required = false) String adminId) {
        try {
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found.");
            }
            User user = userOpt.get();

            user.setPrimaryRoleVerified(true);
            user.setIsVerified(true);
            user.setVerificationStatus("APPROVED");
            user.setAccountStatus("ACTIVE");
            user.setRejectionReason(null);
            userRepository.save(user);

            logAudit(adminId != null ? adminId : "SYSTEM", "APPROVE", "USER", userId, "Provider verification approved");

            // Eagerly provision the provider wallet so it exists before any payout can occur.
            try {
                Map<String, Object> walletPayload = new HashMap<>();
                walletPayload.put("userId", userId);
                restTemplate.postForEntity("http://payment-service/wallet/create", walletPayload, Object.class);
            } catch (Exception we) {
                System.err.println("Warning: provider wallet provisioning call failed for " + userId + ": " + we.getMessage());
            }

            eventPublisher.publishAdminNotification(
                "provider.verification.resolved",
                user.getId(),
                "Provider approved: " + user.getFullName(),
                "INFO"
            );

            eventPublisher.publishProviderVerificationEvent(user.getId(), "VERIFIED", null);

            return ResponseEntity.ok("Provider role verified successfully.");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage() + " | " + e.getClass().getName());
        }
    }

    @PostMapping({"/verification/{userId}/reject", "/providers/{userId}/reject"})
    public ResponseEntity<?> rejectVerification(@PathVariable("userId") String userId, @RequestBody Map<String, String> request, @RequestHeader(value = "X-User-Id", required = false) String adminId) {
        try {
            String reason = request.get("reason");
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found.");
            }
            User user = userOpt.get();

            logAudit(adminId != null ? adminId : "SYSTEM", "REJECT", "USER", userId, reason);

            eventPublisher.publishAdminNotification(
                "provider.verification.resolved",
                user.getId(),
                "Provider rejected: " + user.getFullName() + ". Reason: " + reason,
                "INFO"
            );

            eventPublisher.publishProviderVerificationEvent(user.getId(), "REJECTED", reason);

            user.setPrimaryRoleVerified(false);
            user.setIsVerified(false);
            user.setVerificationStatus("REJECTED");
            user.setRejectionReason(reason);
            user.setRejectionCount(user.getRejectionCount() == null ? 1 : user.getRejectionCount() + 1);
            userRepository.save(user);

            return ResponseEntity.ok("Provider role rejected.");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage() + " | " + e.getClass().getName());
        }
    }

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers(@RequestParam(value = "roleComposition", required = false) String roleComposition) {
        List<User> users = userRepository.findAll();
        if (roleComposition == null || roleComposition.trim().isEmpty()) {
            return ResponseEntity.ok(users);
        }

        String comp = roleComposition.trim().toUpperCase();
        List<User> filtered = users.stream().filter(u -> {
            String sec = u.getSecondaryRole();
            String status = u.getSecondaryRoleStatus();
            switch (comp) {
                case "PRIMARY_ONLY":
                    return sec == null || sec.trim().isEmpty();
                case "SECONDARY_PENDING":
                    return sec != null && "PENDING_VERIFICATION".equalsIgnoreCase(status);
                case "SECONDARY_APPROVED":
                    return sec != null && "APPROVED".equalsIgnoreCase(status);
                case "SECONDARY_REJECTED":
                    return sec != null && "REJECTED".equalsIgnoreCase(status);
                default:
                    return true;
            }
        }).toList();

        return ResponseEntity.ok(filtered);
    }

    @GetMapping("/users/{userId}")
    public ResponseEntity<?> getUserById(@PathVariable("userId") String userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found.");
        }
        return ResponseEntity.ok(userOpt.get());
    }

    @GetMapping("/providers")
    public ResponseEntity<?> getApprovedProvidersRoster(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "accountStatus", required = false) String accountStatus,
            @RequestParam(value = "providerRoleType", required = false, defaultValue = "ALL") String providerRoleType) {

        List<User> allUsers = userRepository.findAll();

        List<Map<String, Object>> roster = allUsers.stream().filter(u -> {
            boolean isPrimaryApproved = "PROVIDER".equalsIgnoreCase(u.getPrimaryRole()) && Boolean.TRUE.equals(u.getPrimaryRoleVerified());
            boolean isSecondaryApproved = "PROVIDER".equalsIgnoreCase(u.getSecondaryRole()) && "APPROVED".equalsIgnoreCase(u.getSecondaryRoleStatus());

            // Legacy fallback if primary_role is not yet populated
            if (!isPrimaryApproved && !isSecondaryApproved && u.getPrimaryRole() == null) {
                isPrimaryApproved = "PROVIDER".equalsIgnoreCase(u.getRole()) && ("VERIFIED".equalsIgnoreCase(u.getVerificationStatus()) || "APPROVED".equalsIgnoreCase(u.getVerificationStatus()));
            }

            return isPrimaryApproved || isSecondaryApproved;
        }).map(u -> {
            boolean isPrimaryApproved = "PROVIDER".equalsIgnoreCase(u.getPrimaryRole()) && Boolean.TRUE.equals(u.getPrimaryRoleVerified());
            String roleType = isPrimaryApproved ? "PRIMARY" : "SECONDARY";

            Map<String, Object> item = new HashMap<>();
            item.put("id", u.getId());
            item.put("email", u.getEmail());
            item.put("fullName", u.getFullName());
            item.put("role", u.getRole());
            item.put("primaryRole", u.getPrimaryRole() != null ? u.getPrimaryRole() : u.getRole());
            item.put("secondaryRole", u.getSecondaryRole());
            item.put("secondaryRoleStatus", u.getSecondaryRoleStatus());
            item.put("providerRoleType", roleType);
            item.put("isVerified", u.getIsVerified());
            item.put("verificationStatus", u.getVerificationStatus());
            item.put("accountStatus", u.getAccountStatus() != null ? u.getAccountStatus() : "ACTIVE");
            item.put("studentIdPhotoUrl", u.getStudentIdPhotoUrl());
            item.put("profilePictureUrl", u.getProfilePictureUrl());
            item.put("serviceCategory", resolveUserServiceCategory(u));
            item.put("rejectionReason", u.getRejectionReason());
            item.put("createdAt", u.getCreatedAt());
            item.put("secondaryRoleRequestedAt", u.getSecondaryRoleRequestedAt());
            item.put("secondaryRoleAcquiredAt", u.getSecondaryRoleAcquiredAt());
            return item;
        }).filter(item -> {
            if (search != null && !search.trim().isEmpty()) {
                String q = search.trim().toLowerCase();
                String name = (String) item.get("fullName");
                String email = (String) item.get("email");
                boolean matchName = name != null && name.toLowerCase().contains(q);
                boolean matchEmail = email != null && email.toLowerCase().contains(q);
                if (!matchName && !matchEmail) return false;
            }
            if (accountStatus != null && !accountStatus.trim().isEmpty() && !"ALL".equalsIgnoreCase(accountStatus)) {
                String status = (String) item.get("accountStatus");
                if (!accountStatus.equalsIgnoreCase(status)) return false;
            }
            if (providerRoleType != null && !providerRoleType.trim().isEmpty() && !"ALL".equalsIgnoreCase(providerRoleType)) {
                String roleType = (String) item.get("providerRoleType");
                if (!providerRoleType.equalsIgnoreCase(roleType)) return false;
            }
            return true;
        }).toList();

        return ResponseEntity.ok(roster);
    }

    @RequestMapping(value = "/users/{userId}/status", method = {RequestMethod.PATCH, RequestMethod.PUT})
    public ResponseEntity<?> updateUserAccountStatus(
            @PathVariable("userId") String userId,
            @RequestBody Map<String, String> body,
            @RequestHeader(value = "X-User-Id", required = false) String adminId) {
        
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User account not found.");
        }

        User user = userOpt.get();

        String rawStatus = body.get("accountStatus");
        if (rawStatus == null || rawStatus.trim().isEmpty()) {
            rawStatus = body.get("status");
        }
        if (rawStatus == null || rawStatus.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("accountStatus or status field is required.");
        }

        String newStatus = rawStatus.trim().toUpperCase();
        if (!List.of("ACTIVE", "SUSPENDED", "BANNED").contains(newStatus)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid account status: " + newStatus);
        }

        if ("DELETED".equalsIgnoreCase(user.getAccountStatus())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Cannot modify status of a deleted account. Use the restore action to reactivate.");
        }

        String reason = body.get("reason");
        user.setAccountStatus(newStatus);
        user.setUpdatedAt(java.time.LocalDateTime.now());
        User saved = userRepository.save(user);
        try {
            eventPublisher.publishUserStatusChanged(userId, newStatus);
        } catch (Exception e) {
            System.err.println("Failed to publish user status update: " + e.getMessage());
        }

        if ("SUSPENDED".equals(newStatus) || "BANNED".equals(newStatus)) {
            try {
                authService.revokeAllUserTokens(userId);
                authService.revokeGatewayToken(userId);
            } catch (Exception ignored) {}
        } else if ("ACTIVE".equals(newStatus)) {
            try {
                authService.unrevokeGatewayToken(userId);
            } catch (Exception ignored) {}
        }

        if ("BANNED".equals(newStatus)) {
            try {
                // Find all active/in-progress jobs where this user is client or provider
                List<Map<String, Object>> activeJobs = jdbcTemplate.queryForList(
                    "SELECT id, request_id, requester_id, provider_id FROM jobs WHERE (requester_id = ? OR provider_id = ?) AND status IN ('ACTIVE', 'PROOF_SUBMITTED', 'DISPUTED', 'AWAITING_CODE')",
                    userId, userId
                );
                for (Map<String, Object> job : activeJobs) {
                    String jobId = (String) job.get("id");       // The job's OWN id — required by payment-service
                    String reqId = (String) job.get("request_id");

                    // Update job status to CANCELLED
                    jdbcTemplate.update("UPDATE jobs SET status = 'CANCELLED', updated_at = NOW() WHERE id = ?", jobId);
                    // Update request status to CANCELLED
                    jdbcTemplate.update("UPDATE service_requests SET status = 'CANCELLED', updated_at = NOW() WHERE id = ?", reqId);

                    // Call payment-service to refund escrow to the requester.
                    // IMPORTANT: payment-service /payments/refund looks up by JOB id, not request id.
                    try {
                        restTemplate.put("http://payment-service/payments/refund?jobId=" + jobId, null);
                    } catch (Exception re) {
                        System.err.println("Escrow refund failed for job " + jobId + " during ban of user " + userId + ": " + re.getMessage());
                    }
                }
            } catch (Exception e) {
                System.err.println("Failed to cancel jobs for banned user: " + e.getMessage());
            }
        }

        logAudit(adminId != null ? adminId : "SYSTEM", newStatus, "USER", userId, reason != null ? reason : "Admin status update to " + newStatus);

        Map<String, Object> resp = new HashMap<>();
        resp.put("message", "User account status updated successfully.");
        resp.put("userId", saved.getId());
        resp.put("accountStatus", saved.getAccountStatus());
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/users/{userId}/restore")
    public ResponseEntity<?> restoreDeletedAccount(
            @PathVariable("userId") String userId,
            @RequestHeader(value = "X-User-Id", required = false) String adminId) {
        
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User account not found.");
        }

        User user = userOpt.get();
        if (!"DELETED".equalsIgnoreCase(user.getAccountStatus())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Account is not in DELETED state.");
        }

        user.setAccountStatus("ACTIVE");
        user.setIsVerified(true);
        user.setUpdatedAt(java.time.LocalDateTime.now());
        User saved = userRepository.save(user);
        try {
            eventPublisher.publishUserStatusChanged(userId, "ACTIVE");
        } catch (Exception e) {
            System.err.println("Failed to publish user status update: " + e.getMessage());
        }

        logAudit(adminId != null ? adminId : "SYSTEM", "RESTORE", "USER", userId, "Admin restored deleted account");

        Map<String, Object> resp = new HashMap<>();
        resp.put("message", "Deleted account restored successfully.");
        resp.put("userId", saved.getId());
        resp.put("accountStatus", saved.getAccountStatus());
        return ResponseEntity.ok(resp);
    }


}
