package com.knust.campusserv.auth.service;

import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LoginRateLimiterService {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int LOCKOUT_MINUTES = 15;

    private static class AttemptRecord {
        int count;
        LocalDateTime firstAttemptTime;
        LocalDateTime lockedUntil;

        AttemptRecord() {
            this.count = 1;
            this.firstAttemptTime = LocalDateTime.now();
        }
    }

    private final Map<String, AttemptRecord> attemptsMap = new ConcurrentHashMap<>();

    public boolean isBlocked(String key) {
        if (key == null || key.trim().isEmpty()) return false;
        String normalizedKey = key.trim().toLowerCase();
        AttemptRecord record = attemptsMap.get(normalizedKey);
        if (record == null) return false;

        if (record.lockedUntil != null) {
            if (LocalDateTime.now().isBefore(record.lockedUntil)) {
                return true;
            } else {
                // Lockout period expired; reset counter
                attemptsMap.remove(normalizedKey);
                return false;
            }
        }

        // Clean up window if past lockout duration
        if (record.firstAttemptTime.plusMinutes(LOCKOUT_MINUTES).isBefore(LocalDateTime.now())) {
            attemptsMap.remove(normalizedKey);
            return false;
        }

        return false;
    }

    public void recordFailedAttempt(String key) {
        if (key == null || key.trim().isEmpty()) return;
        String normalizedKey = key.trim().toLowerCase();

        attemptsMap.compute(normalizedKey, (k, record) -> {
            if (record == null || record.firstAttemptTime.plusMinutes(LOCKOUT_MINUTES).isBefore(LocalDateTime.now())) {
                return new AttemptRecord();
            }
            record.count++;
            if (record.count >= MAX_FAILED_ATTEMPTS) {
                record.lockedUntil = LocalDateTime.now().plusMinutes(LOCKOUT_MINUTES);
            }
            return record;
        });
    }

    public void resetAttempts(String key) {
        if (key == null || key.trim().isEmpty()) return;
        attemptsMap.remove(key.trim().toLowerCase());
    }
}
