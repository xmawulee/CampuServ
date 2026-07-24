package com.knust.campusserv.auth.service;

import com.knust.campusserv.auth.model.RefreshToken;
import com.knust.campusserv.auth.model.User;
import com.knust.campusserv.auth.repository.RefreshTokenRepository;
import com.knust.campusserv.auth.repository.UserRepository;
import com.knust.campusserv.auth.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private EventPublisher eventPublisher;

    @Autowired
    private JwtUtil jwtUtil;

    public String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Error hashing token", e);
        }
    }

    @Transactional
    public RefreshToken createRefreshToken(String userId, String token) {
        RefreshToken rt = new RefreshToken();
        rt.setId(UUID.randomUUID().toString());
        rt.setUserId(userId);
        rt.setTokenHash(hashToken(token));
        
        // 30 days from now (matches JwtUtil)
        rt.setExpiresAt(LocalDateTime.now().plusDays(30));
        return refreshTokenRepository.save(rt);
    }

    @Transactional
    public String[] rotateRefreshToken(String oldTokenStr, User user) {
        String tokenHash = hashToken(oldTokenStr);
        Optional<RefreshToken> rtOpt = refreshTokenRepository.findByTokenHash(tokenHash);
        
        if (rtOpt.isEmpty()) {
            throw new IllegalArgumentException("Refresh token not found in database.");
        }

        RefreshToken oldToken = rtOpt.get();

        if (oldToken.getRevokedAt() != null) {
            // REUSE DETECTED! Token was already revoked.
            // Revoke entire token family for this user
            refreshTokenRepository.revokeAllUserTokens(user.getId());
            throw new IllegalStateException("Token reuse detected. All tokens revoked.");
        }

        if (oldToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Refresh token expired in database.");
        }

        // Revoke the old token
        oldToken.setRevokedAt(LocalDateTime.now());

        // Issue new token pair
        String activeRole = user.getRole();
        String newAccessToken = jwtUtil.generateAccessToken(user.getId(), activeRole);
        String newRefreshTokenStr = jwtUtil.generateRefreshToken(user.getId());

        RefreshToken newRt = new RefreshToken();
        newRt.setId(UUID.randomUUID().toString());
        newRt.setUserId(user.getId());
        newRt.setTokenHash(hashToken(newRefreshTokenStr));
        newRt.setExpiresAt(LocalDateTime.now().plusDays(30));
        newRt.setReplacedByTokenId(oldToken.getId());

        refreshTokenRepository.save(oldToken);
        refreshTokenRepository.save(newRt);

        return new String[]{newAccessToken, newRefreshTokenStr};
    }

    @Transactional
    public void revokeAllUserTokens(String userId) {
        refreshTokenRepository.revokeAllUserTokens(userId);
    }

    @org.springframework.beans.factory.annotation.Value("${internal.auth.secret:default_internal_service_secret_knust_campusserv_2026}")
    private String internalAuthSecret;

    public void revokeGatewayToken(String userId) {
        try {
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("X-Internal-Auth", internalAuthSecret);
            org.springframework.http.HttpEntity<Void> entity = new org.springframework.http.HttpEntity<>(headers);
            restTemplate.postForObject("http://api-gateway/internal/revoke-token/" + userId, entity, String.class);
            log.info("Successfully revoked access token at gateway for user {}", userId);
        } catch (Exception e) {
            log.error("Failed to revoke access token at gateway for user {}: {}", userId, e.getMessage());
        }
    }

    public void unrevokeGatewayToken(String userId) {
        try {
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("X-Internal-Auth", internalAuthSecret);
            org.springframework.http.HttpEntity<Void> entity = new org.springframework.http.HttpEntity<>(headers);
            restTemplate.postForObject("http://api-gateway/internal/unrevoke-token/" + userId, entity, String.class);
            log.info("Successfully un-revoked access token at gateway for user {}", userId);
        } catch (Exception e) {
            log.error("Failed to un-revoke access token at gateway for user {}: {}", userId, e.getMessage());
        }
    }
}
