package com.knust.campusserv.auth.controller;

import com.knust.campusserv.auth.dto.AuthResponse;
import com.knust.campusserv.auth.dto.LoginRequest;
import com.knust.campusserv.auth.dto.RefreshTokenRequest;
import com.knust.campusserv.auth.dto.RegisterRequest;
import com.knust.campusserv.auth.model.RefreshToken;
import com.knust.campusserv.auth.model.User;
import com.knust.campusserv.auth.repository.RefreshTokenRepository;
import com.knust.campusserv.auth.repository.UserRepository;
import com.knust.campusserv.auth.service.LoginRateLimiterService;
import org.springframework.web.client.RestTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.knust.campusserv.auth.security.JwtUtil;
import com.knust.campusserv.auth.service.AuthService;
import com.knust.campusserv.auth.service.EventPublisher;
import com.knust.campusserv.auth.service.FileStorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * ARCHITECTURAL SPECIFICATION & DESIGN DECISION:
 * CampusServ does NOT employ email verification tokens or magic links for registration.
 * Proof-of-eligibility is enforced strictly via a server-side KNUST student email domain check
 * (@st.knust.edu.gh / @knust.edu.gh). Valid registrations are auto-verified immediately.
 * This is a deliberate, accepted architectural tradeoff for simplicity and testing.
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);
    private static final Pattern PASSWORD_PATTERN = Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d).{8,}$");

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private AuthService authService;

    @Autowired
    private EventPublisher eventPublisher;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private LoginRateLimiterService rateLimiterService;

    @Value("${ADMIN_SEED_EMAIL:admin@campusserv.com}")
    private String adminSeedEmail;

    private AuthResponse buildAuthResponse(User user, String accessToken, String refreshToken) {
        String prim = user.getPrimaryRole() != null ? user.getPrimaryRole() : (user.getRole() != null ? user.getRole() : "STUDENT");
        String active = user.getActiveRoleView() != null ? user.getActiveRoleView() : prim;
        AuthResponse resp = new AuthResponse(
                accessToken,
                refreshToken,
                user.getId(),
                user.getRole(),
                prim,
                user.getSecondaryRole(),
                user.getSecondaryRoleStatus(),
                active,
                user.getPrimaryRoleVerified() != null ? user.getPrimaryRoleVerified() : true,
                user.getSecondaryRoleRequestedAt(),
                user.getSecondaryRoleAcquiredAt(),
                user.getEmail(),
                user.getFullName(),
                user.getProfilePictureUrl(),
                user.getIsVerified(),
                user.getVerificationStatus(),
                user.getStudentIdPhotoUrl(),
                user.getServiceCategory(),
                user.getAccountStatus(),
                user.getIsProvider(),
                user.getRejectionReason()
        );
        resp.setRejectionCount(user.getRejectionCount() != null ? user.getRejectionCount() : 0);
        return resp;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        String fullName = request.getFullName() != null ? request.getFullName().trim() : "";
        String email = request.getEmail() != null ? request.getEmail().toLowerCase().trim() : "";
        String password = request.getPassword();

        if (fullName.length() < 2 || fullName.length() > 100) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Full name must be between 2 and 100 characters.");
        }

        if (!email.endsWith("@st.knust.edu.gh") && !email.endsWith("@knust.edu.gh") && !email.equals(adminSeedEmail)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Please use your KNUST student email (@st.knust.edu.gh).");
        }

        if (password == null || !PASSWORD_PATTERN.matcher(password).matches()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Password must be at least 8 characters long and contain at least one letter and one number.");
        }

        Optional<User> existingOpt = userRepository.findByEmail(email);
        if (existingOpt.isPresent()) {
            User existingUser = existingOpt.get();
            if ("PROVIDER".equalsIgnoreCase(existingUser.getRole()) && 
                Boolean.FALSE.equals(existingUser.getPrimaryRoleVerified()) && 
                (existingUser.getStudentIdPhotoUrl() == null || existingUser.getStudentIdPhotoUrl().isEmpty())) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body("An account with this email already exists with incomplete provider onboarding. Please sign in to resume your application.");
            }
            return ResponseEntity.status(HttpStatus.CONFLICT).body("An account with this email already exists. Please sign in instead.");
        }

        User user = new User();
        user.setId("usr-" + UUID.randomUUID().toString());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setFullName(fullName);

        String requestedRole = request.getRole() != null ? request.getRole().toUpperCase() : "STUDENT";
        user.setRole(requestedRole);
        user.setPrimaryRole(requestedRole);

        if ("PROVIDER".equalsIgnoreCase(requestedRole)) {
            user.setPrimaryRoleVerified(false);
            user.setAccountStatus("INCOMPLETE");
            user.setIsVerified(false);
        } else {
            user.setPrimaryRoleVerified(true);
            user.setAccountStatus("ACTIVE");
            user.setIsVerified(true);
        }

        userRepository.save(user);

        // Call payment-service to create wallet
        try {
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("userId", user.getId());
            restTemplate.postForEntity("http://payment-service/wallet/create", requestBody, Object.class);
        } catch (Exception e) {
            log.error("Failed to create wallet in payment-service for user: {}", user.getId(), e);
        }

        String accessToken = jwtUtil.generateAccessToken(user.getId(), user.getRole());
        String rawRefreshToken = jwtUtil.generateRefreshToken(user.getId());
        authService.createRefreshToken(user.getId(), rawRefreshToken);

        return ResponseEntity.status(HttpStatus.CREATED).body(buildAuthResponse(user, accessToken, rawRefreshToken));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        String email = request.getEmail() != null ? request.getEmail().toLowerCase().trim() : "";
        
        if (rateLimiterService.isBlocked(email)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body("Too many failed login attempts. Please try again in 15 minutes.");
        }

        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isEmpty() || !passwordEncoder.matches(request.getPassword(), userOpt.get().getPasswordHash())) {
            rateLimiterService.recordFailedAttempt(email);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Incorrect email or password.");
        }

        rateLimiterService.resetAttempts(email);
        User user = userOpt.get();

        if ("DELETED".equalsIgnoreCase(user.getAccountStatus())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Account has been deleted.");
        }
        if ("BANNED".equalsIgnoreCase(user.getAccountStatus())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Account is banned.");
        }
        if ("SUSPENDED".equalsIgnoreCase(user.getAccountStatus())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Account is suspended.");
        }
        // Allow all non-banned/suspended provider accounts to log in.
        // AppNavigator is the single source of truth and will securely route 
        // PENDING_VERIFICATION accounts to the PendingApprovalScreen.

        // Remove user from the API Gateway's token revocation deny-list
        // so they aren't blocked if they are logging back in within 15 mins of a logout.
        authService.unrevokeGatewayToken(user.getId());

        String activeRole = user.getRole();
        String accessToken = jwtUtil.generateAccessToken(user.getId(), activeRole);
        String rawRefreshToken = jwtUtil.generateRefreshToken(user.getId());
        authService.createRefreshToken(user.getId(), rawRefreshToken);

        return ResponseEntity.ok(buildAuthResponse(user, accessToken, rawRefreshToken));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestBody(required = false) Map<String, String> body,
                                    @RequestHeader(value = "X-User-Id", required = false) String userIdHeader) {
        if (body != null && body.containsKey("refreshToken")) {
            String refTokenStr = body.get("refreshToken");
            if (refTokenStr != null && !refTokenStr.trim().isEmpty()) {
                try {
                    String tokenHash = authService.hashToken(refTokenStr.trim());
                    Optional<RefreshToken> rtOpt = refreshTokenRepository.findByTokenHash(tokenHash);
                    if (rtOpt.isPresent()) {
                        RefreshToken rt = rtOpt.get();
                        rt.setRevokedAt(LocalDateTime.now());
                        refreshTokenRepository.save(rt);
                    }
                } catch (Exception e) {
                    log.warn("Failed to revoke refresh token on logout: {}", e.getMessage());
                }
            }
        }
        if (userIdHeader != null && !userIdHeader.trim().isEmpty()) {
            authService.revokeAllUserTokens(userIdHeader.trim());
            authService.revokeGatewayToken(userIdHeader.trim());
        }
        return ResponseEntity.ok("Logged out successfully.");
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody RefreshTokenRequest request) {
        String token = request.getRefreshToken();
        try {
            if (jwtUtil.isTokenExpired(token)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Refresh token expired.");
            }

            String userId = jwtUtil.getUserIdFromToken(token);
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not found.");
            }

            User user = userOpt.get();

            if ("DELETED".equalsIgnoreCase(user.getAccountStatus()) ||
                "BANNED".equalsIgnoreCase(user.getAccountStatus()) ||
                "SUSPENDED".equalsIgnoreCase(user.getAccountStatus())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Account is restricted.");
            }

            String[] tokens = authService.rotateRefreshToken(token, user);

            return ResponseEntity.ok(buildAuthResponse(user, tokens[0], tokens[1]));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid refresh token.");
        }
    }

    @PostMapping("/upload-id")
    public ResponseEntity<?> uploadStudentId(@RequestParam("file") MultipartFile file, 
                                             @RequestHeader("X-User-Id") String userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found.");
        }

        User user = userOpt.get();

        try {
            String fileUrl = fileStorageService.storeFile(file);
            user.setStudentIdPhotoUrl(fileUrl);
            user.setUpdatedAt(LocalDateTime.now());
            userRepository.save(user);

            return ResponseEntity.ok("Student ID uploaded successfully. Please select categories to complete your application.");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to upload ID: " + e.getMessage());
        }
    }

    @PatchMapping("/users/me/active-role-view")
    public ResponseEntity<?> updateActiveRoleView(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestBody Map<String, String> body) {
        if (userIdHeader == null || userIdHeader.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User identity header missing.");
        }
        String targetView = body.get("activeRoleView");
        if (targetView == null || targetView.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("activeRoleView is required.");
        }
        try {
            Optional<User> userOpt = userRepository.findById(userIdHeader.trim());
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User account not found.");
            }
            User user = userOpt.get();

            // Block provider-only accounts from switching to STUDENT
            if ("STUDENT".equalsIgnoreCase(targetView) && 
                "PROVIDER".equalsIgnoreCase(user.getPrimaryRole()) && 
                user.getSecondaryRole() == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("This is a provider-only account. You cannot switch to a student view.");
            }

            user.setActiveRoleView(targetView);
            userRepository.save(user);
            String accessToken = jwtUtil.generateAccessToken(user.getId(), user.getRole());
            return ResponseEntity.ok(buildAuthResponse(user, accessToken, null));
        } catch (IllegalArgumentException e) {
            log.warn("updateActiveRoleView rejected for user {}: {}", userIdHeader, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            log.error("updateActiveRoleView failed unexpectedly for user {}: {}", userIdHeader, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to update active role view. Please try again.");
        }
    }

    @PatchMapping({"/users/me/category", "/users/{userId}/category", "/users/category"})
    public ResponseEntity<?> updateUserCategory(
            @PathVariable(value = "userId", required = false) String userIdParam,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestBody Map<String, Object> body) {
        
        String userId = (userIdParam != null && !userIdParam.trim().isEmpty()) ? userIdParam.trim() : (userIdHeader != null ? userIdHeader.trim() : null);
        if (userId == null || userId.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User identity missing.");
        }

        String category = (String) body.get("serviceCategory");
        if (category == null || category.trim().isEmpty()) {
            category = (String) body.get("category");
        }

        List<String> categoryIds = null;
        if (body.containsKey("categoryIds")) {
            try {
                System.out.println("=> BODY CONTAINS categoryIds: " + body.get("categoryIds"));
                categoryIds = (List<String>) body.get("categoryIds");
                System.out.println("=> PARSED categoryIds: " + categoryIds);
            } catch (Exception e) {
                System.out.println("=> FAILED TO PARSE categoryIds: " + e.getMessage());
                log.warn("Failed to cast categoryIds: {}", e.getMessage());
            }
        } else {
            System.out.println("=> BODY DOES NOT CONTAIN categoryIds. Keys: " + body.keySet());
        }

        if ((categoryIds == null || categoryIds.isEmpty()) && (category == null || category.trim().isEmpty())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("At least one category is required.");
        }

        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found.");
        }

        User user = userOpt.get();

        if (categoryIds != null && !categoryIds.isEmpty()) {
            System.out.println("=> categoryIds is present and not empty, executing JDBC updates");
            try {
                int profilesInserted = jdbcTemplate.update("INSERT INTO provider_profiles (id, approval_status, created_at, updated_at) VALUES (?, 'PENDING_VERIFICATION', NOW(), NOW()) ON CONFLICT DO NOTHING", userId);
                System.out.println("=> Inserted into provider_profiles: " + profilesInserted);
                int deleted = jdbcTemplate.update("DELETE FROM provider_services WHERE provider_id = ?", userId);
                System.out.println("=> Deleted provider_services: " + deleted);
                for (String catId : categoryIds) {
                    int inserted = jdbcTemplate.update(
                        "INSERT INTO provider_services (id, provider_id, category_id, base_price) VALUES (?, ?, ?, 10.0) ON CONFLICT DO NOTHING",
                        "ps-" + UUID.randomUUID().toString(), userId, catId
                    );
                    System.out.println("=> Inserted into provider_services for catId " + catId + ": " + inserted);
                }
            } catch (Exception e) {
                System.out.println("=> JDBC ERROR: " + e.getMessage());
                e.printStackTrace();
                log.error("Failed to insert provider services: {}", e.getMessage(), e);
            }
        } else {
            System.out.println("=> categoryIds is null or empty!");
        }
        if (category != null) {
            user.setServiceCategory(category.trim());
        }
        user.setUpdatedAt(LocalDateTime.now());
        User saved = userRepository.save(user);

        return ResponseEntity.ok(buildAuthResponse(saved, null, null));
    }

    @PostMapping("/submit-provider-application")
    public ResponseEntity<?> submitProviderApplication(@RequestHeader("X-User-Id") String userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found.");
        }
        User user = userOpt.get();

        if (!"PROVIDER".equalsIgnoreCase(user.getPrimaryRole())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Only provider accounts can submit an application.");
        }
        if (!"INCOMPLETE".equalsIgnoreCase(user.getAccountStatus()) && !"PENDING_VERIFICATION".equalsIgnoreCase(user.getAccountStatus())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Application already submitted or processed.");
        }
        if (user.getStudentIdPhotoUrl() == null || user.getStudentIdPhotoUrl().trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Student ID photo is required before submitting.");
        }

        // Validate that user has at least one category in provider_services
        Integer categoryCount = 0;
        try {
            categoryCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM provider_services WHERE provider_id = ?", Integer.class, userId);
        } catch (Exception e) {
            log.error("Failed to check provider categories", e);
        }

        if (categoryCount == null || categoryCount == 0) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("At least one service category is required before submitting.");
        }

        user.setPrimaryRoleVerified(false);
        user.setAccountStatus("PENDING_VERIFICATION");
        user.setUpdatedAt(LocalDateTime.now());
        User saved = userRepository.save(user);

        eventPublisher.publishAdminNotification(
            "provider.verification.submitted",
            saved.getId(),
            "Provider verification submitted by " + saved.getFullName(),
            "INFO"
        );

        return ResponseEntity.ok(buildAuthResponse(saved, null, null));
    }

    @PostMapping("/reset-provider-application")
    public ResponseEntity<?> resetProviderApplication(@RequestHeader("X-User-Id") String userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found.");
        }
        User user = userOpt.get();

        if (!"PROVIDER".equalsIgnoreCase(user.getPrimaryRole())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Only provider accounts can reset their application.");
        }

        // We only allow reset if they are currently REJECTED
        if (!"REJECTED".equalsIgnoreCase(user.getVerificationStatus()) && user.getRejectionReason() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Application can only be reset if it was rejected.");
        }

        // Reset accountStatus to INCOMPLETE so they enter the onboarding wizard
        user.setAccountStatus("INCOMPLETE");
        // We do NOT clear verificationStatus yet, let them keep REJECTED so they know why until they resubmit
        user.setUpdatedAt(LocalDateTime.now());
        User saved = userRepository.save(user);

        return ResponseEntity.ok(buildAuthResponse(saved, null, null));
    }

    @GetMapping("/check-status")
    public ResponseEntity<?> checkStatus(@RequestParam("email") String email) {
        Optional<User> userOpt = userRepository.findByEmail(email.toLowerCase().trim());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found.");
        }
        User user = userOpt.get();

        Map<String, Object> resp = new HashMap<>();
        resp.put("email", user.getEmail());
        resp.put("role", user.getRole());
        resp.put("status", user.getAccountStatus() != null ? user.getAccountStatus() : "ACTIVE");
        resp.put("accountStatus", user.getAccountStatus() != null ? user.getAccountStatus() : "ACTIVE");
        resp.put("verificationStatus", user.getVerificationStatus() != null ? user.getVerificationStatus() : "UNVERIFIED");
        resp.put("isVerified", user.getIsVerified() != null ? user.getIsVerified() : false);
        resp.put("isProvider", user.getIsProvider() != null ? user.getIsProvider() : false);
        resp.put("rejectionReason", user.getRejectionReason() != null ? user.getRejectionReason() : "");
        resp.put("primaryRoleVerified", user.getPrimaryRoleVerified() != null ? user.getPrimaryRoleVerified() : true);
        resp.put("rejectionCount", user.getRejectionCount() != null ? user.getRejectionCount() : 0);

        return ResponseEntity.ok(resp);
    }
}
