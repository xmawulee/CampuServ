package com.knust.campusserv.support.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import org.springframework.lang.NonNull;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.security.Principal;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${jwt.secret}")
    private String secretKey;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void configureMessageBroker(@NonNull MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(@NonNull StompEndpointRegistry registry) {
        registry.addEndpoint("/ws/chats")
                .setAllowedOriginPatterns("*"); // Allow React Native client connections
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (accessor != null) {
                    if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                        String authHeader = accessor.getFirstNativeHeader("Authorization");
                        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                            throw new IllegalArgumentException("Missing or invalid Authorization header");
                        }
                        String token = authHeader.substring(7);
                        try {
                            Key key = Keys.hmacShaKeyFor(secretKey.getBytes(StandardCharsets.UTF_8));
                            Claims claims = Jwts.parserBuilder()
                                    .setSigningKey(key)
                                    .build()
                                    .parseClaimsJws(token)
                                    .getBody();
                            
                            String userId = claims.getSubject();
                            String role = claims.get("role", String.class);
                            if (userId != null) {
                                accessor.setUser(new StompPrincipal(userId, role));
                            } else {
                                throw new IllegalArgumentException("Invalid JWT: Subject missing");
                            }
                        } catch (Exception e) {
                            System.err.println("WebSocket STOMP auth failed: " + e.getMessage());
                            throw new IllegalArgumentException("WebSocket STOMP auth failed: " + e.getMessage());
                        }
                    } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
                        String destination = accessor.getDestination();
                        Principal principal = accessor.getUser();
                        if (destination != null && destination.startsWith("/topic/task/") && destination.endsWith("/provider-location")) {
                            String taskId = destination.substring("/topic/task/".length(), destination.length() - "/provider-location".length());
                            if (principal == null) {
                                throw new IllegalArgumentException("Unauthorized subscription: User not authenticated");
                            }
                            String userId = principal.getName();
                            
                            boolean isAuthorized = false;
                            try {
                                Integer count = jdbcTemplate.queryForObject(
                                    "SELECT COUNT(*) FROM jobs WHERE id = ? AND (requester_id = ? OR provider_id = ?)",
                                    Integer.class, taskId, userId, userId
                                );
                                isAuthorized = (count != null && count > 0);
                            } catch (Exception e) {
                                System.err.println("WebSocket subscription authorization error: " + e.getMessage());
                            }
                            if (!isAuthorized) {
                                throw new IllegalArgumentException("Unauthorized subscription to task location updates");
                            }
                        } else if (destination != null && destination.startsWith("/topic/admin/")) {
                            if (principal == null || !(principal instanceof StompPrincipal)) {
                                throw new IllegalArgumentException("Unauthorized subscription");
                            }
                            StompPrincipal stompPrincipal = (StompPrincipal) principal;
                            if (!"ADMIN".equals(stompPrincipal.getRole())) {
                                throw new IllegalArgumentException("Unauthorized: Admin role required");
                            }
                        } else if (destination != null && destination.startsWith("/topic/user/")) {
                            // Format: /topic/user/{userId}/completion-code
                            String prefix = "/topic/user/";
                            int nextSlash = destination.indexOf("/", prefix.length());
                            if (nextSlash != -1) {
                                String targetUserId = destination.substring(prefix.length(), nextSlash);
                                if (principal == null || !principal.getName().equals(targetUserId)) {
                                    throw new IllegalArgumentException("Unauthorized subscription to user specific topic");
                                }
                            }
                        } else if (destination != null && destination.startsWith("/topic/chat/")) {
                            String threadId = destination.substring("/topic/chat/".length());
                            if (principal == null) {
                                throw new IllegalArgumentException("Unauthorized subscription: User not authenticated");
                            }
                            String userId = principal.getName();
                            boolean isAuthorized = false;
                            try {
                                Integer count = jdbcTemplate.queryForObject(
                                    "SELECT COUNT(*) FROM chat_threads WHERE id = ? AND (client_id = ? OR provider_id = ?)",
                                    Integer.class, threadId, userId, userId
                                );
                                isAuthorized = (count != null && count > 0);
                            } catch (Exception e) {
                                System.err.println("WebSocket chat subscription authorization error: " + e.getMessage());
                            }
                            if (!isAuthorized) {
                                throw new IllegalArgumentException("Unauthorized subscription to chat thread");
                            }
                        } else if (destination != null && destination.startsWith("/topic/provider/") && destination.endsWith("/job-updates")) {
                            // Only the provider themselves OR a client who has an active job with that provider may subscribe
                            String middle = destination.substring("/topic/provider/".length(), destination.length() - "/job-updates".length());
                            String providerId = middle;
                            if (principal == null) {
                                throw new IllegalArgumentException("Unauthorized subscription: User not authenticated");
                            }
                            String userId = principal.getName();
                            if (!userId.equals(providerId)) {
                                // Check if this user has an active job with the provider
                                boolean isAuthorized = false;
                                try {
                                    Integer count = jdbcTemplate.queryForObject(
                                        "SELECT COUNT(*) FROM jobs WHERE provider_id = ? AND requester_id = ? AND status NOT IN ('COMPLETED','CANCELLED')",
                                        Integer.class, providerId, userId
                                    );
                                    isAuthorized = (count != null && count > 0);
                                } catch (Exception e) {
                                    System.err.println("WebSocket provider job-updates auth error: " + e.getMessage());
                                }
                                if (!isAuthorized) {
                                    throw new IllegalArgumentException("Unauthorized subscription to provider job-updates: not party to an active job");
                                }
                            }
                        } else if (destination != null && destination.startsWith("/topic/job.") && destination.endsWith(".status")) {
                            // Only the requester or provider on this specific job may subscribe
                            String jobId = destination.substring("/topic/job.".length(), destination.length() - ".status".length());
                            if (principal == null) {
                                throw new IllegalArgumentException("Unauthorized subscription: User not authenticated");
                            }
                            String userId = principal.getName();
                            boolean isAuthorized = false;
                            try {
                                Integer count = jdbcTemplate.queryForObject(
                                    "SELECT COUNT(*) FROM jobs WHERE id = ? AND (requester_id = ? OR provider_id = ?)",
                                    Integer.class, jobId, userId, userId
                                );
                                isAuthorized = (count != null && count > 0);
                            } catch (Exception e) {
                                System.err.println("WebSocket job-status auth error: " + e.getMessage());
                            }
                            if (!isAuthorized) {
                                throw new IllegalArgumentException("Unauthorized subscription to job status: not party to job " + jobId);
                            }
                        }
                    }
                }
                return message;
            }
        });
    }

    // A simple Principal implementation that doesn't require Spring Security
    public static class StompPrincipal implements Principal {
        private final String name;
        private final String role;

        public StompPrincipal(String name, String role) {
            this.name = name;
            this.role = role;
        }

        @Override
        public String getName() {
            return name;
        }
        
        public String getRole() {
            return role;
        }
    }
}
