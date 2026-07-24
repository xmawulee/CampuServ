package com.knust.campusserv.support.controller;

import com.knust.campusserv.support.model.Review;
import com.knust.campusserv.support.repository.ReviewRepository;
import com.knust.campusserv.support.service.ReviewService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/reviews")
public class ReviewController {

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private ReviewService reviewService;

    @Autowired
    private RestTemplate restTemplate;

    @PostMapping("/{jobId}")
    public ResponseEntity<?> submitReview(@PathVariable("jobId") String jobId,
                                          @RequestBody Map<String, Object> body,
                                          @RequestHeader("X-User-Id") String currentUserId) {
        // Fetch job to ensure it's COMPLETED and get the other party
        try {
            Map<String, Object> job = restTemplate.getForObject("http://job-service/jobs/" + jobId, Map.class);
            if (job == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Job not found.");
            
            if (!"COMPLETED".equals(job.get("status"))) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("You can only review completed jobs.");
            }

            String requesterId = (String) job.get("requesterId");
            String providerId = (String) job.get("providerId");

            String directionStr = (String) body.get("direction");
            Review.ReviewDirection direction;
            try {
                direction = Review.ReviewDirection.valueOf(directionStr);
            } catch (Exception e) {
                return ResponseEntity.badRequest().body("Invalid direction.");
            }

            String reviewerId;
            String revieweeId;

            if (direction == Review.ReviewDirection.REQUESTER_TO_PROVIDER) {
                if (!currentUserId.equals(requesterId)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only requester can submit this review.");
                reviewerId = requesterId;
                revieweeId = providerId;
            } else {
                if (!currentUserId.equals(providerId)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only provider can submit this review.");
                reviewerId = providerId;
                revieweeId = requesterId;
            }

            Number ratingNum = (Number) body.get("rating");
            if (ratingNum == null || ratingNum.intValue() < 1 || ratingNum.intValue() > 5) {
                return ResponseEntity.badRequest().body("Valid rating (1-5) is required.");
            }

            String comment = (String) body.get("comment");
            List<String> tags = (List<String>) body.get("tags");

            String requestId = (String) job.get("requestId");
            String categoryId = null;
            try {
                Map<String, Object> req = restTemplate.getForObject("http://request-service/requests/" + requestId, Map.class);
                if (req != null) {
                    Map<String, Object> category = (Map<String, Object>) req.get("category");
                    if (category != null) {
                        categoryId = (String) category.get("id");
                    }
                }
            } catch (Exception e) {
                System.err.println("Could not fetch request details for categoryId: " + e.getMessage());
            }

            Review review = reviewService.submitReview(jobId, reviewerId, revieweeId, ratingNum.intValue(), comment, direction, false, categoryId, tags);
            return ResponseEntity.ok(review);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<Page<Review>> getUserReviews(
            @PathVariable("userId") String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(reviewRepository.findByRevieweeIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size)));
    }

    @GetMapping("/job/{jobId}")
    public ResponseEntity<List<Review>> getJobReviews(@PathVariable("jobId") String jobId) {
        return ResponseEntity.ok(reviewRepository.findByJobId(jobId));
    }

    @GetMapping("/all")
    public ResponseEntity<Page<Review>> getAllReviews(
            @RequestParam(required = false) Integer minRating,
            @RequestParam(required = false) Integer maxRating,
            @RequestParam(required = false) Boolean isAutoGenerated,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(reviewRepository.findAllWithFilters(minRating, maxRating, isAutoGenerated, PageRequest.of(page, size)));
    }
}
