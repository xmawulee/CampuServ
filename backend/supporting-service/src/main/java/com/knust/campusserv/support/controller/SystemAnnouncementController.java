package com.knust.campusserv.support.controller;

import com.knust.campusserv.support.model.SystemAnnouncement;
import com.knust.campusserv.support.repository.SystemAnnouncementRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Sort;

import java.util.List;
import java.util.UUID;
import java.util.Map;

@RestController
public class SystemAnnouncementController {

    @Autowired
    private SystemAnnouncementRepository repository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @GetMapping("/announcements/active")
    public ResponseEntity<List<SystemAnnouncement>> getActiveAnnouncements() {
        return ResponseEntity.ok(repository.findByIsActiveTrueOrderByCreatedAtDesc());
    }

    @GetMapping("/admin/announcements")
    public ResponseEntity<List<SystemAnnouncement>> getAllAnnouncements() {
        return ResponseEntity.ok(repository.findAll(Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    @PostMapping("/admin/announcements")
    public ResponseEntity<?> createAnnouncement(@RequestBody Map<String, String> body) {
        SystemAnnouncement ann = new SystemAnnouncement();
        ann.setId("ann-" + UUID.randomUUID().toString());
        ann.setTitle(body.get("title"));
        ann.setMessage(body.get("message"));
        ann.setSeverity(body.getOrDefault("severity", "INFO"));
        ann.setIsActive(true);
        
        repository.save(ann);
        
        // Broadcast to all clients
        messagingTemplate.convertAndSend("/topic/announcements", ann);
        
        return ResponseEntity.ok(ann);
    }
    
    @PutMapping("/admin/announcements/{id}/deactivate")
    public ResponseEntity<?> deactivateAnnouncement(@PathVariable String id) {
        return repository.findById(id).map(ann -> {
            ann.setIsActive(false);
            repository.save(ann);
            return ResponseEntity.ok("Deactivated successfully.");
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/admin/announcements/{id}")
    public ResponseEntity<?> deleteAnnouncement(@PathVariable String id) {
        return repository.findById(id).map(ann -> {
            repository.delete(ann);
            return ResponseEntity.ok("Deleted successfully.");
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }
}
