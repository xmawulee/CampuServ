package com.knust.campusserv.request.controller;

import com.knust.campusserv.request.model.RequestAttachment;
import com.knust.campusserv.request.model.RequestLocation;
import com.knust.campusserv.request.model.ServiceCategory;
import com.knust.campusserv.request.model.ServiceRequest;
import com.knust.campusserv.request.repository.RequestAttachmentRepository;
import com.knust.campusserv.request.repository.RequestLocationRepository;
import com.knust.campusserv.request.repository.ServiceCategoryRepository;
import com.knust.campusserv.request.repository.ServiceRequestRepository;
import com.knust.campusserv.request.service.FileStorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping({"/requests", "/api/requests"})
public class RequestController {

    private static final Logger log = LoggerFactory.getLogger(RequestController.class);

    @Value("${services.supporting-service.url:http://supporting-service}")
    private String supportingServiceUrl;

    @Autowired
    private ServiceRequestRepository serviceRequestRepository;

    @Autowired
    private ServiceCategoryRepository serviceCategoryRepository;

    @Autowired
    private RequestLocationRepository requestLocationRepository;

    @Autowired
    private RequestAttachmentRepository requestAttachmentRepository;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @GetMapping("/eligible-providers")
    public ResponseEntity<?> getEligibleProviders(
            @RequestParam(value = "category", required = false) String categoryId) {

        String sql = "SELECT id, full_name, email, profile_picture_url, rating, completed_jobs_count, service_category " +
                     "FROM users " +
                     "WHERE (account_status IS NULL OR account_status = 'ACTIVE') " +
                     "  AND (is_verified = true) " +
                     "  AND (primary_role = 'PROVIDER' OR (secondary_role = 'PROVIDER' AND secondary_role_status = 'APPROVED') OR is_provider = true)";

        List<Map<String, Object>> rows;
        if (categoryId != null && !categoryId.trim().isEmpty()) {
            sql += " AND (service_category = ? OR service_category IS NULL)";
            rows = jdbcTemplate.queryForList(sql, categoryId.trim());
        } else {
            rows = jdbcTemplate.queryForList(sql);
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> r : rows) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", r.get("id"));
            item.put("fullName", r.get("full_name") != null ? r.get("full_name") : "Provider");
            item.put("email", r.get("email"));
            item.put("profilePictureUrl", r.get("profile_picture_url"));
            item.put("rating", r.get("rating") != null ? r.get("rating") : 5.0);
            item.put("completedJobsCount", r.get("completed_jobs_count") != null ? r.get("completed_jobs_count") : 0);
            item.put("serviceCategory", r.get("service_category"));
            result.add(item);
        }

        return ResponseEntity.ok(result);
    }

    @GetMapping
    public ResponseEntity<?> getAllRequests(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader) {

        if (userIdHeader != null && !userIdHeader.trim().isEmpty() && "PROVIDER".equalsIgnoreCase(userRoleHeader)) {
            String providerUserId = userIdHeader.trim();

            // Condition 2: Check provider account approval status (verification_status = 'APPROVED' or primary_role_verified = true)
            try {
                List<Map<String, Object>> userRows = jdbcTemplate.queryForList(
                    "SELECT account_status, is_verified, primary_role_verified, verification_status FROM users WHERE id = ?",
                    providerUserId
                );
                if (userRows.isEmpty()) {
                    return ResponseEntity.ok(Map.of("content", Collections.emptyList()));
                }
                Map<String, Object> u = userRows.get(0);
                String accountStatus = (String) u.get("account_status");
                Boolean primaryRoleVerified = (Boolean) u.get("primary_role_verified");
                String verificationStatus = (String) u.get("verification_status");

                if ("SUSPENDED".equalsIgnoreCase(accountStatus) || "BANNED".equalsIgnoreCase(accountStatus) || "DELETED".equalsIgnoreCase(accountStatus)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "RESTRICTED", "message", "Account is restricted."));
                }

                boolean isApproved = Boolean.TRUE.equals(primaryRoleVerified) || "APPROVED".equalsIgnoreCase(verificationStatus);
                if (!isApproved) {
                    // Pending or rejected providers MUST NOT see the open feed
                    return ResponseEntity.ok(Map.of("content", Collections.emptyList()));
                }
            } catch (Exception e) {
                log.warn("Failed to check provider approval status for {}: {}", providerUserId, e.getMessage());
                return ResponseEntity.ok(Map.of("content", Collections.emptyList()));
            }

            // Condition 1: Category match — query provider_services table for provider's opted categories
            List<String> providerCategoryIds;
            try {
                providerCategoryIds = jdbcTemplate.queryForList(
                    "SELECT category_id FROM provider_services WHERE provider_id = ?",
                    String.class, providerUserId);
            } catch (Exception e) {
                log.warn("Failed to fetch provider_services for {}: {}", providerUserId, e.getMessage());
                providerCategoryIds = Collections.emptyList();
            }

            // If provider has zero categories, return empty list (no fail-open)
            if (providerCategoryIds.isEmpty()) {
                return ResponseEntity.ok(Map.of("content", Collections.emptyList()));
            }

            // Filter open requests: status = 'OPEN', requester != provider, category in targetCategoryIds, and (target_provider_id IS NULL or target_provider_id = provider)
            final List<String> targetCategoryIds = providerCategoryIds;
            List<ServiceRequest> providerFeed = serviceRequestRepository.findAll().stream()
                    .filter(req -> "OPEN".equals(req.getStatus()))
                    .filter(req -> !providerUserId.equals(req.getRequesterId()))
                    .filter(req -> req.getCategory() != null && targetCategoryIds.contains(req.getCategory().getId()))
                    .filter(req -> req.getTargetProviderId() == null || providerUserId.equals(req.getTargetProviderId()))
                    .sorted((a, b) -> {
                        LocalDateTime ta = a.getCreatedAt() != null ? a.getCreatedAt() : LocalDateTime.MIN;
                        LocalDateTime tb = b.getCreatedAt() != null ? b.getCreatedAt() : LocalDateTime.MIN;
                        return tb.compareTo(ta);
                    })
                    .toList();

            return ResponseEntity.ok(Map.of("content", providerFeed));
        }

        // Unfiltered list for non-provider callers
        List<ServiceRequest> allOpen = serviceRequestRepository.findAll().stream()
                .filter(req -> "OPEN".equals(req.getStatus()))
                .toList();

        Map<String, Object> response = new HashMap<>();
        response.put("content", allOpen);
        return ResponseEntity.ok(response);
    }

    @PostMapping(consumes = {MediaType.MULTIPART_FORM_DATA_VALUE, MediaType.APPLICATION_FORM_URLENCODED_VALUE})
    public ResponseEntity<?> createRequest(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader,
            @RequestParam("categoryId") String categoryId,
            @RequestParam("title") String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam("budgetMin") String budgetMinStr,
            @RequestParam("budgetMax") String budgetMaxStr,
            @RequestParam(value = "timing", required = false) String timing,
            @RequestParam(value = "scheduledDate", required = false) String scheduledDateStr,
            @RequestParam(value = "locationType", required = false, defaultValue = "CHOOSE_LOCATION") String locationType,
            @RequestParam(value = "locationDetail", required = false) String locationDetail,
            @RequestParam(value = "deliveryMode", required = false, defaultValue = "broadcast") String deliveryMode,
            @RequestParam(value = "pickupLatitude", required = false) String pickupLatitudeStr,
            @RequestParam(value = "pickupLongitude", required = false) String pickupLongitudeStr,
            @RequestParam(value = "pickupAddress", required = false) String pickupAddress,
            @RequestParam(value = "pickupPlaceId", required = false) String pickupPlaceId,
            @RequestParam(value = "pickupLandmark", required = false) String pickupLandmark,
            @RequestParam(value = "locationMethod", required = false) String locationMethod,
            @RequestParam(value = "photos", required = false) List<MultipartFile> photos,
            @RequestParam(value = "targetProviderId", required = false) String targetProviderId) {

        if (userIdHeader == null || userIdHeader.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "UNAUTHORIZED", "message", "User identity header missing."));
        }
        if ("PROVIDER".equalsIgnoreCase(userRoleHeader)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "FORBIDDEN", "message", "Provider accounts are for offering services only and cannot create student requests."));
        }
        String requesterId = userIdHeader.trim();

        if (categoryId == null || categoryId.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "INVALID_CATEGORY", "message", "Please select a category."));
        }

        Optional<ServiceCategory> categoryOpt = serviceCategoryRepository.findById(categoryId.trim());
        if (categoryOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "INVALID_CATEGORY", "message", "Selected category does not exist."));
        }

        // Direct-hire category validation: if targetProviderId is specified, target provider MUST offer categoryId in provider_services
        if (targetProviderId != null && !targetProviderId.trim().isEmpty()) {
            try {
                Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM provider_services WHERE provider_id = ? AND category_id = ?",
                    Integer.class, targetProviderId.trim(), categoryId.trim());
                if (count == null || count == 0) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "INVALID_DIRECT_HIRE", "message", "Selected provider does not offer this service category."));
                }
            } catch (Exception e) {
                log.warn("Direct-hire category check failed for provider {} and category {}: {}", targetProviderId, categoryId, e.getMessage());
            }
        }

        if (title == null || title.trim().length() < 5 || title.trim().length() > 80) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "INVALID_TITLE", "message", "Title must be between 5 and 80 characters."));
        }

        // Budget validation
        BigDecimal budgetMin = new BigDecimal("10.00");
        try {
            if (budgetMinStr != null && !budgetMinStr.trim().isEmpty()) {
                budgetMin = new BigDecimal(budgetMinStr.trim());
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "INVALID_BUDGET", "message", "Please enter a valid base budget."));
        }

        BigDecimal budgetMax = budgetMin;
        try {
            if (budgetMaxStr != null && !budgetMaxStr.trim().isEmpty()) {
                budgetMax = new BigDecimal(budgetMaxStr.trim());
            }
        } catch (Exception ignored) {}

        // Location Mode Validation
        boolean isRemote = "REMOTE".equalsIgnoreCase(locationType);
        if (isRemote) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "REMOTE_NOT_SUPPORTED", "message", "Remote service mode is no longer supported. Please select On-site."));
        }

        if ((pickupAddress == null || pickupAddress.trim().isEmpty()) && (pickupLatitudeStr == null || pickupLongitudeStr == null)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "LOCATION_REQUIRED", "message", "Please choose a location for this request."));
        }

        ServiceRequest request = new ServiceRequest();
        request.setId("req-" + UUID.randomUUID().toString());
        request.setRequesterId(requesterId);
        request.setCategory(categoryOpt.get());
        request.setTitle(title.trim());
        request.setDescription(description != null ? description.trim() : "");
        request.setBudgetMin(budgetMin);
        request.setBudgetMax(budgetMax);
        request.setTimingType("asap"); // Deprecated default
        request.setLocationType(isRemote ? "REMOTE" : "CHOOSE_LOCATION");
        request.setLocationDetail(isRemote ? null : (locationDetail != null ? locationDetail.trim() : null));
        request.setDeliveryMode(deliveryMode != null ? deliveryMode : "broadcast");
        if ("targeted".equalsIgnoreCase(deliveryMode) && targetProviderId != null && !targetProviderId.trim().isEmpty()) {
            request.setTargetProviderId(targetProviderId.trim());
        }
        request.setStatus("OPEN");
        request.setServiceMode(isRemote ? "REMOTE" : "ON_SITE");
        request.setDeadline(LocalDateTime.now().plusDays(7));
        request.setCreatedAt(LocalDateTime.now());
        request.setUpdatedAt(LocalDateTime.now());

        if (!isRemote && pickupAddress != null && !pickupAddress.trim().isEmpty()) {
            request.setLocation(pickupAddress.trim());
        } else if (isRemote) {
            request.setLocation(null);
        }

        ServiceRequest savedRequest = serviceRequestRepository.save(request);

        // Handle Location Record (only if NOT remote)
        if (!isRemote && pickupLatitudeStr != null && pickupLongitudeStr != null) {
            try {
                RequestLocation location = new RequestLocation();
                location.setId("loc-" + UUID.randomUUID().toString());
                location.setRequestId(savedRequest.getId());
                location.setPickupLatitude(new BigDecimal(pickupLatitudeStr.trim()));
                location.setPickupLongitude(new BigDecimal(pickupLongitudeStr.trim()));
                location.setPickupAddress(pickupAddress != null ? pickupAddress.trim() : "Map Location");
                location.setPickupPlaceId(pickupPlaceId != null ? pickupPlaceId.trim() : null);
                location.setPickupLandmark(pickupLandmark != null ? pickupLandmark.trim() : null);
                location.setLocationMethod(locationMethod != null ? locationMethod.trim() : "manual_pin");
                requestLocationRepository.save(location);
            } catch (Exception e) {
                System.err.println("Failed to save request location: " + e.getMessage());
            }
        }

        // Handle Photos
        if (photos != null && !photos.isEmpty()) {
            for (MultipartFile photo : photos) {
                if (photo == null || photo.isEmpty()) continue;
                if (photo.getSize() > 5 * 1024 * 1024) {
                    return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(Map.of("error", "PHOTO_TOO_LARGE", "message", "One of your photos is larger than 5 MB."));
                }
                try {
                    String photoUrl = fileStorageService.storeFile(photo);
                    RequestAttachment attachment = new RequestAttachment();
                    attachment.setId("att-" + UUID.randomUUID().toString());
                    attachment.setServiceRequest(savedRequest);
                    attachment.setFileUrl(photoUrl);
                    attachment.setCreatedAt(LocalDateTime.now());
                    requestAttachmentRepository.save(attachment);
                } catch (Exception e) {
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "PHOTO_UPLOAD_FAILED", "message", "Failed to store attached photo: " + e.getMessage()));
                }
            }
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("id", savedRequest.getId());
        resp.put("requesterId", savedRequest.getRequesterId());
        resp.put("status", savedRequest.getStatus());
        resp.put("createdAt", savedRequest.getCreatedAt().toString());
        return ResponseEntity.status(HttpStatus.CREATED).body(resp);
    }

    @GetMapping("/mine")
    public ResponseEntity<?> getMyRequests(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestParam(value = "status", required = false, defaultValue = "active") String status,
            @RequestParam(value = "page", required = false, defaultValue = "0") int page,
            @RequestParam(value = "limit", required = false, defaultValue = "15") int limit) {

        if (userIdHeader == null || userIdHeader.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User identity header missing.");
        }

        List<String> statuses;
        if ("completed".equalsIgnoreCase(status)) {
            statuses = List.of("COMPLETED");
        } else if ("cancelled".equalsIgnoreCase(status)) {
            statuses = List.of("CANCELLED");
        } else {
            statuses = List.of("OPEN", "ASSIGNED", "IN_PROGRESS");
        }

        Page<ServiceRequest> requestPage = serviceRequestRepository.findByRequesterIdAndStatusIn(
                userIdHeader.trim(),
                statuses,
                PageRequest.of(page, limit, Sort.by(Sort.Direction.DESC, "createdAt"))
        );

        long activeCount = serviceRequestRepository.countByRequesterIdAndStatusIn(userIdHeader.trim(), List.of("OPEN", "ASSIGNED", "IN_PROGRESS"));
        long completedCount = serviceRequestRepository.countByRequesterIdAndStatusIn(userIdHeader.trim(), List.of("COMPLETED"));
        long cancelledCount = serviceRequestRepository.countByRequesterIdAndStatusIn(userIdHeader.trim(), List.of("CANCELLED"));

        Map<String, Object> response = new HashMap<>();
        response.put("requests", requestPage.getContent());
        response.put("counts", Map.of("active", activeCount, "completed", completedCount, "cancelled", cancelledCount));
        response.put("hasMore", requestPage.hasNext());
        response.put("nextPage", requestPage.hasNext() ? page + 1 : null);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{requestId}/location")
    public ResponseEntity<?> getRequestLocation(@PathVariable String requestId) {
        Optional<ServiceRequest> reqOpt = serviceRequestRepository.findById(requestId);
        if (reqOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "NOT_FOUND", "message", "Request not found."));
        }

        ServiceRequest req = reqOpt.get();

        // Check if REMOTE
        if ("REMOTE".equalsIgnoreCase(req.getLocationType())) {
            Map<String, Object> resp = new HashMap<>();
            resp.put("requestId", req.getId());
            resp.put("locationType", "REMOTE");
            resp.put("pickupAddress", "Remote / Online");
            return ResponseEntity.ok(resp);
        }

        // Query request_locations
        Optional<RequestLocation> locOpt = requestLocationRepository.findByRequestId(requestId);
        if (locOpt.isPresent()) {
            RequestLocation loc = locOpt.get();
            Map<String, Object> resp = new HashMap<>();
            resp.put("id", loc.getId());
            resp.put("requestId", loc.getRequestId());
            resp.put("pickupLatitude", loc.getPickupLatitude());
            resp.put("pickupLongitude", loc.getPickupLongitude());
            resp.put("pickupAddress", loc.getPickupAddress());
            resp.put("pickupPlaceId", loc.getPickupPlaceId());
            resp.put("pickupLandmark", loc.getPickupLandmark());
            resp.put("locationMethod", loc.getLocationMethod());
            return ResponseEntity.ok(resp);
        }

        // Fallback: check location text column on service_requests
        if (req.getLocation() != null && !req.getLocation().trim().isEmpty()) {
            Map<String, Object> resp = new HashMap<>();
            resp.put("requestId", req.getId());
            resp.put("pickupAddress", req.getLocation().trim());
            return ResponseEntity.ok(resp);
        }

        // If no location details available
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", "NO_LOCATION_DATA", "message", "No structured location details available for this request."));
    }

    @Autowired
    private com.knust.campusserv.request.repository.OfferRepository offerRepository;

    @Autowired
    private org.springframework.amqp.rabbit.core.RabbitTemplate rabbitTemplate;

    @Autowired
    private org.springframework.web.client.RestTemplate restTemplate;

    @PatchMapping("/{requestId}/cancel")
    public ResponseEntity<?> cancelRequest(
            @PathVariable String requestId,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {

        Optional<ServiceRequest> reqOpt = serviceRequestRepository.findById(requestId);
        if (reqOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "NOT_FOUND", "message", "Request not found."));
        }

        ServiceRequest request = reqOpt.get();

        // Only the requester can cancel their own request
        if (userId != null && !userId.trim().equals(request.getRequesterId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "FORBIDDEN", "message", "You can only cancel your own requests."));
        }

        // Only OPEN or ASSIGNED requests can be cancelled
        if (!"OPEN".equals(request.getStatus()) && !"ASSIGNED".equals(request.getStatus())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "INVALID_STATUS", "message", "Only OPEN or ASSIGNED requests can be cancelled. Current status: " + request.getStatus()));
        }

        String previousStatus = request.getStatus();
        request.setStatus("CANCELLED");
        request.setUpdatedAt(LocalDateTime.now());
        serviceRequestRepository.save(request);

        // Decline all pending offers for this request
        List<com.knust.campusserv.request.model.Offer> pendingOffers = offerRepository.findByRequestId(requestId);
        for (com.knust.campusserv.request.model.Offer offer : pendingOffers) {
            if ("PENDING".equals(offer.getStatus())) {
                offer.setStatus("DECLINED");
                offerRepository.save(offer);
            }
        }

        // If request was ASSIGNED (had escrow), trigger refund via payment-service
        if ("ASSIGNED".equals(previousStatus) && Boolean.TRUE.equals(request.getEscrowHeld())) {
            try {
                restTemplate.put("http://payment-service/payments/refund?jobId=" + requestId, null);
            } catch (Exception e) {
                System.err.println("Escrow refund failed for cancelled request " + requestId + ": " + e.getMessage());
            }
        }

        // Publish cancellation event
        Map<String, String> event = new HashMap<>();
        event.put("type", "request.cancelled");
        event.put("requestId", requestId);
        event.put("requesterId", request.getRequesterId());
        event.put("previousStatus", previousStatus);
        try {
            rabbitTemplate.convertAndSend("admin.notifications", "", event);
        } catch (Exception e) {
            System.err.println("Failed to publish cancellation event: " + e.getMessage());
        }

        return ResponseEntity.ok(Map.of("status", "CANCELLED", "requestId", requestId));
    }

    @PatchMapping("/{requestId}/counter-offer/accept")
    public ResponseEntity<?> acceptOffer(
            @PathVariable String requestId,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {

        Optional<ServiceRequest> reqOpt = serviceRequestRepository.findById(requestId);
        if (reqOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "NOT_FOUND", "message", "Request not found."));
        }

        ServiceRequest request = reqOpt.get();

        // Only the requester can accept offers on their request
        if (userId != null && !userId.trim().equals(request.getRequesterId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "FORBIDDEN", "message", "Only the requester can accept offers."));
        }

        if (!"OPEN".equals(request.getStatus())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "INVALID_STATUS", "message", "Request is not open for offers. Current status: " + request.getStatus()));
        }

        // Find the latest PENDING offer
        List<com.knust.campusserv.request.model.Offer> offers = offerRepository.findByRequestId(requestId);
        com.knust.campusserv.request.model.Offer latestPending = null;
        for (com.knust.campusserv.request.model.Offer o : offers) {
            if ("PENDING".equals(o.getStatus())) {
                if (latestPending == null || o.getCreatedAt().isAfter(latestPending.getCreatedAt())) {
                    latestPending = o;
                }
            }
        }

        if (latestPending == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "NO_PENDING_OFFER", "message", "No pending offer found to accept."));
        }

        // Lock escrow funds in payment-service (amount includes 5% service fee = bidPrice * 1.05)
        try {
            Map<String, Object> escrowPayload = new HashMap<>();
            escrowPayload.put("userId", request.getRequesterId());
            escrowPayload.put("jobId", requestId);
            // Total escrow = base price + 5% platform service fee
            java.math.BigDecimal escrowTotal = latestPending.getPrice()
                .multiply(new java.math.BigDecimal("1.05"))
                .setScale(2, java.math.RoundingMode.HALF_UP);
            escrowPayload.put("amount", escrowTotal);

            ResponseEntity<String> lockResp = restTemplate.postForEntity(
                "http://payment-service/payments/escrow/lock", escrowPayload, String.class);
            if (!lockResp.getStatusCode().is2xxSuccessful()) {
                return ResponseEntity.status(lockResp.getStatusCode()).body(lockResp.getBody());
            }
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            return ResponseEntity.status(e.getStatusCode()).body(e.getResponseBodyAsString());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Failed to secure escrow payment: " + e.getMessage());
        }

        // Accept this offer
        latestPending.setStatus("ACCEPTED");
        offerRepository.save(latestPending);

        // Decline all other pending offers for this request
        for (com.knust.campusserv.request.model.Offer o : offers) {
            if ("PENDING".equals(o.getStatus()) && !o.getId().equals(latestPending.getId())) {
                o.setStatus("DECLINED");
                offerRepository.save(o);
            }
        }

        // Update request to ASSIGNED
        request.setStatus("ASSIGNED");
        request.setEscrowHeld(true);
        request.setUpdatedAt(LocalDateTime.now());
        serviceRequestRepository.save(request);

        // Create job via job-service
        try {
            Map<String, Object> jobPayload = new HashMap<>();
            jobPayload.put("requestId", requestId);
            jobPayload.put("offerId", latestPending.getId());
            jobPayload.put("requesterId", request.getRequesterId());
            jobPayload.put("providerId", latestPending.getProviderId());
            jobPayload.put("serviceMode", request.getServiceMode());
            jobPayload.put("requestTitle", request.getTitle());
            jobPayload.put("requestDescription", request.getDescription());
            jobPayload.put("agreedPrice", latestPending.getPrice());
            jobPayload.put("locationAddress", request.getLocation());
            // Look up GPS coordinates from request_locations table
            Optional<RequestLocation> rlOpt = requestLocationRepository.findByRequestId(requestId);
            if (rlOpt.isPresent()) {
                RequestLocation rl = rlOpt.get();
                if (rl.getPickupLatitude() != null)  jobPayload.put("locationLat", rl.getPickupLatitude().doubleValue());
                if (rl.getPickupLongitude() != null) jobPayload.put("locationLng", rl.getPickupLongitude().doubleValue());
                if (rl.getPickupLandmark() != null)  jobPayload.put("locationHint", rl.getPickupLandmark());
                // Use the structured address from request_locations if available
                if (rl.getPickupAddress() != null)   jobPayload.put("locationAddress", rl.getPickupAddress());
            }

            restTemplate.postForEntity("http://job-service/jobs", jobPayload, Object.class);
        } catch (Exception e) {
            System.err.println("Job creation via job-service failed: " + e.getMessage());
        }

        // Publish offer-accepted event
        Map<String, Object> event = new HashMap<>();
        event.put("type", "offer.accepted");
        event.put("requestId", requestId);
        event.put("offerId", latestPending.getId());
        event.put("providerId", latestPending.getProviderId());
        event.put("requesterId", request.getRequesterId());
        event.put("agreedPrice", latestPending.getPrice());
        try {
            rabbitTemplate.convertAndSend("admin.notifications", "", event);
        } catch (Exception e) {
            System.err.println("Failed to publish offer-accepted event: " + e.getMessage());
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("status", "ASSIGNED");
        resp.put("finalBudget", latestPending.getPrice());
        resp.put("providerId", latestPending.getProviderId());
        resp.put("offerId", latestPending.getId());
        return ResponseEntity.ok(resp);
    }

    @PatchMapping("/{requestId}/counter-offer/decline")
    public ResponseEntity<?> declineOffer(
            @PathVariable String requestId,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {

        Optional<ServiceRequest> reqOpt = serviceRequestRepository.findById(requestId);
        if (reqOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "NOT_FOUND", "message", "Request not found."));
        }

        ServiceRequest request = reqOpt.get();

        // Only the requester can decline offers on their request
        if (userId != null && !userId.trim().equals(request.getRequesterId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "FORBIDDEN", "message", "Only the requester can decline offers."));
        }

        // Find the latest PENDING offer
        List<com.knust.campusserv.request.model.Offer> offers = offerRepository.findByRequestId(requestId);
        com.knust.campusserv.request.model.Offer latestPending = null;
        for (com.knust.campusserv.request.model.Offer o : offers) {
            if ("PENDING".equals(o.getStatus())) {
                if (latestPending == null || o.getCreatedAt().isAfter(latestPending.getCreatedAt())) {
                    latestPending = o;
                }
            }
        }

        if (latestPending == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "NO_PENDING_OFFER", "message", "No pending offer found to decline."));
        }

        // Decline the offer
        latestPending.setStatus("DECLINED");
        offerRepository.save(latestPending);

        // Keep request OPEN so other providers can still bid
        request.setUpdatedAt(LocalDateTime.now());
        serviceRequestRepository.save(request);

        // Publish offer-declined event
        Map<String, String> event = new HashMap<>();
        event.put("type", "offer.declined");
        event.put("requestId", requestId);
        event.put("offerId", latestPending.getId());
        event.put("providerId", latestPending.getProviderId());
        event.put("requesterId", request.getRequesterId());
        try {
            rabbitTemplate.convertAndSend("admin.notifications", "", event);
        } catch (Exception e) {
            System.err.println("Failed to publish offer-declined event: " + e.getMessage());
        }

        return ResponseEntity.ok(Map.of("status", "DECLINED", "offerId", latestPending.getId()));
    }

    // ── Per-offer accept/decline (used by the mobile app's RequestDetailsScreen) ──

    @PutMapping("/{requestId}/offers/{offerId}/accept")
    public ResponseEntity<?> acceptSpecificOffer(
            @PathVariable String requestId,
            @PathVariable String offerId,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {

        Optional<ServiceRequest> reqOpt = serviceRequestRepository.findById(requestId);
        if (reqOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Request not found.");
        }

        ServiceRequest request = reqOpt.get();
        if (userId != null && !userId.trim().equals(request.getRequesterId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only the requester can accept offers.");
        }
        if (!"OPEN".equals(request.getStatus())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Request is not open. Current status: " + request.getStatus());
        }

        Optional<com.knust.campusserv.request.model.Offer> offerOpt = offerRepository.findById(offerId);
        if (offerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Offer not found.");
        }

        com.knust.campusserv.request.model.Offer offer = offerOpt.get();
        if (!requestId.equals(offer.getRequestId())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Offer does not belong to this request.");
        }
        if (!"PENDING".equals(offer.getStatus())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Offer is not pending. Current status: " + offer.getStatus());
        }

        // Lock escrow funds in payment-service (amount includes 5% service fee = bidPrice * 1.05)
        try {
            Map<String, Object> escrowPayload = new HashMap<>();
            escrowPayload.put("userId", request.getRequesterId());
            escrowPayload.put("jobId", requestId);
            // Total escrow = base price + 5% platform service fee
            java.math.BigDecimal escrowTotal = offer.getPrice()
                .multiply(new java.math.BigDecimal("1.05"))
                .setScale(2, java.math.RoundingMode.HALF_UP);
            escrowPayload.put("amount", escrowTotal);

            ResponseEntity<String> lockResp = restTemplate.postForEntity(
                "http://payment-service/payments/escrow/lock", escrowPayload, String.class);
            if (!lockResp.getStatusCode().is2xxSuccessful()) {
                return ResponseEntity.status(lockResp.getStatusCode()).body(lockResp.getBody());
            }
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            return ResponseEntity.status(e.getStatusCode()).body(e.getResponseBodyAsString());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Failed to secure escrow payment: " + e.getMessage());
        }

        // Accept this offer
        offer.setStatus("ACCEPTED");
        offerRepository.save(offer);

        // Decline all other pending offers for this request
        List<com.knust.campusserv.request.model.Offer> others = offerRepository.findByRequestId(requestId);
        for (com.knust.campusserv.request.model.Offer o : others) {
            if ("PENDING".equals(o.getStatus()) && !o.getId().equals(offerId)) {
                o.setStatus("DECLINED");
                offerRepository.save(o);
            }
        }

        // Update request to ASSIGNED
        request.setStatus("ASSIGNED");
        request.setEscrowHeld(true);
        request.setUpdatedAt(LocalDateTime.now());
        serviceRequestRepository.save(request);

        // Create job via job-service
        try {
            Map<String, Object> jobPayload = new HashMap<>();
            jobPayload.put("requestId", requestId);
            jobPayload.put("offerId", offerId);
            jobPayload.put("requesterId", request.getRequesterId());
            jobPayload.put("providerId", offer.getProviderId());
            jobPayload.put("serviceMode", request.getServiceMode());
            jobPayload.put("requestTitle", request.getTitle());
            jobPayload.put("requestDescription", request.getDescription());
            jobPayload.put("agreedPrice", offer.getPrice());
            jobPayload.put("locationAddress", request.getLocation());
            // Look up GPS coordinates from request_locations table
            Optional<RequestLocation> rlOpt2 = requestLocationRepository.findByRequestId(requestId);
            if (rlOpt2.isPresent()) {
                RequestLocation rl2 = rlOpt2.get();
                if (rl2.getPickupLatitude() != null)  jobPayload.put("locationLat", rl2.getPickupLatitude().doubleValue());
                if (rl2.getPickupLongitude() != null) jobPayload.put("locationLng", rl2.getPickupLongitude().doubleValue());
                if (rl2.getPickupLandmark() != null)  jobPayload.put("locationHint", rl2.getPickupLandmark());
                if (rl2.getPickupAddress() != null)   jobPayload.put("locationAddress", rl2.getPickupAddress());
            }

            restTemplate.postForEntity("http://job-service/jobs", jobPayload, Object.class);
        } catch (Exception e) {
            System.err.println("Job creation via job-service failed: " + e.getMessage());
        }

        // Publish offer-accepted event
        Map<String, Object> event = new HashMap<>();
        event.put("type", "offer.accepted");
        event.put("requestId", requestId);
        event.put("offerId", offerId);
        event.put("providerId", offer.getProviderId());
        event.put("requesterId", request.getRequesterId());
        event.put("agreedPrice", offer.getPrice());
        try {
            rabbitTemplate.convertAndSend("admin.notifications", "", event);
        } catch (Exception e) {
            System.err.println("Failed to publish offer-accepted event: " + e.getMessage());
        }

        return ResponseEntity.ok("Offer accepted. Job created.");
    }

    @PutMapping("/{requestId}/offers/{offerId}/decline")
    public ResponseEntity<?> declineSpecificOffer(
            @PathVariable String requestId,
            @PathVariable String offerId,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {

        Optional<ServiceRequest> reqOpt = serviceRequestRepository.findById(requestId);
        if (reqOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Request not found.");
        }

        ServiceRequest request = reqOpt.get();
        if (userId != null && !userId.trim().equals(request.getRequesterId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only the requester can decline offers.");
        }

        Optional<com.knust.campusserv.request.model.Offer> offerOpt = offerRepository.findById(offerId);
        if (offerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Offer not found.");
        }

        com.knust.campusserv.request.model.Offer offer = offerOpt.get();
        if (!requestId.equals(offer.getRequestId())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Offer does not belong to this request.");
        }
        if (!"PENDING".equals(offer.getStatus())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Offer is not pending. Current status: " + offer.getStatus());
        }

        offer.setStatus("DECLINED");
        offerRepository.save(offer);

        request.setUpdatedAt(LocalDateTime.now());
        serviceRequestRepository.save(request);

        // Publish offer-declined event
        Map<String, String> event = new HashMap<>();
        event.put("type", "offer.declined");
        event.put("requestId", requestId);
        event.put("offerId", offerId);
        event.put("providerId", offer.getProviderId());
        event.put("requesterId", request.getRequesterId());
        try {
            rabbitTemplate.convertAndSend("admin.notifications", "", event);
        } catch (Exception e) {
            System.err.println("Failed to publish offer-declined event: " + e.getMessage());
        }

        return ResponseEntity.ok("Offer declined.");
    }

    // ── Provider Offer Submission & Withdrawal ──

    @PostMapping("/{requestId}/offers")
    public ResponseEntity<?> submitOffer(
            @PathVariable String requestId,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestParam("price") String priceStr,
            @RequestParam("eta") String eta,
            @RequestParam(value = "message", required = false) String message) {

        if (userId == null || userId.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "UNAUTHORIZED", "message", "User identity header missing."));
        }
        String providerId = userId.trim();

        // Defense in depth: verify email verification status directly in DB
        try {
            Boolean isVerified = jdbcTemplate.queryForObject(
                "SELECT is_verified FROM users WHERE id = ?", Boolean.class, providerId);
            if (Boolean.FALSE.equals(isVerified)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "EMAIL_UNVERIFIED", "message", "Email verification is required to submit an offer."));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", "EMAIL_UNVERIFIED", "message", "Email verification status check failed."));
        }

        Optional<ServiceRequest> reqOpt = serviceRequestRepository.findById(requestId);
        if (reqOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "NOT_FOUND", "message", "Request not found."));
        }

        ServiceRequest request = reqOpt.get();

        // ── PREVENT SELF-BIDDING (client_id == provider_id) ──
        if (providerId.equals(request.getRequesterId())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "SELF_BIDDING_NOT_ALLOWED", "message", "You cannot place a bid on your own request."));
        }

        if (!"OPEN".equals(request.getStatus())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "INVALID_STATUS", "message", "Request is no longer open for bidding. Current status: " + request.getStatus()));
        }

        // ── DIRECT-HIRE ENFORCEMENT: only the designated provider may bid ──
        if (request.getTargetProviderId() != null && !request.getTargetProviderId().isEmpty()) {
            if (!providerId.equals(request.getTargetProviderId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "DIRECT_HIRE_ONLY",
                                "message", "This is a direct-hire request. Only the specified provider may submit an offer."));
            }
        }

        BigDecimal price;
        try {
            price = new BigDecimal(priceStr.trim());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "INVALID_PRICE", "message", "Please enter a valid price."));
        }

        com.knust.campusserv.request.model.Offer offer = new com.knust.campusserv.request.model.Offer();
        offer.setId("off-" + UUID.randomUUID().toString());
        offer.setRequestId(requestId);
        offer.setProviderId(providerId);
        offer.setPrice(price);
        offer.setEta(eta != null ? eta.trim() : "ASAP");
        offer.setMessage(message != null ? message.trim() : "");
        offer.setStatus("PENDING");
        offer.setCreatedAt(LocalDateTime.now());

        com.knust.campusserv.request.model.Offer savedOffer = offerRepository.save(offer);

        return ResponseEntity.status(HttpStatus.CREATED).body(savedOffer);
    }

    @PutMapping("/{requestId}/offers/{offerId}/withdraw")
    public ResponseEntity<?> withdrawOffer(
            @PathVariable String requestId,
            @PathVariable String offerId,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {

        if (userId == null || userId.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "UNAUTHORIZED", "message", "User identity header missing."));
        }

        Optional<com.knust.campusserv.request.model.Offer> offerOpt = offerRepository.findById(offerId);
        if (offerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Offer not found.");
        }

        com.knust.campusserv.request.model.Offer offer = offerOpt.get();
        if (!requestId.equals(offer.getRequestId())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Offer does not belong to this request.");
        }
        if (!userId.trim().equals(offer.getProviderId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You can only withdraw your own offer.");
        }
        if (!"PENDING".equals(offer.getStatus())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Only pending offers can be withdrawn. Current status: " + offer.getStatus());
        }

        offer.setStatus("WITHDRAWN");
        offerRepository.save(offer);

        return ResponseEntity.ok(Map.of("status", "WITHDRAWN", "offerId", offerId));
    }

    // ── Distance Estimate ──────────────────────────────────────────────────────
    /**
     * GET /requests/{requestId}/distance-estimate?lat={providerLat}&lng={providerLng}
     *
     * Fetches the request's pickup coordinates from request_locations, then proxies
     * to supporting-service /location/distance-matrix to compute walking/driving
     * distance + ETA from the provider's current position to the pickup point.
     *
     * Error contract (never 500):
     *   404 – request not found
     *   422 – request has no pickup coordinates saved yet (REMOTE or location not set)
     *   502 – supporting-service call failed or returned non-OK
     *   200 – { distanceText, durationText, distanceValue, durationValue, mode }
     */
    @GetMapping("/{requestId}/distance-estimate")
    public ResponseEntity<?> getDistanceEstimate(
            @PathVariable String requestId,
            @RequestParam("lat") double providerLat,
            @RequestParam("lng") double providerLng) {
        try {
            // 1. Verify the request exists
            if (!serviceRequestRepository.existsById(requestId)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "NOT_FOUND", "message", "Request not found: " + requestId));
            }

            // 2. Look up pickup coordinates from request_locations
            Optional<RequestLocation> locOpt = requestLocationRepository.findByRequestId(requestId);
            if (locOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                        .body(Map.of("error", "NO_LOCATION",
                                "message", "No pickup location saved for this request yet."));
            }

            RequestLocation loc = locOpt.get();
            BigDecimal pickupLat = loc.getPickupLatitude();
            BigDecimal pickupLng = loc.getPickupLongitude();

            if (pickupLat == null || pickupLng == null) {
                return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                        .body(Map.of("error", "NO_COORDINATES",
                                "message", "Pickup coordinates not yet set for this request."));
            }

            // 3. Call supporting-service /location/distance-matrix
            String url = String.format(
                    "%s/location/distance-matrix?origin_lat=%f&origin_lng=%f&dest_lat=%f&dest_lng=%f&mode=walking",
                    supportingServiceUrl, providerLat, providerLng,
                    pickupLat.doubleValue(), pickupLng.doubleValue());

            @SuppressWarnings("unchecked")
            Map<String, Object> distResp = restTemplate.getForObject(url, Map.class);

            if (distResp == null) {
                log.error("distance-estimate: null response from supporting-service for requestId={}", requestId);
                return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                        .body(Map.of("error", "UPSTREAM_NULL", "message", "Distance service returned no data."));
            }

            // 4. Shape response to match mobile contract (adds 'mode' field)
            Map<String, Object> result = new LinkedHashMap<>(distResp);
            result.put("mode", "walking");
            return ResponseEntity.ok(result);

        } catch (org.springframework.web.client.HttpClientErrorException | org.springframework.web.client.HttpServerErrorException e) {
            log.error("distance-estimate: upstream HTTP error for requestId={}: {} {}",
                    requestId, e.getStatusCode(), e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", "UPSTREAM_ERROR",
                            "message", "Distance service returned an error: " + e.getStatusCode()));
        } catch (Exception e) {
            log.error("distance-estimate: unexpected error for requestId={}: {}", requestId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", "UPSTREAM_UNAVAILABLE",
                            "message", "Distance service temporarily unavailable."));
        }
    }
}
