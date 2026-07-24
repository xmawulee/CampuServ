package com.knust.campusserv.gateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.security.Key;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import java.time.Duration;

@Component
public class JwtValidationGatewayFilterFactory extends AbstractGatewayFilterFactory<JwtValidationGatewayFilterFactory.Config> {

    @Value("${jwt.secret}")
    private String secretKey;

    @Value("${internal.auth.secret}")
    private String internalAuthSecret;

    @Autowired(required = false)
    private ReactiveStringRedisTemplate redisTemplate;

    private static final java.util.concurrent.ConcurrentHashMap<String, Long> revokedUsers = new java.util.concurrent.ConcurrentHashMap<>();

    @Value("${spring.profiles.active:}")
    private String activeProfiles;

    @jakarta.annotation.PostConstruct
    public void init() {
        System.out.println(">>> JwtValidationGatewayFilterFactory instantiated successfully!");
        boolean isLocal = activeProfiles != null && (activeProfiles.contains("local-dev") || activeProfiles.contains("dev") || activeProfiles.contains("test"));
        String defaultJwtSecret = "dGhlLXN1cGVyLXNlY3JldC1jb25mZGVudGlhbC1qd3Qta2V5LWZvci1jYW1wdXNzZXJ2LWtudXN0LWdyb3VwLTg4";
        String defaultInternalSecret = "default_internal_service_secret_knust_campusserv_2026";
        if (!isLocal) {
            if (defaultJwtSecret.equals(secretKey)) {
                throw new IllegalStateException("CRITICAL SECURITY ERROR: Running in non-local profile with insecure fallback jwt.secret!");
            }
            if (defaultInternalSecret.equals(internalAuthSecret)) {
                throw new IllegalStateException("CRITICAL SECURITY ERROR: Running in non-local profile with insecure fallback internal.auth.secret!");
            }
        }
    }

    public JwtValidationGatewayFilterFactory() {
        super(Config.class);
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            ServerHttpRequest request = exchange.getRequest();
            String path = request.getURI().getPath();
            System.out.println(">>> JwtValidationGatewayFilterFactory intercepting: " + path);

            // Intercept internal token revocation calls from microservices
            if (path.startsWith("/internal/revoke-token/")) {
                String authSecret = request.getHeaders().getFirst("X-Internal-Auth");
                if (authSecret == null || !authSecret.equals(internalAuthSecret)) {
                    System.out.println(">>> JwtValidationGatewayFilterFactory: Unauthorized internal revocation call");
                    return onError(exchange, "Unauthorized internal access", HttpStatus.UNAUTHORIZED);
                }
                String userId = path.substring("/internal/revoke-token/".length());
                revokedUsers.put(userId, System.currentTimeMillis() + 15 * 60 * 1000); // 15 mins TTL
                
                if (redisTemplate != null) {
                    try {
                        redisTemplate.opsForValue().set("revoked:user:" + userId, "true", Duration.ofMinutes(15)).block(Duration.ofMillis(500));
                    } catch (Exception e) {
                        redisTemplate.opsForValue().set("revoked:user:" + userId, "true", Duration.ofMinutes(15)).subscribe();
                    }
                }
                
                System.out.println(">>> JwtValidationGatewayFilterFactory: Added user " + userId + " to deny-list (memory + redis)");
                exchange.getResponse().setStatusCode(HttpStatus.OK);
                return exchange.getResponse().setComplete();
            }

            // Intercept internal token un-revocation calls (account reactivation)
            if (path.startsWith("/internal/unrevoke-token/")) {
                String authSecret = request.getHeaders().getFirst("X-Internal-Auth");
                if (authSecret == null || !authSecret.equals(internalAuthSecret)) {
                    System.out.println(">>> JwtValidationGatewayFilterFactory: Unauthorized internal un-revocation call");
                    return onError(exchange, "Unauthorized internal access", HttpStatus.UNAUTHORIZED);
                }
                String userId = path.substring("/internal/unrevoke-token/".length());
                revokedUsers.remove(userId);
                
                if (redisTemplate != null) {
                    try {
                        redisTemplate.delete("revoked:user:" + userId).block(Duration.ofMillis(500));
                    } catch (Exception e) {
                        redisTemplate.delete("revoked:user:" + userId).subscribe();
                    }
                }
                
                System.out.println(">>> JwtValidationGatewayFilterFactory: Removed user " + userId + " from deny-list (memory + redis)");
                exchange.getResponse().setStatusCode(HttpStatus.OK);
                return exchange.getResponse().setComplete();
            }

            // Direct pass-through for public endpoints
            if (isPublicEndpoint(path)) {
                return chain.filter(exchange);
            }

            if (!request.getHeaders().containsKey("Authorization")) {
                System.out.println(">>> JwtValidationGatewayFilterFactory: Missing Authorization header");
                return onError(exchange, "Missing Authorization Header", HttpStatus.UNAUTHORIZED);
            }

            String authHeader = request.getHeaders().getFirst("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                System.out.println(">>> JwtValidationGatewayFilterFactory: Invalid Authorization header format");
                return onError(exchange, "Invalid Authorization Header Format", HttpStatus.UNAUTHORIZED);
            }

            String token = authHeader.substring(7);

            try {
                Claims claims = validateToken(token);
                String userId = claims.getSubject();

                // Gate unverified tokens: block access to all non-public endpoints
                Boolean pendingVerification = claims.get("pendingVerification", Boolean.class);
                if (Boolean.TRUE.equals(pendingVerification)) {
                    System.out.println(">>> JwtValidationGatewayFilterFactory: Blocked pending verification token for path: " + path);
                    return onError(exchange, "Forbidden: Email verification pending", HttpStatus.FORBIDDEN);
                }

                // Check if user is in deny-list (revoked/deleted) via in-memory map or Redis
                boolean isRevoked = false;
                Long revokeExpiry = revokedUsers.get(userId);
                if (revokeExpiry != null && System.currentTimeMillis() < revokeExpiry) {
                    isRevoked = true;
                } else if (redisTemplate != null) {
                    try {
                        Boolean hasKey = redisTemplate.hasKey("revoked:user:" + userId).block(java.time.Duration.ofMillis(500));
                        if (Boolean.TRUE.equals(hasKey)) {
                            isRevoked = true;
                        }
                    } catch (Exception e) {
                        System.err.println("Redis deny-list check fallback: " + e.getMessage());
                    }
                }

                if (isRevoked) {
                    System.out.println(">>> JwtValidationGatewayFilterFactory: Blocked revoked/restricted user: " + userId);
                    return onAccountRestricted(exchange);
                }
                
                String role = claims.get("role", String.class);
                System.out.println(">>> JwtValidationGatewayFilterFactory: Token validated. Subject = " + claims.getSubject() + ", role = " + role);

                if (path.startsWith("/admin/") && !"ADMIN".equals(role)) {
                    System.out.println(">>> JwtValidationGatewayFilterFactory: Forbidden role: " + role);
                    return onError(exchange, "Forbidden: Admin access required", HttpStatus.FORBIDDEN);
                }

                // Mutate request to pass authenticated details downstream
                ServerHttpRequest modifiedRequest = request.mutate()
                        .header("X-User-Id", userId)
                        .header("X-User-Role", role)
                        .build();

                System.out.println(">>> JwtValidationGatewayFilterFactory: Mutating request. Headers = " + modifiedRequest.getHeaders());
                return chain.filter(exchange.mutate().request(modifiedRequest).build());
            } catch (Exception e) {
                System.out.println(">>> JwtValidationGatewayFilterFactory: Token validation failed: " + e.getMessage());
                return onError(exchange, "Token Validation Failed: " + e.getMessage(), HttpStatus.UNAUTHORIZED);
            }
        };
    }

    private boolean isPublicEndpoint(String path) {
        return path.startsWith("/auth/register") || 
               path.startsWith("/auth/login") || 
               path.startsWith("/auth/refresh") ||
               path.startsWith("/auth/verify-email") ||
               path.startsWith("/auth/check-status") ||
               path.startsWith("/auth/resend-verification") ||
               path.startsWith("/auth/complete-verification") ||
               path.startsWith("/auth/files/") ||
               path.startsWith("/users/files/") ||
               path.startsWith("/categories") ||
               path.contains("/payments/webhook") ||
               path.startsWith("/ws/chats") ||
               path.startsWith("/internal/revoke-token/") ||
               path.startsWith("/internal/unrevoke-token/");
    }

    private Claims validateToken(String token) {
        Key key = Keys.hmacShaKeyFor(secretKey.getBytes(StandardCharsets.UTF_8));
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private Mono<Void> onAccountRestricted(ServerWebExchange exchange) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.FORBIDDEN);
        response.getHeaders().setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
        byte[] bytes = "{\"error\":\"ACCOUNT_RESTRICTED\",\"message\":\"Account has been suspended or banned.\"}"
                .getBytes(StandardCharsets.UTF_8);
        org.springframework.core.io.buffer.DataBuffer buffer = response.bufferFactory().wrap(bytes);
        return response.writeWith(Mono.just(buffer));
    }

    private Mono<Void> onError(ServerWebExchange exchange, String err, HttpStatus status) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(status);
        return response.setComplete();
    }

    public static class Config {
        // Filter config parameters (empty configuration)
    }
}
