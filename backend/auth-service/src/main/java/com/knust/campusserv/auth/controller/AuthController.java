package com.knust.campusserv.auth.controller;

import com.knust.campusserv.auth.dto.AuthResponse;
import com.knust.campusserv.auth.dto.LoginRequest;
import com.knust.campusserv.auth.dto.RefreshTokenRequest;
import com.knust.campusserv.auth.dto.RegisterRequest;
import com.knust.campusserv.auth.dto.VerifyResetCodeRequest;
import com.knust.campusserv.auth.model.RefreshToken;
import com.knust.campusserv.auth.model.User;
import com.knust.campusserv.auth.model.EmailVerificationCode;
import com.knust.campusserv.auth.model.ProviderTermsAcceptance;
import com.knust.campusserv.auth.repository.RefreshTokenRepository;
import com.knust.campusserv.auth.repository.UserRepository;
import com.knust.campusserv.auth.repository.ProviderTermsAcceptanceRepository;
import java.util.HexFormat;
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
import org.springframework.http.MediaType;
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

    @Autowired
    private com.knust.campusserv.auth.service.PasswordResetService passwordResetService;

    @Autowired
    private com.knust.campusserv.auth.service.BrevoEmailService brevoEmailService;

    @Autowired
    private com.knust.campusserv.auth.repository.EmailVerificationCodeRepository emailVerificationCodeRepository;

    @Autowired
    private ProviderTermsAcceptanceRepository providerTermsAcceptanceRepository;

    @Autowired(required = false)
    private org.springframework.data.redis.core.StringRedisTemplate redisTemplate;

    private final java.security.SecureRandom secureRandom = new java.security.SecureRandom();

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
        resp.setEmailVerified(user.getEmailVerified());
        resp.setTermsAcceptedVersion(user.getTermsAcceptedVersion());
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
            if (Boolean.TRUE.equals(existingUser.getEmailVerified())) {
                if ("PROVIDER".equalsIgnoreCase(existingUser.getRole()) && 
                    Boolean.FALSE.equals(existingUser.getPrimaryRoleVerified()) && 
                    (existingUser.getStudentIdPhotoUrl() == null || existingUser.getStudentIdPhotoUrl().isEmpty())) {
                    return ResponseEntity.status(HttpStatus.CONFLICT)
                            .body("An account with this email already exists with incomplete provider onboarding. Please sign in to resume your application.");
                }
                return ResponseEntity.status(HttpStatus.CONFLICT).body("An account with this email already exists — try signing in instead");
            } else {
                // Purge unverified, abandoned user record and its associated verification codes
                emailVerificationCodeRepository.deleteByUserId(existingUser.getId());
                userRepository.delete(existingUser);
                userRepository.flush();
            }
        }

        User user = new User();
        user.setId("usr-" + UUID.randomUUID().toString());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setFullName(fullName);

        String requestedRole = request.getRole() != null ? request.getRole().toUpperCase() : "STUDENT";
        user.setRole(requestedRole);
        user.setPrimaryRole(requestedRole);
        user.setEmailVerified(false); // ALWAYS false at signup!

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

        // Code Generation and Saving
        String rawCode = generateNumericCode();
        EmailVerificationCode codeEntity = new EmailVerificationCode();
        codeEntity.setId("evc-" + UUID.randomUUID().toString());
        codeEntity.setUserId(user.getId());
        codeEntity.setCodeHash(hashCode(rawCode));
        codeEntity.setExpiresAt(LocalDateTime.now().plusMinutes(15));
        codeEntity.setAttempts(0);
        codeEntity.setLastSentAt(LocalDateTime.now());
        emailVerificationCodeRepository.save(codeEntity);

        // Async Email send
        try {
            brevoEmailService.sendVerificationCodeEmail(user.getEmail(), user.getFullName(), rawCode, 15);
        } catch (Exception e) {
            log.error("Failed to send verification code email for {}", user.getEmail(), e);
        }

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

    private String hashCode(String rawCode) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawCode.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new RuntimeException("Error hashing verification code", e);
        }
    }

    private String generateNumericCode() {
        int code = 100000 + secureRandom.nextInt(900000);
        return String.valueOf(code);
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

        if ("DELETED".equalsIgnoreCase(user.getAccountStatus()) ||
                "DELETING".equalsIgnoreCase(user.getAccountStatus())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("This account has been deleted.");
        }
        if ("BANNED".equalsIgnoreCase(user.getAccountStatus())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Account is banned.");
        }
        if ("SUSPENDED".equalsIgnoreCase(user.getAccountStatus())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Account is suspended.");
        }

        // Check if unverified, trigger fresh verification code
        if (Boolean.FALSE.equals(user.getEmailVerified())) {
            emailVerificationCodeRepository.deleteByUserId(user.getId());
            String rawCode = generateNumericCode();
            EmailVerificationCode codeEntity = new EmailVerificationCode();
            codeEntity.setId("evc-" + UUID.randomUUID().toString());
            codeEntity.setUserId(user.getId());
            codeEntity.setCodeHash(hashCode(rawCode));
            codeEntity.setExpiresAt(LocalDateTime.now().plusMinutes(15));
            codeEntity.setAttempts(0);
            codeEntity.setLastSentAt(LocalDateTime.now());
            emailVerificationCodeRepository.save(codeEntity);

            try {
                brevoEmailService.sendVerificationCodeEmail(user.getEmail(), user.getFullName(), rawCode, 15);
            } catch (Exception e) {
                log.error("Failed to send verification code email for {}", user.getEmail(), e);
            }
        }

        // Remove user from the API Gateway's token revocation deny-list
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
                "DELETING".equalsIgnoreCase(user.getAccountStatus()) ||
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
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
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

        if (Boolean.TRUE.equals(user.getIsVerified()) && "APPROVED".equalsIgnoreCase(user.getVerificationStatus())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Verified providers cannot alter their approved service category.");
        }

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

    @GetMapping("/terms")
    public ResponseEntity<?> getTerms() {
        Map<String, String> response = new HashMap<>();
        response.put("version", "v1");
        response.put("terms", "1. Eligibility: You must be a currently enrolled student at KNUST.\n" +
                "2. Verification: You agree to provide a valid KNUST student ID photo. Providing fraudulent details will result in permanent suspension.\n" +
                "3. Conduct: You agree to perform tasks professionally, maintain honest communication, and comply with all CampusServ guidelines.\n" +
                "4. Payments: Payments are processed via CampusServ escrow. You must not accept or request direct offline payments.\n" +
                "5. Commission: CampusServ reserves the right to charge service fees/commission on completed jobs as specified in the pricing details.");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/submit-provider-application")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> submitProviderApplication(
            @RequestHeader("X-User-Id") String userId,
            @RequestBody(required = false) Map<String, String> body,
            jakarta.servlet.http.HttpServletRequest request) {
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

        String termsVersion = body != null ? body.get("termsVersion") : null;
        if (termsVersion == null || termsVersion.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Terms & Conditions version must be accepted and specified.");
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

        // Record terms acceptance
        Optional<ProviderTermsAcceptance> existingAcceptance = providerTermsAcceptanceRepository.findByUserIdAndTermsVersion(userId, termsVersion);
        if (existingAcceptance.isEmpty()) {
            ProviderTermsAcceptance acceptance = new ProviderTermsAcceptance();
            acceptance.setId("pta-" + UUID.randomUUID().toString());
            acceptance.setUserId(userId);
            acceptance.setTermsVersion(termsVersion);
            acceptance.setTermsAcceptedAt(LocalDateTime.now());
            
            // Resolve IP address
            String ipAddress = request.getHeader("X-Forwarded-For");
            if (ipAddress == null || ipAddress.isEmpty()) {
                ipAddress = request.getRemoteAddr();
            }
            acceptance.setIpAddress(ipAddress);
            
            providerTermsAcceptanceRepository.save(acceptance);
        }

        user.setTermsAcceptedVersion(termsVersion);
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
        user.setTermsAcceptedVersion(null);
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

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @RequestBody com.knust.campusserv.auth.dto.ForgotPasswordRequest request,
            jakarta.servlet.http.HttpServletRequest servletRequest) {
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));
        }
        
        String clientIp = servletRequest.getHeader("X-Forwarded-For");
        if (clientIp == null || clientIp.isEmpty()) {
            clientIp = servletRequest.getRemoteAddr();
        }

        try {
            passwordResetService.processForgotPassword(request.getEmail(), clientIp);
            return ResponseEntity.ok(Map.of("message", "If that email exists, a verification code has been sent."));
        } catch (IllegalStateException ise) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", ise.getMessage()));
        } catch (Exception e) {
            log.error("Error processing forgot password request for {}: {}", request.getEmail(), e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "An error occurred while processing your request. Please try again later."));
        }
    }

    @PostMapping("/verify-reset-code")
    public ResponseEntity<Map<String, String>> verifyResetCode(
            @RequestBody VerifyResetCodeRequest request) {
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));
        }
        if (request.getCode() == null || request.getCode().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Code is required"));
        }

        try {
            String resetSessionToken = passwordResetService.verifyResetCode(request.getEmail(), request.getCode());
            return ResponseEntity.ok(Map.of(
                "message", "Verification successful",
                "resetSessionToken", resetSessionToken
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Unexpected error during reset code verification: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "An error occurred. Please try again later."));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@RequestBody com.knust.campusserv.auth.dto.ResetPasswordRequest request) {
        if (request.getToken() == null || request.getToken().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Reset session token is required"));
        }
        if (request.getNewPassword() == null || request.getNewPassword().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "New password is required"));
        }

        try {
            passwordResetService.resetPassword(request.getToken(), request.getNewPassword());
            return ResponseEntity.ok(Map.of("message", "Your password has been successfully reset. Please sign in with your new password."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Unexpected error during password reset: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "An error occurred while resetting your password. Please try again later."));
        }
    }

    @GetMapping(value = "/reset-password-web", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> resetPasswordWebPage(@RequestParam(name = "token", required = false) String token) {
        String safeToken = token != null ? token.trim() : "";
        String appDeepLink = "campusserv://reset-password?token=" + safeToken;

        String html = "<!DOCTYPE html>\n" +
                "<html lang=\"en\">\n" +
                "<head>\n" +
                "    <meta charset=\"UTF-8\">\n" +
                "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" +
                "    <title>CampusServ - Reset Password</title>\n" +
                "    <style>\n" +
                "        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }\n" +
                "        body { background: #f4f7f6; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }\n" +
                "        .card { background: #ffffff; width: 100%; max-width: 440px; padding: 32px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); text-align: center; }\n" +
                "        .logo { width: 64px; height: 64px; background: #008080; color: white; border-radius: 32px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 28px; font-weight: bold; }\n" +
                "        h2 { font-size: 22px; color: #111827; margin-bottom: 8px; }\n" +
                "        p { font-size: 14px; color: #4b5563; line-height: 1.5; margin-bottom: 24px; }\n" +
                "        .btn-app { display: block; width: 100%; background: #008080; color: #ffffff; padding: 14px; border-radius: 10px; font-weight: 700; text-decoration: none; font-size: 15px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,128,128,0.25); transition: background 0.2s; }\n" +
                "        .btn-app:hover { background: #006666; }\n" +
                "        .divider { display: flex; align-items: center; text-align: center; color: #9ca3af; font-size: 12px; margin: 20px 0; }\n" +
                "        .divider::before, .divider::after { content: ''; flex: 1; border-bottom: 1px solid #e5e7eb; }\n" +
                "        .divider span { padding: 0 10px; text-transform: uppercase; font-weight: 600; }\n" +
                "        .input-group { text-align: left; margin-bottom: 16px; }\n" +
                "        label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; }\n" +
                "        input { width: 100%; padding: 12px; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none; transition: border-color 0.2s; }\n" +
                "        input:focus { border-color: #008080; }\n" +
                "        .btn-submit { width: 100%; background: #111827; color: white; border: none; padding: 13px; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; margin-top: 8px; }\n" +
                "        .alert { padding: 12px; border-radius: 8px; font-size: 13px; font-weight: 500; margin-bottom: 16px; display: none; text-align: left; }\n" +
                "        .alert-error { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }\n" +
                "        .alert-success { background: #ecfdf5; color: #059669; border: 1px solid #6ee7b7; }\n" +
                "    </style>\n" +
                "</head>\n" +
                "<body>\n" +
                "    <div class=\"card\">\n" +
                "        <div class=\"logo\">C</div>\n" +
                "        <h2>Reset Password</h2>\n" +
                "        <p>Open in the CampusServ mobile app or set your new password below.</p>\n" +
                "        <a href=\"" + appDeepLink + "\" class=\"btn-app\">Open CampusServ App</a>\n" +
                "        <div class=\"divider\"><span>or reset in browser</span></div>\n" +
                "        <div id=\"alert\" class=\"alert\"></div>\n" +
                "        <form id=\"resetForm\">\n" +
                "            <div class=\"input-group\">\n" +
                "                <label for=\"newPassword\">New Password</label>\n" +
                "                <input type=\"password\" id=\"newPassword\" placeholder=\"Min 8 characters (letters & numbers)\" required>\n" +
                "            </div>\n" +
                "            <div class=\"input-group\">\n" +
                "                <label for=\"confirmPassword\">Confirm New Password</label>\n" +
                "                <input type=\"password\" id=\"confirmPassword\" placeholder=\"Re-enter password\" required>\n" +
                "            </div>\n" +
                "            <button type=\"submit\" class=\"btn-submit\">Save New Password</button>\n" +
                "        </form>\n" +
                "    </div>\n" +
                "    <script>\n" +
                "        if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {\n" +
                "            setTimeout(() => { window.location.href = '" + appDeepLink + "'; }, 500);\n" +
                "        }\n" +
                "        document.getElementById('resetForm').addEventListener('submit', async function(e) {\n" +
                "            e.preventDefault();\n" +
                "            const alert = document.getElementById('alert');\n" +
                "            alert.style.display = 'none';\n" +
                "            const pass = document.getElementById('newPassword').value;\n" +
                "            const confirm = document.getElementById('confirmPassword').value;\n" +
                "            if (pass !== confirm) {\n" +
                "                alert.className = 'alert alert-error'; alert.innerText = 'Passwords do not match.'; alert.style.display = 'block'; return;\n" +
                "            }\n" +
                "            try {\n" +
                "                const res = await fetch('/auth/reset-password', {\n" +
                "                    method: 'POST',\n" +
                "                    headers: { 'Content-Type': 'application/json' },\n" +
                "                    body: JSON.stringify({ token: '" + safeToken + "', newPassword: pass })\n" +
                "                });\n" +
                "                const data = await res.json();\n" +
                "                if (res.ok) {\n" +
                "                    alert.className = 'alert alert-success'; alert.innerText = data.message || 'Password reset successfully!'; alert.style.display = 'block';\n" +
                "                    document.getElementById('resetForm').style.display = 'none';\n" +
                "                } else {\n" +
                "                    alert.className = 'alert alert-error'; alert.innerText = data.message || 'Failed to reset password.'; alert.style.display = 'block';\n" +
                "                }\n" +
                "            } catch (err) {\n" +
                "                alert.className = 'alert alert-error'; alert.innerText = 'Network error. Please try again.'; alert.style.display = 'block';\n" +
                "            }\n" +
                "        });\n" +
                "    </script>\n" +
                "</body>\n" +
                "</html>";

        return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(html);
    }

    @Autowired
    private com.knust.campusserv.auth.repository.AccountDeletionTrackerRepository accountDeletionTrackerRepository;

    @Autowired
    private org.springframework.amqp.rabbit.core.RabbitTemplate rabbitTemplate;

    @GetMapping("/account/delete/check")
    public ResponseEntity<?> checkDeletionEligibility(@RequestHeader("X-User-Id") String userId) {
        List<String> blockers = new java.util.ArrayList<>();

        // 1. Check payment-service (wallet balance & pending withdrawals)
        try {
            Map<?, ?> paymentCheck = restTemplate.getForObject(
                "http://payment-service/internal/payments/check-deletion-eligibility/" + userId,
                Map.class
            );
            if (paymentCheck != null) {
                Number studentBalance = (Number) paymentCheck.get("studentBalance");
                Number studentHeld = (Number) paymentCheck.get("studentHeld");
                Number providerBalance = (Number) paymentCheck.get("providerBalance");
                Number pendingWithdrawals = (Number) paymentCheck.get("pendingWithdrawals");

                BigDecimal studentBal = studentBalance != null ? new BigDecimal(studentBalance.toString()) : BigDecimal.ZERO;
                BigDecimal studentHld = studentHeld != null ? new BigDecimal(studentHeld.toString()) : BigDecimal.ZERO;
                BigDecimal providerBal = providerBalance != null ? new BigDecimal(providerBalance.toString()) : BigDecimal.ZERO;
                long pendingWd = pendingWithdrawals != null ? pendingWithdrawals.longValue() : 0;

                if (studentBal.compareTo(BigDecimal.ZERO) > 0 || studentHld.compareTo(BigDecimal.ZERO) > 0) {
                    blockers.add("Remaining student wallet balance: GHS " + studentBal.add(studentHld).setScale(2).toString());
                }
                if (providerBal.compareTo(BigDecimal.ZERO) > 0) {
                    blockers.add("Remaining provider wallet balance: GHS " + providerBal.setScale(2).toString());
                }
                if (pendingWd > 0) {
                    blockers.add("You have " + pendingWd + " pending withdrawal request(s). Please wait for them to resolve.");
                }
            }
        } catch (Exception e) {
            log.error("Failed to check payment-service eligibility for user {}: {}", userId, e.getMessage());
        }

        // 2. Check job-service (active/in-progress jobs)
        try {
            Long activeJobsCount = restTemplate.getForObject(
                "http://job-service/internal/jobs/active-count/" + userId,
                Long.class
            );
            if (activeJobsCount != null && activeJobsCount > 0) {
                blockers.add("You have " + activeJobsCount + " active or in-progress job(s).");
            }
        } catch (Exception e) {
            log.error("Failed to check job-service eligibility for user {}: {}", userId, e.getMessage());
        }

        // 3. Check supporting-service (open disputes)
        try {
            Long activeDisputesCount = restTemplate.getForObject(
                "http://supporting-service/internal/disputes/active-count/" + userId,
                Long.class
            );
            if (activeDisputesCount != null && activeDisputesCount > 0) {
                blockers.add("You have " + activeDisputesCount + " unresolved dispute(s).");
            }
        } catch (Exception e) {
            log.error("Failed to check supporting-service eligibility for user {}: {}", userId, e.getMessage());
        }

        Map<String, Object> response = new HashMap<>();
        if (blockers.isEmpty()) {
            response.put("eligible", true);
            response.put("blockers", blockers);
            return ResponseEntity.ok(response);
        } else {
            response.put("eligible", false);
            response.put("blockers", blockers);
            return ResponseEntity.ok(response);
        }
    }

    @PostMapping("/account/delete")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> deleteAccount(
            @RequestHeader("X-User-Id") String userId,
            @RequestBody Map<String, String> body) {

        String password = body.get("password");
        if (password == null || password.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Password is required."));
        }

        Optional<User> userOpt = userRepository.findById(userId);
        if (!userOpt.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found."));
        }
        User user = userOpt.get();
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Incorrect password."));
        }

        ResponseEntity<?> eligibilityResponse = checkDeletionEligibility(userId);
        Map<?, ?> eligibilityMap = (Map<?, ?>) eligibilityResponse.getBody();
        if (eligibilityMap != null && Boolean.FALSE.equals(eligibilityMap.get("eligible"))) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "message", "Account cannot be deleted due to unresolved obligations.",
                "blockers", eligibilityMap.get("blockers")
            ));
        }

        com.knust.campusserv.auth.model.AccountDeletionTracker tracker = 
            new com.knust.campusserv.auth.model.AccountDeletionTracker(userId, user.getEmail());
        accountDeletionTrackerRepository.save(tracker);

        user.setAccountStatus("DELETING");
        userRepository.save(user);

        try {
            authService.revokeAllUserTokens(userId);
            authService.revokeGatewayToken(userId);
        } catch (Exception e) {
            log.error("Failed to revoke user tokens for {}: {}", userId, e.getMessage());
        }

        Map<String, String> payload = new HashMap<>();
        payload.put("userId", userId);
        payload.put("email", user.getEmail());
        
        try {
            rabbitTemplate.convertAndSend("account.deletion.exchange", "", payload);
        } catch (Exception e) {
            log.error("Failed to publish account deletion event for user {}: {}", userId, e.getMessage());
            throw new RuntimeException("RabbitMQ publication failed; rolling back transaction.", e);
        }

        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Account deletion initiated successfully."
        ));
    }

    @GetMapping("/check-email")
    public ResponseEntity<?> checkEmail(@RequestParam String email) {
        String normalizedEmail = email.toLowerCase().trim();
        Optional<User> existingUserOpt = userRepository.findByEmail(normalizedEmail);
        if (existingUserOpt.isPresent()) {
            User user = existingUserOpt.get();
            if (Boolean.TRUE.equals(user.getEmailVerified())) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body("An account with this email already exists — try signing in instead");
            }
        }
        return ResponseEntity.ok(Map.of("available", true));
    }

    @PostMapping("/verify-email")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> verifyEmail(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String code = body.get("code");

        if (email == null || email.trim().isEmpty() || code == null || code.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email and verification code are required"));
        }

        String normalizedEmail = email.toLowerCase().trim();
        Optional<User> userOpt = userRepository.findByEmail(normalizedEmail);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
        }

        User user = userOpt.get();
        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            return ResponseEntity.ok(Map.of("message", "Email is already verified"));
        }

        Optional<EmailVerificationCode> codeOpt = emailVerificationCodeRepository.findTopByUserIdOrderByCreatedAtDesc(user.getId());
        if (codeOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "No verification code exists. Please request a new one."));
        }

        EmailVerificationCode codeEntity = codeOpt.get();

        if (codeEntity.getExpiresAt().isBefore(LocalDateTime.now())) {
            return ResponseEntity.status(HttpStatus.GONE).body(Map.of("message", "Verification code has expired. Please request a new one."));
        }

        if (codeEntity.getAttempts() >= 5) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("message", "Too many incorrect attempts. This code is now invalid. Please request a new one."));
        }

        String submittedHash = hashCode(code.trim());
        if (!codeEntity.getCodeHash().equals(submittedHash)) {
            codeEntity.setAttempts(codeEntity.getAttempts() + 1);
            emailVerificationCodeRepository.save(codeEntity);
            if (codeEntity.getAttempts() >= 5) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("message", "Too many incorrect attempts. This code is now invalid. Please request a new one."));
            }
            return ResponseEntity.badRequest().body(Map.of("message", "Incorrect verification code. Please try again."));
        }

        // Correct code!
        user.setEmailVerified(true);
        userRepository.save(user);

        // Invalidate the code
        emailVerificationCodeRepository.delete(codeEntity);

        // Generate tokens to log them in fully
        String accessToken = jwtUtil.generateAccessToken(user.getId(), user.getRole());
        String rawRefreshToken = jwtUtil.generateRefreshToken(user.getId());
        authService.createRefreshToken(user.getId(), rawRefreshToken);

        return ResponseEntity.ok(buildAuthResponse(user, accessToken, rawRefreshToken));
    }

    @PostMapping("/resend-verification")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> resendVerification(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));
        }

        String normalizedEmail = email.toLowerCase().trim();
        Optional<User> userOpt = userRepository.findByEmail(normalizedEmail);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
        }

        User user = userOpt.get();
        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is already verified"));
        }

        // Rate limiting checks: min 60 seconds
        Optional<EmailVerificationCode> existingOpt = emailVerificationCodeRepository.findTopByUserIdOrderByCreatedAtDesc(user.getId());
        if (existingOpt.isPresent()) {
            EmailVerificationCode existing = existingOpt.get();
            if (existing.getLastSentAt().plusSeconds(60).isAfter(LocalDateTime.now())) {
                long secondsLeft = java.time.Duration.between(LocalDateTime.now(), existing.getLastSentAt().plusSeconds(60)).getSeconds();
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .body(Map.of("message", "Please wait " + secondsLeft + " seconds before requesting a new code."));
            }
        }

        // Invalidate all previous codes
        emailVerificationCodeRepository.deleteByUserId(user.getId());

        // Generate new code
        String rawCode = generateNumericCode();
        EmailVerificationCode newCodeEntity = new EmailVerificationCode();
        newCodeEntity.setId("evc-" + UUID.randomUUID().toString());
        newCodeEntity.setUserId(user.getId());
        newCodeEntity.setCodeHash(hashCode(rawCode));
        newCodeEntity.setExpiresAt(LocalDateTime.now().plusMinutes(15));
        newCodeEntity.setAttempts(0);
        newCodeEntity.setLastSentAt(LocalDateTime.now());
        emailVerificationCodeRepository.save(newCodeEntity);

        // Async Email send
        try {
            brevoEmailService.sendVerificationCodeEmail(user.getEmail(), user.getFullName(), rawCode, 15);
        } catch (Exception e) {
            log.error("Failed to send verification code email for {}", user.getEmail(), e);
        }

        return ResponseEntity.ok(Map.of("message", "A new verification code has been sent to your email."));
    }
}
