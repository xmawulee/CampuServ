package com.knust.campusserv.support.controller;

import com.knust.campusserv.support.model.Notification;
import com.knust.campusserv.support.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

import org.springframework.lang.NonNull;

@RestController
@RequestMapping("/notifications")
public class NotificationController {

    @Autowired
    private NotificationRepository notificationRepository;

    @GetMapping
    public ResponseEntity<?> getUserNotifications(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(
                page, 
                size, 
                org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt")
        );
        org.springframework.data.domain.Page<Notification> paged = notificationRepository.findByUserId(userId, pageable);
        return ResponseEntity.ok(paged);
    }

    @PutMapping("/{id}/read")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> markAsRead(@PathVariable("id") @NonNull String id) {
        Optional<Notification> notifOpt = notificationRepository.findById(id);
        if (notifOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Notification not found.");
        }

        Notification notif = notifOpt.get();
        notif.setIsRead(true);
        notificationRepository.save(notif);
        return ResponseEntity.ok("Notification marked as read.");
    }

    @DeleteMapping("/{id}")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> deleteNotification(@PathVariable("id") @NonNull String id) {
        Optional<Notification> notifOpt = notificationRepository.findById(id);
        if (notifOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Notification not found.");
        }
        notificationRepository.delete(notifOpt.get());
        return ResponseEntity.ok("Notification deleted successfully.");
    }

    @PutMapping("/read-all")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> markAllAsRead(@RequestHeader("X-User-Id") String userId) {
        List<Notification> unread = notificationRepository.findByUserIdAndIsRead(userId, false);
        for (Notification notif : unread) {
            notif.setIsRead(true);
        }
        notificationRepository.saveAll(unread);
        return ResponseEntity.ok("All notifications marked as read.");
    }

    @DeleteMapping
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> clearAllNotifications(@RequestHeader("X-User-Id") String userId) {
        notificationRepository.deleteByUserId(userId);
        return ResponseEntity.ok("All notifications cleared.");
    }
}
