package com.knust.campusserv.user.messaging;

import com.knust.campusserv.user.model.*;
import com.knust.campusserv.user.repository.*;
import com.knust.campusserv.user.service.FileStorageService;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class UserDeletionConsumer {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProviderProfileRepository providerProfileRepository;

    @Autowired
    private ProviderServiceRepository providerServiceRepository;

    @Autowired
    private SavedListingRepository savedListingRepository;

    @Autowired
    private ListingReportRepository listingReportRepository;

    @Autowired
    private ProviderCategoryRatingRepository providerCategoryRatingRepository;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private RabbitTemplate rabbitTemplate;

    @RabbitListener(queues = "user-service.account.deletion")
    @Transactional
    public void handleAccountDeletion(Map<String, String> payload) {
        String userId = payload.get("userId");
        if (userId == null) return;

        System.out.println("[UserDeletionConsumer] Starting deletion processing for userId: " + userId);

        // 1. Delete associated profile pictures and portfolio photos from storage
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (user.getProfilePictureUrl() != null) {
                fileStorageService.deleteFile(user.getProfilePictureUrl());
            }
            if (user.getStudentIdPhotoUrl() != null) {
                fileStorageService.deleteFile(user.getStudentIdPhotoUrl());
            }
            if (user.getPortfolio() != null) {
                for (String url : user.getPortfolio()) {
                    fileStorageService.deleteFile(url);
                }
            }
        }

        // 2. Clear provider profile details and files if provider
        Optional<ProviderProfile> profileOpt = providerProfileRepository.findById(userId);
        if (profileOpt.isPresent()) {
            ProviderProfile profile = profileOpt.get();
            if (profile.getPortfolioUrls() != null && !profile.getPortfolioUrls().trim().isEmpty()) {
                String[] urls = profile.getPortfolioUrls().split(",");
                for (String url : urls) {
                    fileStorageService.deleteFile(url.trim());
                }
            }

            // Delete provider services
            List<ProviderService> services = providerServiceRepository.findByProviderId(userId);
            providerServiceRepository.deleteAll(services);

            // Delete category ratings
            List<ProviderCategoryRating> ratings = providerCategoryRatingRepository.findByProviderId(userId);
            providerCategoryRatingRepository.deleteAll(ratings);

            // Delete profile
            providerProfileRepository.delete(profile);
        }

        // 3. Clean up saved listings (bookmarks)
        List<SavedListing> savedByMe = savedListingRepository.findByStudentId(userId);
        savedListingRepository.deleteAll(savedByMe);

        List<SavedListing> savedOthersMe = savedListingRepository.findByProviderId(userId);
        savedListingRepository.deleteAll(savedOthersMe);

        // 4. Anonymize listing reports
        List<ListingReport> reportsSubmitted = listingReportRepository.findByReporterId(userId);
        for (ListingReport report : reportsSubmitted) {
            report.setReporterId("DELETED");
        }
        listingReportRepository.saveAll(reportsSubmitted);

        List<ListingReport> reportsAgainstMe = listingReportRepository.findByProviderId(userId);
        for (ListingReport report : reportsAgainstMe) {
            report.setProviderId("DELETED");
        }
        listingReportRepository.saveAll(reportsAgainstMe);

        System.out.println("[UserDeletionConsumer] Completed user-service cleanup for: " + userId);

        // 5. Send acknowledgment event
        Map<String, String> ack = new HashMap<>();
        ack.put("userId", userId);
        ack.put("serviceName", "user-service");
        rabbitTemplate.convertAndSend("account.deletion.acknowledgment", ack);
    }
}
