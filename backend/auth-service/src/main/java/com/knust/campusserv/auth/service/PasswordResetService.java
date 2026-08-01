package com.knust.campusserv.auth.service;

import com.knust.campusserv.auth.model.PasswordResetCode;
import com.knust.campusserv.auth.model.PasswordResetSession;
import com.knust.campusserv.auth.model.User;
import com.knust.campusserv.auth.repository.PasswordResetCodeRepository;
import com.knust.campusserv.auth.repository.PasswordResetSessionRepository;
import com.knust.campusserv.auth.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);
    private static final Pattern PASSWORD_PATTERN = Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d).{8,}$");
    private static final int MAX_RATE_LIMIT_REQUESTS = 3;
    private static final Duration RATE_LIMIT_WINDOW = Duration.ofMinutes(15);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordResetCodeRepository passwordResetCodeRepository;

    @Autowired
    private PasswordResetSessionRepository passwordResetSessionRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthService authService;

    @Autowired
    private BrevoEmailService brevoEmailService;

    @Autowired(required = false)
    private StringRedisTemplate redisTemplate;

    private final SecureRandom secureRandom = new SecureRandom();

    public String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new RuntimeException("Error hashing token", e);
        }
    }

    public void checkRateLimit(String email, String clientIp) {
        if (redisTemplate == null) return;

        String ipKey = "rate:forgot-password:ip:" + (clientIp != null ? clientIp : "unknown");
        String emailKey = "rate:forgot-password:email:" + email.toLowerCase().trim();

        checkAndIncrementRateKey(ipKey, "IP address");
        checkAndIncrementRateKey(emailKey, "email address");
    }

    private void checkAndIncrementRateKey(String key, String targetType) {
        try {
            String currentStr = redisTemplate.opsForValue().get(key);
            int current = currentStr != null ? Integer.parseInt(currentStr) : 0;
            if (current >= MAX_RATE_LIMIT_REQUESTS) {
                throw new IllegalStateException("Too many password reset requests for this " + targetType + ". Please wait 15 minutes before trying again.");
            }
            redisTemplate.opsForValue().increment(key);
            if (current == 0) {
                redisTemplate.expire(key, RATE_LIMIT_WINDOW);
            }
        } catch (IllegalStateException ise) {
            throw ise;
        } catch (Exception e) {
            log.warn("Redis rate-limiting check encountered an error: {}", e.getMessage());
        }
    }

    @Transactional
    public void processForgotPassword(String email, String clientIp) {
        String normalizedEmail = email.trim().toLowerCase();
        
        // Check rate limiting
        checkRateLimit(normalizedEmail, clientIp);

        Optional<User> userOpt = userRepository.findByEmail(normalizedEmail);
        if (userOpt.isEmpty()) {
            log.warn("Forgot password requested for non-existent email [{}]", normalizedEmail);
            // Simulate work to prevent timing analysis / enumeration
            try { Thread.sleep(200); } catch (InterruptedException ignored) {}
            return;
        }

        User user = userOpt.get();

        // Check if user is locked out due to previous attempts limit (5 wrong guesses)
        Optional<PasswordResetCode> existingCodeOpt = passwordResetCodeRepository.findTopByUserIdOrderByCreatedAtDesc(user.getId());
        if (existingCodeOpt.isPresent()) {
            PasswordResetCode existing = existingCodeOpt.get();
            if (existing.getAttempts() >= 5) {
                LocalDateTime lockoutUntil = existing.getCreatedAt().plusMinutes(5);
                if (LocalDateTime.now().isBefore(lockoutUntil)) {
                    throw new IllegalStateException("Too many failed verification attempts. Please wait 5 minutes before requesting a new code.");
                }
            }
        }

        // Delete any prior code
        passwordResetCodeRepository.deleteByUserId(user.getId());

        // Generate 6-digit code
        String rawCode = String.format("%06d", secureRandom.nextInt(1000000));
        String codeHash = hashToken(rawCode);

        PasswordResetCode codeEntity = new PasswordResetCode();
        codeEntity.setId(UUID.randomUUID().toString());
        codeEntity.setUserId(user.getId());
        codeEntity.setCodeHash(codeHash);
        codeEntity.setExpiresAt(LocalDateTime.now().plusMinutes(10)); // 10 minutes
        codeEntity.setAttempts(0);
        codeEntity.setLastSentAt(LocalDateTime.now());

        passwordResetCodeRepository.save(codeEntity);

        // Send code email
        brevoEmailService.sendPasswordResetCodeEmail(user.getEmail(), user.getFullName(), rawCode);
    }

    @Transactional
    public String verifyResetCode(String email, String rawCode) {
        if (rawCode == null || rawCode.trim().length() != 6) {
            throw new IllegalArgumentException("Invalid verification code format. Code must be 6 digits.");
        }

        String normalizedEmail = email.trim().toLowerCase();
        Optional<User> userOpt = userRepository.findByEmail(normalizedEmail);
        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("Associated user account not found.");
        }

        User user = userOpt.get();

        Optional<PasswordResetCode> codeOpt = passwordResetCodeRepository.findTopByUserIdOrderByCreatedAtDesc(user.getId());
        if (codeOpt.isEmpty()) {
            throw new IllegalArgumentException("No active reset code found. Please request a new code.");
        }

        PasswordResetCode codeEntity = codeOpt.get();

        // Enforce lockout check
        if (codeEntity.getAttempts() >= 5) {
            LocalDateTime lockoutUntil = codeEntity.getCreatedAt().plusMinutes(5);
            if (LocalDateTime.now().isBefore(lockoutUntil)) {
                throw new IllegalStateException("Account locked out due to too many failed attempts. Please wait 5 minutes.");
            } else {
                // Lockout expired, but code is now invalid anyway.
                passwordResetCodeRepository.delete(codeEntity);
                throw new IllegalArgumentException("Reset code has expired. Please request a new code.");
            }
        }

        // Enforce expiry check
        if (codeEntity.getExpiresAt().isBefore(LocalDateTime.now())) {
            passwordResetCodeRepository.delete(codeEntity);
            throw new IllegalArgumentException("Reset code has expired. Please request a new code.");
        }

        // Verify hash
        String inputHash = hashToken(rawCode.trim());
        if (!codeEntity.getCodeHash().equals(inputHash)) {
            codeEntity.setAttempts(codeEntity.getAttempts() + 1);
            passwordResetCodeRepository.save(codeEntity);

            if (codeEntity.getAttempts() >= 5) {
                throw new IllegalStateException("Too many wrong attempts. Hitting limit. Please wait 5 minutes before trying again.");
            }

            throw new IllegalArgumentException("Incorrect verification code. Attempts remaining: " + (5 - codeEntity.getAttempts()));
        }

        // Verification successful: invalidate verification code immediately
        passwordResetCodeRepository.delete(codeEntity);

        // Generate 32-byte reset session token
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        String rawSessionToken = HexFormat.of().formatHex(randomBytes);
        String sessionTokenHash = hashToken(rawSessionToken);

        // Clean any existing session tokens for the user
        passwordResetSessionRepository.deleteByUserId(user.getId());

        PasswordResetSession session = new PasswordResetSession();
        session.setId(UUID.randomUUID().toString());
        session.setUserId(user.getId());
        session.setTokenHash(sessionTokenHash);
        session.setExpiresAt(LocalDateTime.now().plusMinutes(15)); // 15 mins

        passwordResetSessionRepository.save(session);

        return rawSessionToken;
    }

    @Transactional
    public void resetPassword(String rawSessionToken, String newPassword) {
        if (rawSessionToken == null || rawSessionToken.trim().isEmpty()) {
            throw new IllegalArgumentException("Invalid or missing reset session token.");
        }

        if (newPassword == null || !PASSWORD_PATTERN.matcher(newPassword).matches()) {
            throw new IllegalArgumentException("Password must be at least 8 characters long and contain both letters and numbers.");
        }

        String tokenHash = hashToken(rawSessionToken.trim());
        Optional<PasswordResetSession> sessionOpt = passwordResetSessionRepository.findByTokenHash(tokenHash);

        if (sessionOpt.isEmpty()) {
            throw new IllegalArgumentException("Invalid or expired password reset session.");
        }

        PasswordResetSession session = sessionOpt.get();

        if (session.getUsedAt() != null) {
            throw new IllegalArgumentException("This password reset session has already been used.");
        }

        if (session.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("This password reset session has expired.");
        }

        Optional<User> userOpt = userRepository.findById(session.getUserId());
        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("Associated user account not found.");
        }

        User user = userOpt.get();

        // Enforce that new password cannot be the same as current
        if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
            throw new IllegalArgumentException("New password cannot be the same as your current password.");
        }

        // Save new password
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Mark session token as used
        session.setUsedAt(LocalDateTime.now());
        passwordResetSessionRepository.save(session);

        // Invalidate all active sessions for this user across DB, Redis, and API Gateway
        authService.revokeAllUserTokens(user.getId());
        authService.revokeGatewayToken(user.getId());

        log.info("Password successfully reset and sessions revoked for user ID: {}", user.getId());
    }
}
