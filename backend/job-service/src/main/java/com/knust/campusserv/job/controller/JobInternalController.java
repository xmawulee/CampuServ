package com.knust.campusserv.job.controller;

import com.knust.campusserv.job.repository.JobRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/internal/jobs")
public class JobInternalController {

    @Autowired
    private JobRepository jobRepository;

    @GetMapping("/active-count/{userId}")
    public ResponseEntity<Long> getActiveJobsCount(@PathVariable String userId) {
        // Count jobs for this user (either as requester or provider) that are not in terminal status
        // A terminal status is typically COMPLETED, CANCELLED, or DECLINED.
        long activeCount = jobRepository.findByUser(userId).stream()
                .filter(job -> !("COMPLETED".equals(job.getStatus()) || 
                                 "CANCELLED".equals(job.getStatus()) || 
                                 "DECLINED".equals(job.getStatus())))
                .count();
        return ResponseEntity.ok(activeCount);
    }
}
