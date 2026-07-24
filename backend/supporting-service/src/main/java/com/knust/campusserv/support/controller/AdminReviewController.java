package com.knust.campusserv.support.controller;

import com.knust.campusserv.support.model.Review;
import com.knust.campusserv.support.repository.ReviewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/admin/reviews")
public class AdminReviewController {

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private RestTemplate restTemplate;

    private void logAudit(String adminId, String actionType, String targetEntity, String targetId, String reason) {
        try {
            Map<String, String> payload = new HashMap<>();
            payload.put("adminId", adminId);
            payload.put("actionType", actionType);
            payload.put("targetEntity", targetEntity);
            payload.put("targetId", targetId);
            payload.put("reason", reason);
            restTemplate.postForEntity("http://supporting-service/admin/audit", payload, Void.class);
        } catch (Exception e) {
            System.err.println("Failed to log audit event: " + e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<Page<Review>> getAllReviews(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestHeader(value = "X-User-Role", required = false) String role) {
        
        if (!"ADMIN".equals(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Page<Review> reviews = reviewRepository.findAll(PageRequest.of(page, size, Sort.by("createdAt").descending()));
        return ResponseEntity.ok(reviews);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteReview(
            @PathVariable String id,
            @RequestHeader(value = "X-User-Id", required = false) String adminId,
            @RequestHeader(value = "X-User-Role", required = false) String role) {

        if (!"ADMIN".equals(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Optional<Review> reviewOpt = reviewRepository.findById(id);
        if (reviewOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Review not found");
        }

        reviewRepository.deleteById(id);

        logAudit(adminId != null ? adminId : "SYSTEM", "DELETE_REVIEW", "REVIEW", id, "Review deleted by admin");

        return ResponseEntity.ok().build();
    }
}
