package com.knust.campusserv.request.controller;

import com.knust.campusserv.request.model.Offer;
import com.knust.campusserv.request.model.RequestAttachment;
import com.knust.campusserv.request.model.ServiceRequest;
import com.knust.campusserv.request.repository.OfferRepository;
import com.knust.campusserv.request.repository.RequestAttachmentRepository;
import com.knust.campusserv.request.repository.ServiceRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping({"/requests", "/internal/requests"})
public class RequestInternalController {

    @Autowired
    private ServiceRequestRepository serviceRequestRepository;

    @Autowired
    private OfferRepository offerRepository;

    @Autowired
    private RequestAttachmentRepository requestAttachmentRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @GetMapping("/active-count/{userId}")
    public ResponseEntity<Long> getActiveRequestsCount(@PathVariable String userId) {
        // Count non-terminal requests for this user (where user is the requester)
        long activeCount = serviceRequestRepository.findByRequesterId(userId).stream()
                .filter(req -> !("COMPLETED".equals(req.getStatus()) || 
                                 "CANCELLED".equals(req.getStatus())))
                .count();
        return ResponseEntity.ok(activeCount);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getRequestById(@PathVariable String id) {
        Optional<ServiceRequest> reqOpt = serviceRequestRepository.findById(id);
        if (reqOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        ServiceRequest req = reqOpt.get();

        Map<String, Object> resp = new HashMap<>();
        resp.put("id", req.getId());
        resp.put("requesterId", req.getRequesterId());
        resp.put("category", req.getCategory());
        resp.put("title", req.getTitle());
        resp.put("description", req.getDescription());
        resp.put("deadline", req.getDeadline());
        resp.put("location", req.getLocation());
        resp.put("serviceMode", req.getServiceMode());
        resp.put("status", req.getStatus());
        resp.put("createdAt", req.getCreatedAt());
        resp.put("updatedAt", req.getUpdatedAt());
        resp.put("budgetMin", req.getBudgetMin());
        resp.put("budgetMax", req.getBudgetMax());
        resp.put("timingType", req.getTimingType());
        resp.put("scheduledDate", req.getScheduledDate());
        resp.put("locationType", req.getLocationType());
        resp.put("locationDetail", req.getLocationDetail());
        resp.put("deliveryMode", req.getDeliveryMode());
        resp.put("bidWindowCloses", req.getBidWindowCloses());
        resp.put("escrowHeld", req.getEscrowHeld());
        resp.put("targetProviderId", req.getTargetProviderId());
        
        String targetProviderName = null;
        if (req.getTargetProviderId() != null && !req.getTargetProviderId().isEmpty()) {
            try {
                targetProviderName = jdbcTemplate.queryForObject(
                    "SELECT full_name FROM users WHERE id = ?",
                    String.class, req.getTargetProviderId()
                );
            } catch (Exception e) {
                targetProviderName = "Provider";
            }
        }
        resp.put("targetProviderName", targetProviderName);

        List<Offer> offers = offerRepository.findByRequestId(id);
        // Enrich each offer with provider profile details
        List<Map<String, Object>> enrichedOffers = new ArrayList<>();
        for (Offer offer : offers) {
            Map<String, Object> offerMap = new LinkedHashMap<>();
            offerMap.put("id", offer.getId());
            offerMap.put("requestId", offer.getRequestId());
            offerMap.put("providerId", offer.getProviderId());
            offerMap.put("price", offer.getPrice());
            offerMap.put("eta", offer.getEta());
            offerMap.put("message", offer.getMessage());
            offerMap.put("status", offer.getStatus());
            offerMap.put("createdAt", offer.getCreatedAt());
            offerMap.put("attachmentUrls", offer.getAttachmentUrls());

            // Look up provider details from users table
            try {
                Map<String, Object> providerRow = jdbcTemplate.queryForMap(
                    "SELECT full_name, email, profile_picture_url, rating, completed_jobs_count, is_verified " +
                    "FROM users WHERE id = ?",
                    offer.getProviderId()
                );
                offerMap.put("providerName", providerRow.get("full_name"));
                offerMap.put("providerAvatar", providerRow.get("profile_picture_url"));
                offerMap.put("providerRating", providerRow.get("rating") != null ? providerRow.get("rating") : 0);
                offerMap.put("providerIsVerified", Boolean.TRUE.equals(providerRow.get("is_verified")));

                // Get total review count for this provider
                try {
                    Integer reviewCount = jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM reviews WHERE reviewee_id = ? AND direction = 'REQUESTER_TO_PROVIDER'",
                        Integer.class, offer.getProviderId()
                    );
                    offerMap.put("providerTotalReviews", reviewCount != null ? reviewCount : 0);
                    offerMap.put("providerCompletedJobs", providerRow.get("completed_jobs_count") != null ? providerRow.get("completed_jobs_count") : 0);
                } catch (Exception e) {
                    offerMap.put("providerTotalReviews", 0);
                    offerMap.put("providerCompletedJobs", 0);
                }
            } catch (Exception e) {
                offerMap.put("providerName", "Provider");
                offerMap.put("providerAvatar", null);
                offerMap.put("providerRating", 0);
                offerMap.put("providerIsVerified", false);
                offerMap.put("providerTotalReviews", 0);
                offerMap.put("providerCompletedJobs", 0);
            }
            enrichedOffers.add(offerMap);
        }
        resp.put("offers", enrichedOffers);

        List<RequestAttachment> attachments = requestAttachmentRepository.findByServiceRequestId(id);
        resp.put("attachments", attachments);

        return ResponseEntity.ok(resp);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable String id, @RequestParam("status") String status) {
        return serviceRequestRepository.findById(id)
                .map(req -> {
                    req.setStatus(status);
                    req.setUpdatedAt(LocalDateTime.now());
                    serviceRequestRepository.save(req);
                    return ResponseEntity.ok(req);
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
