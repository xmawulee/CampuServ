package com.knust.campusserv.support.service;

import com.knust.campusserv.support.model.Review;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class AutoReviewJob {

    @Autowired
    private ReviewService reviewService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    // Run every day at 2 AM
    @Scheduled(cron = "0 0 2 * * ?")
    public void generateAutoReviews() {
        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);

        // We use native query since jobs table is accessed directly or we fetch via REST.
        // The prompt says we can check completedAt < now() - 7 days.
        // Because supporting-service shares the DB, we can just do a native query.
        String sql = "SELECT j.id, j.requester_id, j.provider_id, r.category_id FROM jobs j " +
                     "LEFT JOIN requests r ON j.request_id = r.id " +
                     "WHERE j.status = 'COMPLETED' AND j.completed_at < ?";

        List<Map<String, Object>> completedJobs = jdbcTemplate.queryForList(sql, sevenDaysAgo);

        for (Map<String, Object> job : completedJobs) {
            String jobId = (String) job.get("id");
            String requesterId = (String) job.get("requester_id");
            String providerId = (String) job.get("provider_id");
            String categoryId = (String) job.get("category_id");
            java.util.List<String> tags = new java.util.ArrayList<>();

            // Check REQUESTER_TO_PROVIDER
            try {
                reviewService.submitReview(jobId, requesterId, providerId, 5, "Auto-generated 5-star review.", Review.ReviewDirection.REQUESTER_TO_PROVIDER, true, categoryId, tags);
            } catch (IllegalArgumentException e) {
                // Already exists, ignore
            }

            // Check PROVIDER_TO_REQUESTER
            try {
                reviewService.submitReview(jobId, providerId, requesterId, 5, "Auto-generated 5-star review.", Review.ReviewDirection.PROVIDER_TO_REQUESTER, true, categoryId, tags);
            } catch (IllegalArgumentException e) {
                // Already exists, ignore
            }
        }
    }
}
