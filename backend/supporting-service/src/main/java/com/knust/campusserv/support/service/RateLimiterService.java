package com.knust.campusserv.support.service;

import org.springframework.stereotype.Service;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Simple in-memory per-user token bucket rate limiter for STOMP chat sends.
 * Limits each user to MAX_MESSAGES_PER_WINDOW messages within WINDOW_MILLIS.
 * Not durable across restarts — acceptable for abuse prevention (not billing).
 */
@Service
public class RateLimiterService {

    private static final int MAX_MESSAGES_PER_WINDOW = 30;
    private static final long WINDOW_MILLIS = 60_000L; // 1 minute

    // userId → queue of timestamps of recent sends within the window
    private final ConcurrentHashMap<String, Deque<Long>> userSendLog = new ConcurrentHashMap<>();

    /**
     * Returns true if the user is allowed to send (within rate limit).
     * Returns false if the rate limit is exceeded.
     */
    public synchronized boolean isAllowed(String userId) {
        long now = System.currentTimeMillis();
        Deque<Long> timestamps = userSendLog.computeIfAbsent(userId, k -> new ArrayDeque<>());

        // Evict timestamps outside the current window
        while (!timestamps.isEmpty() && now - timestamps.peekFirst() > WINDOW_MILLIS) {
            timestamps.pollFirst();
        }

        if (timestamps.size() >= MAX_MESSAGES_PER_WINDOW) {
            return false;
        }

        timestamps.addLast(now);
        return true;
    }
}
