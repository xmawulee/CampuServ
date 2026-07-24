package com.knust.campusserv.support.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.Arrays;

@Component
public class InternalAuthFilter extends OncePerRequestFilter {

    private final Environment environment;

    @Value("${internal.auth.secret:default_internal_service_secret_knust_campusserv_2026}")
    private String internalAuthSecret;

    public InternalAuthFilter(Environment environment) {
        this.environment = environment;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();

        // Skip health checks, eureka registration, public endpoints, and WebSocket endpoints
        if (path.equals("/actuator/health") || path.startsWith("/eureka/") || path.startsWith("/error") ||
            path.startsWith("/ws/chats") || path.startsWith("/chats/ws")) {
            filterChain.doFilter(request, response);
            return;
        }

        boolean isLocalOrTest = Arrays.stream(environment.getActiveProfiles())
                .anyMatch(profile -> profile.equalsIgnoreCase("local-dev") || profile.equalsIgnoreCase("test"));

        if (isLocalOrTest) {
            String authHeader = request.getHeader("X-Internal-Auth");
            if (authHeader != null && !authHeader.equals(internalAuthSecret)) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.getWriter().write("Unauthorized: Invalid internal service token");
                return;
            }
        } else {
            String authHeader = request.getHeader("X-Internal-Auth");
            if (authHeader == null || !authHeader.equals(internalAuthSecret)) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.getWriter().write("Unauthorized: Missing or invalid internal service token");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}
