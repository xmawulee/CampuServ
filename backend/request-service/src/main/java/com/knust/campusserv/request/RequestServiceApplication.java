package com.knust.campusserv.request;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.context.annotation.Bean;
import org.springframework.web.client.RestTemplate;

import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableDiscoveryClient
@EnableScheduling
@org.springframework.web.bind.annotation.RestController
public class RequestServiceApplication {

    @org.springframework.web.bind.annotation.GetMapping("/ping")
    public String ping() {
        return "pong";
    }

    public static void main(String[] args) {
        SpringApplication.run(RequestServiceApplication.class, args);
    }

}
