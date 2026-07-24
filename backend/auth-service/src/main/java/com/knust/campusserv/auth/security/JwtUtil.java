package com.knust.campusserv.auth.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secretKey;

    private static final long ACCESS_TOKEN_EXPIRATION = 15 * 60 * 1000; // 15 minutes
    private static final long REFRESH_TOKEN_EXPIRATION = 30L * 24 * 60 * 60 * 1000; // 30 days

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(secretKey.getBytes(StandardCharsets.UTF_8));
    }

    public String generateAccessToken(String userId, String role) {
        return generateAccessToken(userId, role, false);
    }

    public String generateAccessToken(String userId, String role, boolean pendingVerification) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", role);
        claims.put("pendingVerification", pendingVerification);
        long expiration = pendingVerification ? 5 * 60 * 1000 : ACCESS_TOKEN_EXPIRATION;
        return createToken(claims, userId, expiration);
    }

    public String generateRefreshToken(String userId) {
        return createToken(new HashMap<>(), userId, REFRESH_TOKEN_EXPIRATION);
    }

    private String createToken(Map<String, Object> claims, String subject, long expiration) {
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSigningKey())
                .compact();
    }

    public Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public String getUserIdFromToken(String token) {
        return extractAllClaims(token).getSubject();
    }

    public Boolean isPendingVerification(String token) {
        try {
            return extractAllClaims(token).get("pendingVerification", Boolean.class);
        } catch (Exception e) {
            return false;
        }
    }

    public String getRoleFromToken(String token) {
        return extractAllClaims(token).get("role", String.class);
    }

    public boolean isTokenExpired(String token) {
        return extractAllClaims(token).getExpiration().before(new Date());
    }

    public boolean validateToken(String token, String userId) {
        final String extractedUserId = getUserIdFromToken(token);
        return (extractedUserId.equals(userId) && !isTokenExpired(token));
    }
}
