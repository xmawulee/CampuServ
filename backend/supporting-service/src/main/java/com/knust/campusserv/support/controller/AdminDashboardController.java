package com.knust.campusserv.support.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/admin/dashboard")
public class AdminDashboardController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @GetMapping("/stats")
    public ResponseEntity<?> getStats(@RequestHeader(value = "X-User-Role", required = false) String role) {
        if (!"ADMIN".equals(role)) {
            return ResponseEntity.status(403).body("Only admins can access dashboard stats.");
        }

        Map<String, Object> stats = new HashMap<>();

        // User stats
        stats.put("totalUser", jdbcTemplate.queryForObject("SELECT count(*) FROM users WHERE role = 'STUDENT'", Integer.class));
        stats.put("totalProviders", jdbcTemplate.queryForObject("SELECT count(*) FROM users WHERE role = 'PROVIDER'", Integer.class));
        stats.put("pendingVerifications", jdbcTemplate.queryForObject("SELECT count(*) FROM users WHERE verification_status = 'PENDING_VERIFICATION'", Integer.class));

        // Job/Request stats
        stats.put("activeJobs", jdbcTemplate.queryForObject("SELECT count(*) FROM jobs WHERE status IN ('ACTIVE', 'AWAITING_CODE', 'PROOF_SUBMITTED', 'IN_PROGRESS')", Integer.class));
        stats.put("completedJobs", jdbcTemplate.queryForObject("SELECT count(*) FROM jobs WHERE status = 'COMPLETED'", Integer.class));
        stats.put("pendingRequests", jdbcTemplate.queryForObject("SELECT count(*) FROM service_requests WHERE status = 'OPEN'", Integer.class));

        // Dispute stats
        stats.put("openDisputes", jdbcTemplate.queryForObject("SELECT count(*) FROM disputes WHERE status = 'OPEN'", Integer.class));

        // Finance stats
        stats.put("totalGMV", jdbcTemplate.queryForObject("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE status IN ('HELD', 'RELEASED')", Double.class));
        stats.put("pendingWithdrawals", jdbcTemplate.queryForObject("SELECT count(*) FROM provider_wallet_transactions WHERE type = 'WITHDRAWAL' AND status = 'PENDING'", Integer.class));

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/chart")
    public ResponseEntity<?> getChartData(@RequestHeader(value = "X-User-Role", required = false) String role) {
        if (!"ADMIN".equals(role)) {
            return ResponseEntity.status(403).body("Only admins can access dashboard chart.");
        }

        // Return mock or real chart data for the last 7 days
        // For simplicity, we just aggregate jobs created per day for the last 7 days
        String sql = "SELECT DATE(created_at) as date, count(*) as count FROM jobs WHERE created_at >= current_date - interval '7 days' GROUP BY DATE(created_at) ORDER BY DATE(created_at)";
        List<Map<String, Object>> rawData = jdbcTemplate.queryForList(sql);

        // Fill missing days
        List<Map<String, Object>> chartData = new ArrayList<>();
        // In a real implementation, you'd iterate the last 7 days and fill missing with 0
        return ResponseEntity.ok(rawData);
    }
}
