package com.knust.campusserv.user.messaging;

import com.knust.campusserv.user.model.ProviderProfile;
import com.knust.campusserv.user.repository.ProviderProfileRepository;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;

@Service
public class UserEventConsumer {

    @Autowired
    private ProviderProfileRepository providerProfileRepository;

    @RabbitListener(queues = "provider.verification")
    public void handleProviderVerificationEvent(Map<String, String> payload) {
        String providerId = payload.get("providerId");
        String status = payload.get("status");

        Optional<ProviderProfile> profileOpt = providerProfileRepository.findById(providerId);
        if (profileOpt.isPresent()) {
            ProviderProfile profile = profileOpt.get();
            profile.setApprovalStatus(status);
            
            if ("REJECTED".equals(status)) {
                profile.setRejectionReason(payload.get("reason"));
            }
            
            providerProfileRepository.save(profile);
            System.out.println("Updated ProviderProfile " + providerId + " approvalStatus to " + status);
        }
    }

    @RabbitListener(queues = "user.status.updated")
    public void handleUserStatusUpdatedEvent(Map<String, String> payload) {
        // auth-service publishes: userId and status (ACTIVE, SUSPENDED, BANNED)
        String userId = payload.get("userId");
        String status = payload.get("status");

        Optional<ProviderProfile> profileOpt = providerProfileRepository.findById(userId);
        if (profileOpt.isPresent()) {
            ProviderProfile profile = profileOpt.get();
            
            // Map the user's account status to the provider profile approval status
            if ("SUSPENDED".equals(status) || "BANNED".equals(status)) {
                profile.setApprovalStatus(status);
            } else if ("ACTIVE".equals(status) && ("SUSPENDED".equals(profile.getApprovalStatus()) || "BANNED".equals(profile.getApprovalStatus()))) {
                // If user is reactivated and was suspended/banned, we put them back to VERIFIED
                // This assumes only verified providers were active, which may not always be true,
                // but it's a safe fallback.
                profile.setApprovalStatus("VERIFIED"); 
            }
            
            providerProfileRepository.save(profile);
            System.out.println("Mapped User " + userId + " accountStatus " + status + " to ProviderProfile approvalStatus");
        }
    }

    @RabbitListener(queues = "provider.review.submitted")
    public void handleReviewSubmittedEvent(Map<String, Object> payload) {
        String providerId = (String) payload.get("providerId");
        Number ratingNum = (Number) payload.get("rating");
        if (providerId == null || ratingNum == null) return;

        int newRating = ratingNum.intValue();

        Optional<ProviderProfile> profileOpt = providerProfileRepository.findById(providerId);
        if (profileOpt.isPresent()) {
            ProviderProfile profile = profileOpt.get();
            int currentTotal = profile.getTotalReviews() != null ? profile.getTotalReviews() : 0;
            java.math.BigDecimal currentAvg = profile.getRating() != null ? profile.getRating() : java.math.BigDecimal.ZERO;

            // newAvg = (oldAvg * totalReviews + newRating) / (totalReviews + 1)
            java.math.BigDecimal newAvg = currentAvg.multiply(java.math.BigDecimal.valueOf(currentTotal))
                    .add(java.math.BigDecimal.valueOf(newRating))
                    .divide(java.math.BigDecimal.valueOf(currentTotal + 1), 2, java.math.RoundingMode.HALF_UP);

            profile.setRating(newAvg);
            profile.setTotalReviews(currentTotal + 1);

            providerProfileRepository.save(profile);
            System.out.println("Updated ProviderProfile " + providerId + " rating to " + newAvg + " (" + profile.getTotalReviews() + " reviews)");
        }
    }


}
