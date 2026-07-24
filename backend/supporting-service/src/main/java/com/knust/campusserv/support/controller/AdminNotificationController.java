package com.knust.campusserv.support.controller;

import com.knust.campusserv.support.model.AdminNotification;
import com.knust.campusserv.support.repository.AdminNotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/admin/notifications")
public class AdminNotificationController {

    @Autowired
    private AdminNotificationRepository repository;

    @GetMapping
    public ResponseEntity<Page<AdminNotification>> getNotifications(
            @RequestParam(required = false) Boolean unreadOnly,
            Pageable pageable) {
        
        if (Boolean.TRUE.equals(unreadOnly)) {
            return ResponseEntity.ok(repository.findByRead(false, pageable));
        }
        return ResponseEntity.ok(repository.findAll(pageable));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<AdminNotification> markAsRead(@PathVariable UUID id) {
        Optional<AdminNotification> notif = repository.findById(id);
        if (notif.isPresent()) {
            AdminNotification n = notif.get();
            n.setRead(true);
            return ResponseEntity.ok(repository.save(n));
        }
        return ResponseEntity.notFound().build();
    }
}
