package com.knust.campusserv.auth.messaging;

import com.knust.campusserv.auth.model.AccountDeletionTracker;
import com.knust.campusserv.auth.repository.AccountDeletionTrackerRepository;
import com.knust.campusserv.auth.repository.UserRepository;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;

@Service
public class AccountDeletionListener {

    @Autowired
    private AccountDeletionTrackerRepository trackerRepository;

    @Autowired
    private UserRepository userRepository;

    @RabbitListener(queues = "account.deletion.acknowledgment")
    @Transactional
    public void handleAcknowledgment(Map<String, String> payload) {
        String userId = payload.get("userId");
        String serviceName = payload.get("serviceName");

        if (userId == null || serviceName == null) return;

        System.out.println("[AccountDeletionListener] Received acknowledgment from " + serviceName + " for user " + userId);

        Optional<AccountDeletionTracker> trackerOpt = trackerRepository.findById(userId);
        if (trackerOpt.isPresent()) {
            AccountDeletionTracker tracker = trackerOpt.get();

            switch (serviceName) {
                case "user-service":
                    tracker.setUserSvcAck(true);
                    break;
                case "request-service":
                    tracker.setRequestSvcAck(true);
                    break;
                case "job-service":
                    tracker.setJobSvcAck(true);
                    break;
                case "payment-service":
                    tracker.setPaymentSvcAck(true);
                    break;
                case "supporting-service":
                    tracker.setSupportSvcAck(true);
                    break;
                default:
                    System.out.println("[AccountDeletionListener] Unknown service name: " + serviceName);
                    return;
            }

            trackerRepository.save(tracker);

            // Check if all services have completed their deletion steps
            if (tracker.isUserSvcAck() && tracker.isRequestSvcAck() && tracker.isJobSvcAck()
                    && tracker.isPaymentSvcAck() && tracker.isSupportSvcAck()) {
                
                System.out.println("[AccountDeletionListener] All services acknowledged. Completing deletion for: " + userId);
                
                // Hard delete from users table to release the email address and clear auth credentials
                userRepository.deleteById(userId);
                trackerRepository.delete(tracker);
                
                System.out.println("[AccountDeletionListener] Successfully completed permanent deletion for userId: " + userId);
            }
        }
    }
}
