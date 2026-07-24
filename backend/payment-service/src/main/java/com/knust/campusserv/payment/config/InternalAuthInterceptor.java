package com.knust.campusserv.payment.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.stereotype.Component;
import java.io.IOException;

@Component
public class InternalAuthInterceptor implements ClientHttpRequestInterceptor {

    @Value("${internal.auth.secret:default_internal_service_secret_knust_campusserv_2026}")
    private String internalAuthSecret;

    @Override
    public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution) throws IOException {
        request.getHeaders().add("X-Internal-Auth", internalAuthSecret);
        return execution.execute(request, body);
    }
}
