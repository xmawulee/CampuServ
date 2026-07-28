package com.knust.campusserv.gateway.exception;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.web.reactive.error.ErrorWebExceptionHandler;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.net.ConnectException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@Component
@Order(-1)
public class GlobalExceptionHandler implements ErrorWebExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public Mono<Void> handle(ServerWebExchange exchange, Throwable ex) {
        ServerHttpResponse response = exchange.getResponse();

        if (response.isCommitted()) {
            return Mono.error(ex);
        }

        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        HttpStatus status = HttpStatus.INTERNAL_SERVER_ERROR;
        String message = ex.getMessage();
        boolean isServiceUnavailable = false;

        if (ex instanceof ResponseStatusException rse) {
            status = HttpStatus.valueOf(rse.getStatusCode().value());
            if (status == HttpStatus.SERVICE_UNAVAILABLE || status == HttpStatus.NOT_FOUND) {
                isServiceUnavailable = true;
            }
        } else if (ex.getClass().getName().contains("NotFoundException") || ex instanceof ConnectException || ex.getMessage() != null && ex.getMessage().contains("Unable to find instance")) {
            status = HttpStatus.SERVICE_UNAVAILABLE;
            isServiceUnavailable = true;
        } else if (ex instanceof org.springframework.web.server.ResponseStatusException webRse) {
            status = HttpStatus.valueOf(webRse.getStatusCode().value());
            if (status == HttpStatus.SERVICE_UNAVAILABLE) {
                isServiceUnavailable = true;
            }
        }

        Map<String, Object> errorDetails = new HashMap<>();
        errorDetails.put("status", status.value());
        errorDetails.put("error", status.getReasonPhrase());

        if (isServiceUnavailable) {
            response.setStatusCode(HttpStatus.SERVICE_UNAVAILABLE);
            response.getHeaders().add("Retry-After", "5");
            errorDetails.put("status", 503);
            errorDetails.put("error", "Service Unavailable");
            errorDetails.put("message", "The target service is temporarily unavailable or starting up in Eureka registry. Please retry in a few seconds.");
            errorDetails.put("retryAfterSeconds", 5);
            log.warn("Downstream service unavailable for route {}: {}", exchange.getRequest().getURI(), ex.getMessage());
        } else {
            response.setStatusCode(status);
            errorDetails.put("message", message != null ? message : "An unexpected error occurred in API Gateway");
            log.error("Gateway execution exception for URI {}: {}", exchange.getRequest().getURI(), ex.getMessage());
        }

        byte[] bytes;
        try {
            bytes = objectMapper.writeValueAsBytes(errorDetails);
        } catch (JsonProcessingException e) {
            bytes = "{\"status\":500,\"error\":\"Internal Server Error\",\"message\":\"Gateway JSON formatting error\"}".getBytes(StandardCharsets.UTF_8);
        }

        DataBuffer buffer = response.bufferFactory().wrap(bytes);
        return response.writeWith(Mono.just(buffer));
    }
}
