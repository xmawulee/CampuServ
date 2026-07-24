package com.knust.campusserv.job.service;

import com.knust.campusserv.job.model.Job;
import com.knust.campusserv.job.repository.JobRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class JobScheduler {

    private static final Logger log = LoggerFactory.getLogger(JobScheduler.class);

    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private RabbitTemplate rabbitTemplate;

    @Scheduled(cron = "0 * * * * *")
    @Transactional
    public void autoReleaseSubmittedJobs() {
        LocalDateTime cutoff = LocalDateTime.now().minusHours(48);
        log.debug("JobScheduler: running check for PROOF_SUBMITTED jobs submitted before {}", cutoff);

        List<Job> expiredJobs = jobRepository.findByStatusAndUpdatedAtBefore("PROOF_SUBMITTED", cutoff);
        for (Job job : expiredJobs) {
            log.info("JobScheduler: auto-releasing job {} due to 48 hours of inactivity since proof submission", job.getId());
            
            job.setStatus("COMPLETED");
            job.setUpdatedAt(LocalDateTime.now());
            jobRepository.save(job);

            // 1. Trigger payment release in payment-service
            try {
                restTemplate.put("http://payment-service/payments/release?jobId=" + job.getId(), null);
                log.info("JobScheduler: successfully triggered payment release for job {}", job.getId());
            } catch (Exception e) {
                log.error("JobScheduler: failed to release payment in payment-service for job {}: {}", job.getId(), e.getMessage());
            }

            // 2. Update request-service status to COMPLETED
            try {
                restTemplate.put("http://request-service/requests/" + job.getRequestId() + "/status?status=COMPLETED", null);
                log.info("JobScheduler: successfully updated request status to COMPLETED for request {}", job.getRequestId());
            } catch (Exception e) {
                log.error("JobScheduler: failed to update request status in request-service for request {}: {}", job.getRequestId(), e.getMessage());
            }

            // 3. Publish status change event to RabbitMQ
            publishStatusChangeEvent(job);
        }
    }

    private void publishStatusChangeEvent(Job job) {
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("jobId", job.getId());
            event.put("requestId", job.getRequestId());
            event.put("status", job.getStatus());
            event.put("requesterId", job.getRequesterId());
            event.put("providerId", job.getProviderId());
            event.put("timestamp", System.currentTimeMillis());

            rabbitTemplate.convertAndSend("job-status-queue", event);
            log.info("JobScheduler: published status change event to RabbitMQ for job {}", job.getId());
        } catch (Exception e) {
            log.error("JobScheduler: failed to publish RabbitMQ event: {}", e.getMessage(), e);
        }
    }
}
