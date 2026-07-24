package com.knust.campusserv.auth.service;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class EventPublisher {

    @Autowired
    private RabbitTemplate rabbitTemplate;

    public void publishAdminNotification(String type, String entityId, String summary, String severity) {
        Map<String, String> payload = new HashMap<>();
        payload.put("type", type);
        payload.put("entityId", entityId);
        payload.put("summary", summary);
        payload.put("severity", severity);
        // We let the listener set the timestamp
        
        rabbitTemplate.convertAndSend("admin.notifications", "", payload);
    }

    public void publishUserStatusChanged(String userId, String status) {
        Map<String, String> payload = new HashMap<>();
        payload.put("entityId", userId);
        payload.put("summary", "Status: " + status);
        payload.put("severity", "WARNING");
        payload.put("type", "user.status.changed");
        
        rabbitTemplate.convertAndSend("admin.notifications", "", payload);

        Map<String, String> statusPayload = new HashMap<>();
        statusPayload.put("userId", userId);
        statusPayload.put("status", status);
        rabbitTemplate.convertAndSend("", "user.status.updated", statusPayload);
    }

    public void publishProviderVerificationEvent(String userId, String status, String reason) {
        Map<String, String> payload = new HashMap<>();
        payload.put("providerId", userId);
        payload.put("status", status);
        if (reason != null) {
            payload.put("reason", reason);
        }
        rabbitTemplate.convertAndSend("provider.verification", "", payload);
    }


}
