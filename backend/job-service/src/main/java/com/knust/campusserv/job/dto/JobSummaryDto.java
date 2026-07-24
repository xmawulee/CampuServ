package com.knust.campusserv.job.dto;

import java.util.List;
import com.knust.campusserv.job.model.Job;

public class JobSummaryDto {
    private JobBucket active;
    private JobBucket inProgress;
    private JobBucket completed;
    private JobBucket disputed;

    public JobSummaryDto(JobBucket active, JobBucket inProgress, JobBucket completed, JobBucket disputed) {
        this.active = active;
        this.inProgress = inProgress;
        this.completed = completed;
        this.disputed = disputed;
    }

    public JobBucket getActive() { return active; }
    public void setActive(JobBucket active) { this.active = active; }

    public JobBucket getInProgress() { return inProgress; }
    public void setInProgress(JobBucket inProgress) { this.inProgress = inProgress; }

    public JobBucket getCompleted() { return completed; }
    public void setCompleted(JobBucket completed) { this.completed = completed; }

    public JobBucket getDisputed() { return disputed; }
    public void setDisputed(JobBucket disputed) { this.disputed = disputed; }

    public static class JobBucket {
        private long count;
        private List<Job> jobs;

        public JobBucket(long count, List<Job> jobs) {
            this.count = count;
            this.jobs = jobs;
        }

        public long getCount() { return count; }
        public void setCount(long count) { this.count = count; }

        public List<Job> getJobs() { return jobs; }
        public void setJobs(List<Job> jobs) { this.jobs = jobs; }
    }
}
