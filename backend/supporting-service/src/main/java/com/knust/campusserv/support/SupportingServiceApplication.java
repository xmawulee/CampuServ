package com.knust.campusserv.support;

import org.springframework.amqp.core.Queue;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.context.annotation.Bean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.client.RestTemplate;

@SpringBootApplication
@EnableDiscoveryClient
@org.springframework.scheduling.annotation.EnableScheduling
public class SupportingServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(SupportingServiceApplication.class, args);
    }

    @Autowired
    private com.knust.campusserv.support.config.InternalAuthInterceptor internalAuthInterceptor;

    @Bean
    @LoadBalanced
    public RestTemplate restTemplate() {
        org.springframework.http.client.SimpleClientHttpRequestFactory factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(10000);
        RestTemplate restTemplate = new RestTemplate(factory);
        restTemplate.setInterceptors(java.util.Collections.singletonList(internalAuthInterceptor));
        return restTemplate;
    }



}
