package com.knust.campusserv.job.messaging;

import com.knust.campusserv.job.model.Job;
import com.knust.campusserv.job.repository.JobRepository;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class JobDeletionConsumer {

    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private RabbitTemplate rabbitTemplate;

    @RabbitListener(queues = "job-service.account.deletion")
    @Transactional
    public void handleAccountDeletion(Map<String, String> payload) {
        String userId = payload.get("userId");
        if (userId == null) return;

        System.out.println("[JobDeletionConsumer] Starting deletion processing for userId: " + userId);

        // Fetch all jobs involving this user (either as requester/student or provider)
        List<Job> userJobs = jobRepository.findByUser(userId);
        for (Job job : userJobs) {
            boolean modified = false;
            if (userId.equals(job.getRequesterId())) {
                job.setRequesterId("DELETED");
                modified = true;
            }
            if (userId.equals(job.getProviderId())) {
                job.setProviderId("DELETED");
                modified = true;
            }
            if (modified) {
                jobRepository.save(job);
            }
        }

        System.out.println("[JobDeletionConsumer] Completed job-service cleanup for: " + userId);

        // Send acknowledgment event
        Map<String, String> ack = new HashMap<>();
        ack.put("userId", userId);
        ack.put("serviceName", "job-service");
        rabbitTemplate.convertAndSend("account.deletion.acknowledgment", ack);
    }
}
