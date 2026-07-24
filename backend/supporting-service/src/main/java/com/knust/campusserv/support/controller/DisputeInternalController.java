package com.knust.campusserv.support.controller;

import com.knust.campusserv.support.repository.DisputeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/internal/disputes")
public class DisputeInternalController {

    @Autowired
    private DisputeRepository disputeRepository;

    @GetMapping("/active-count/{userId}")
    public ResponseEntity<Long> getActiveDisputesCount(@PathVariable String userId) {
        long activeCount = disputeRepository.findByRaisedById(userId).stream()
                .filter(d -> !("RESOLVED".equals(d.getStatus()) || "CLOSED".equals(d.getStatus())))
                .count();
        return ResponseEntity.ok(activeCount);
    }
}
