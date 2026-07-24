package com.knust.campusserv.gateway;

import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

// @Configuration
public class GatewayConfig {

    // @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        return builder.routes()
                .route("auth-service", r -> r.path("/auth/**")
                        .uri("lb://auth-service"))
                .route("user-service", r -> r.path("/users/**", "/providers/**")
                        .uri("lb://user-service"))
                .route("request-service", r -> r.path("/requests/**", "/api/requests/**")
                        .uri("lb://request-service"))
                .route("job-service", r -> r.path("/jobs/**")
                        .uri("lb://job-service"))
                .route("payment-service", r -> r.path("/payments/**", "/wallets/**", "/finance/**")
                        .uri("lb://payment-service"))
                .route("supporting-service", r -> r.path("/location/**", "/chats/**", "/ws/chats/**")
                        .uri("lb://supporting-service"))
                .build();
    }
}
