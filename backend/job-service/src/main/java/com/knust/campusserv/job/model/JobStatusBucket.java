package com.knust.campusserv.job.model;

import java.util.Arrays;
import java.util.List;

public enum JobStatusBucket {
    ACTIVE(Arrays.asList("ACTIVE", "ACCEPTED")),
    IN_PROGRESS(Arrays.asList("EN_ROUTE", "IN_PROGRESS", "AWAITING_CODE")),
    COMPLETED(Arrays.asList("PROOF_SUBMITTED", "COMPLETED", "AWAITING_PAYMENT", "CANCELLED")),
    DISPUTED(Arrays.asList("DISPUTED"));

    private final List<String> statuses;

    JobStatusBucket(List<String> statuses) {
        this.statuses = statuses;
    }

    public List<String> getStatuses() {
        return statuses;
    }

    public static List<String> expand(String bucketOrStatus) {
        for (JobStatusBucket bucket : values()) {
            if (bucket.name().equalsIgnoreCase(bucketOrStatus)) {
                return bucket.getStatuses();
            }
        }
        return Arrays.asList(bucketOrStatus); // fallback to literal status
    }
}
