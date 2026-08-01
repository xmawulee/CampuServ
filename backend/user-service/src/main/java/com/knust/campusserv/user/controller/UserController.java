package com.knust.campusserv.user.controller;

import com.knust.campusserv.user.dto.UserProfileResponse;
import com.knust.campusserv.user.model.User;
import com.knust.campusserv.user.model.ProviderService;
import com.knust.campusserv.user.model.ServiceCategory;
import com.knust.campusserv.user.repository.UserRepository;
import com.knust.campusserv.user.repository.ProviderServiceRepository;
import com.knust.campusserv.user.repository.ServiceCategoryRepository;
import com.knust.campusserv.user.repository.ProviderProfileRepository;
import com.knust.campusserv.user.repository.SavedListingRepository;
import com.knust.campusserv.user.repository.ListingReportRepository;
import com.knust.campusserv.user.model.ProviderProfile;
import com.knust.campusserv.user.model.SavedListing;
import com.knust.campusserv.user.model.ListingReport;
import com.knust.campusserv.user.service.FileStorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.net.MalformedURLException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

    @Autowired
    private ProviderServiceRepository providerServiceRepository;

    @Autowired
    private ServiceCategoryRepository serviceCategoryRepository;

    @Autowired
    private ProviderProfileRepository providerProfileRepository;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private SavedListingRepository savedListingRepository;

    @Autowired
    private ListingReportRepository listingReportRepository;

    private UserProfileResponse mapToUserProfileResponse(User user, String currentUserId) {
        UserProfileResponse resp = new UserProfileResponse();
        resp.setId(user.getId());
        resp.setEmail(user.getEmail());
        resp.setFullName(user.getFullName());
        resp.setProfilePictureUrl(user.getProfilePictureUrl());
        resp.setRole(user.getRole());
        resp.setIsVerified(user.getIsVerified());
        resp.setBio(user.getBio());
        resp.setRating(user.getRating() != null ? BigDecimal.valueOf(user.getRating()) : BigDecimal.ZERO);
        resp.setCompletedJobsCount(user.getCompletedJobsCount() != null ? user.getCompletedJobsCount() : 0);
        resp.setServiceCategory(user.getServiceCategory());
        List<String> portList = user.getPortfolio() != null ? new ArrayList<>(user.getPortfolio()) : new ArrayList<>();
        Optional<ProviderProfile> profileOpt = providerProfileRepository.findById(user.getId());
        if (profileOpt.isPresent()) {
            ProviderProfile pp = profileOpt.get();
            resp.setWhatsappNumber(pp.getWhatsappNumber());
            resp.setViewCount(pp.getViewCount());
            resp.setKeyServices(pp.getKeyServices());
            resp.setNotifyNewRequests(pp.getNotifyNewRequests());
            if ((portList == null || portList.isEmpty()) && pp.getPortfolioUrls() != null && !pp.getPortfolioUrls().trim().isEmpty()) {
                portList = Arrays.stream(pp.getPortfolioUrls().split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .collect(Collectors.toList());
            }
            if (pp.getApprovedAt() != null) {
                resp.setApprovedAt(pp.getApprovedAt().toString());
            }
            if (pp.getCreatedAt() != null) {
                resp.setCreatedAt(pp.getCreatedAt().toString());
            }
        }
        resp.setPortfolio(portList);

        List<ProviderService> services = providerServiceRepository.findByProviderId(user.getId());
        resp.setServices(services);

        if (resp.getPortfolio() != null && !resp.getPortfolio().isEmpty()) {
            resp.setHeroImageUrl(resp.getPortfolio().get(0));
        } else {
            resp.setHeroImageUrl(null);
        }

        BigDecimal minPrice = null;
        if (services != null && !services.isEmpty()) {
            for (ProviderService ps : services) {
                if (ps.getBasePrice() != null) {
                    if (minPrice == null || ps.getBasePrice().compareTo(minPrice) < 0) {
                        minPrice = ps.getBasePrice();
                    }
                }
            }
        }
        if (minPrice != null && minPrice.compareTo(BigDecimal.ZERO) > 0) {
            resp.setBasePrice(minPrice);
            resp.setPriceOrQuote("GHS " + minPrice.toString());
        } else {
            resp.setBasePrice(BigDecimal.ZERO);
            resp.setPriceOrQuote("Contact for quote");
        }

        if (currentUserId != null && !currentUserId.trim().isEmpty()) {
            resp.setIsSaved(savedListingRepository.existsByStudentIdAndProviderId(currentUserId.trim(), user.getId()));
        } else {
            resp.setIsSaved(false);
        }

        resp.setLocation("Campus Area");
        resp.setAvailabilityStatus("Available");

        return resp;
    }

    @GetMapping({"/api/users/providers", "/users/providers"})
    public ResponseEntity<?> getProviders(
        @RequestParam(required = false) String category,
        @RequestParam(required = false) List<String> categories,
        @RequestParam(required = false) String name,
        @RequestParam(defaultValue = "0.0") Double minRating,
        @RequestParam(required = false) Boolean verified,
        @RequestParam(required = false) BigDecimal minPrice,
        @RequestParam(required = false) BigDecimal maxPrice,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size,
        @RequestParam(defaultValue = "discover") String sort,
        @RequestHeader(value = "X-User-Id", required = false) String currentUserId
    ) {
        // Build category filter list
        List<String> activeCategories = new ArrayList<>();
        if (categories != null && !categories.isEmpty()) {
            for (String cat : categories) {
                if (cat != null && !cat.trim().isEmpty()) {
                    activeCategories.addAll(Arrays.stream(cat.split(","))
                            .map(String::trim)
                            .filter(c -> !c.isEmpty())
                            .collect(Collectors.toList()));
                }
            }
        }
        if (activeCategories.isEmpty() && category != null && !category.trim().isEmpty()) {
            activeCategories.add(category.trim());
        }

        // Construct dynamic JPQL
        StringBuilder queryBuilder = new StringBuilder(" FROM User u LEFT JOIN ProviderProfile pp ON pp.id = u.id WHERE ");
        queryBuilder.append("(u.role = 'PROVIDER' OR u.primaryRole = 'PROVIDER' OR (u.secondaryRole = 'PROVIDER' AND u.secondaryRoleStatus IN ('APPROVED', 'VERIFIED'))) ");
        queryBuilder.append("AND (u.accountStatus IS NULL OR u.accountStatus = 'ACTIVE') ");
        queryBuilder.append("AND (EXISTS (SELECT ppp FROM ProviderProfile ppp WHERE ppp.id = u.id AND ppp.approvalStatus IN ('APPROVED', 'VERIFIED')) OR u.secondaryRoleStatus IN ('APPROVED', 'VERIFIED')) ");

        Map<String, Object> params = new HashMap<>();

        if (!activeCategories.isEmpty()) {
            queryBuilder.append("AND (EXISTS (SELECT ps FROM ProviderService ps WHERE ps.providerId = u.id AND (LOWER(ps.category.id) IN :categories OR LOWER(ps.category.name) IN :categories)) OR LOWER(u.serviceCategory) IN :categories) ");
            params.put("categories", activeCategories.stream().map(String::toLowerCase).collect(Collectors.toList()));
        }

        if (name != null && !name.trim().isEmpty()) {
            queryBuilder.append("AND (LOWER(u.fullName) LIKE :searchName OR LOWER(u.bio) LIKE :searchName OR LOWER(u.serviceCategory) LIKE :searchName OR EXISTS (SELECT ppp FROM ProviderProfile ppp WHERE ppp.id = u.id AND (LOWER(ppp.bio) LIKE :searchName OR EXISTS (SELECT ks FROM ppp.keyServices ks WHERE LOWER(ks) LIKE :searchName)))) ");
            params.put("searchName", "%" + name.trim().toLowerCase() + "%");
        }

        if (minRating != null && minRating > 0.0) {
            queryBuilder.append("AND (u.rating >= :minRating) ");
            params.put("minRating", minRating);
        }

        if (Boolean.TRUE.equals(verified)) {
            queryBuilder.append("AND (u.isVerified = true OR u.primaryRoleVerified = true) ");
        }

        if (minPrice != null) {
            queryBuilder.append("AND EXISTS (SELECT ps FROM ProviderService ps WHERE ps.providerId = u.id AND ps.basePrice >= :minPrice) ");
            params.put("minPrice", minPrice);
        }

        if (maxPrice != null) {
            queryBuilder.append("AND EXISTS (SELECT ps FROM ProviderService ps WHERE ps.providerId = u.id AND ps.basePrice <= :maxPrice) ");
            params.put("maxPrice", maxPrice);
        }

        // Count total elements
        String countJpql = "SELECT COUNT(u) " + queryBuilder.toString();
        jakarta.persistence.Query countQuery = entityManager.createQuery(countJpql);
        for (Map.Entry<String, Object> entry : params.entrySet()) {
            countQuery.setParameter(entry.getKey(), entry.getValue());
        }
        long totalElements = ((Number) countQuery.getSingleResult()).longValue();

        // Append Sorting
        if ("rating".equalsIgnoreCase(sort)) {
            queryBuilder.append("ORDER BY u.rating DESC, u.id ASC");
        } else if ("jobs".equalsIgnoreCase(sort)) {
            queryBuilder.append("ORDER BY u.completedJobsCount DESC, u.id ASC");
        } else if ("newest".equalsIgnoreCase(sort)) {
            queryBuilder.append("ORDER BY pp.createdAt DESC, u.id ASC");
        } else if ("price_asc".equalsIgnoreCase(sort) || "price-low".equalsIgnoreCase(sort)) {
            queryBuilder.append("ORDER BY (SELECT MIN(ps.basePrice) FROM ProviderService ps WHERE ps.providerId = u.id) ASC, u.id ASC");
        } else if ("price_desc".equalsIgnoreCase(sort) || "price-high".equalsIgnoreCase(sort)) {
            queryBuilder.append("ORDER BY (SELECT MAX(ps.basePrice) FROM ProviderService ps WHERE ps.providerId = u.id) DESC, u.id ASC");
        } else {
            // default / discover: stable pseudorandom mixed category interleaving
            queryBuilder.append("ORDER BY u.id ASC");
        }

        // Execute query
        String selectJpql = "SELECT u " + queryBuilder.toString();
        jakarta.persistence.Query selectQuery = entityManager.createQuery(selectJpql);
        for (Map.Entry<String, Object> entry : params.entrySet()) {
            selectQuery.setParameter(entry.getKey(), entry.getValue());
        }
        selectQuery.setFirstResult(page * size);
        selectQuery.setMaxResults(size);

        @SuppressWarnings("unchecked")
        List<User> userList = selectQuery.getResultList();

        List<UserProfileResponse> content = userList.stream()
                .map(u -> mapToUserProfileResponse(u, currentUserId))
                .collect(Collectors.toList());

        long totalPages = (long) Math.ceil((double) totalElements / size);

        Map<String, Object> response = new HashMap<>();
        response.put("content", content);
        response.put("totalElements", totalElements);
        response.put("totalPages", totalPages);
        response.put("currentPage", page);

        return ResponseEntity.ok(response);
    }

    @Transactional
    @GetMapping({"/api/users/providers/{providerId}", "/users/providers/{providerId}"})
    public ResponseEntity<?> getProviderProfile(@PathVariable String providerId, @RequestHeader(value = "X-User-Id", required = false) String currentUserId) {
        Optional<User> userOpt = userRepository.findById(providerId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Provider not found.");
        }
        User user = userOpt.get();
        boolean isProv = "PROVIDER".equalsIgnoreCase(user.getRole())
                || "PROVIDER".equalsIgnoreCase(user.getPrimaryRole()) 
                || ("PROVIDER".equalsIgnoreCase(user.getSecondaryRole()) && ("APPROVED".equalsIgnoreCase(user.getSecondaryRoleStatus()) || "VERIFIED".equalsIgnoreCase(user.getSecondaryRoleStatus())));
        if (!isProv) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("User is not an approved provider.");
        }

        Optional<ProviderProfile> profileOpt = providerProfileRepository.findById(providerId);
        if (profileOpt.isPresent()) {
            ProviderProfile pp = profileOpt.get();
            // Atomic increment avoids read-modify-write race under concurrent requests
            providerProfileRepository.incrementViewCount(providerId);
            pp.setViewCount((pp.getViewCount() == null ? 0 : pp.getViewCount()) + 1);
        }

        return ResponseEntity.ok(mapToUserProfileResponse(user, currentUserId));
    }

    @PostMapping({"/api/users/providers/{id}/save", "/users/providers/{id}/save"})
    public ResponseEntity<?> toggleSaveListing(@PathVariable String id, @RequestHeader(value = "X-User-Id", required = false) String currentUserId) {
        if (currentUserId == null || currentUserId.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required to save listings."));
        }
        String studentId = currentUserId.trim();
        if (!userRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Provider not found."));
        }
        Optional<SavedListing> existing = savedListingRepository.findByStudentIdAndProviderId(studentId, id);
        if (existing.isPresent()) {
            savedListingRepository.delete(existing.get());
            return ResponseEntity.ok(Map.of("saved", false, "message", "Listing removed from saved items."));
        } else {
            savedListingRepository.save(new SavedListing(studentId, id));
            return ResponseEntity.ok(Map.of("saved", true, "message", "Listing saved successfully."));
        }
    }

    @PostMapping({"/api/users/providers/{id}/report", "/users/providers/{id}/report"})
    public ResponseEntity<?> reportListing(@PathVariable String id, @RequestBody Map<String, String> payload, @RequestHeader(value = "X-User-Id", required = false) String currentUserId) {
        if (currentUserId == null || currentUserId.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required to report listings."));
        }
        String reporterId = currentUserId.trim();
        String reason = payload.get("reason");
        String details = payload.get("details");
        if (reason == null || reason.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Reason is required."));
        }
        if (listingReportRepository.existsByProviderIdAndReporterIdAndStatus(id, reporterId, "PENDING")) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "You already have a pending report against this provider."));
        }
        ListingReport report = new ListingReport(id, reporterId, reason.trim(), details);
        listingReportRepository.save(report);
        return ResponseEntity.ok(Map.of("message", "Report submitted successfully. We will review it shortly."));
    }

    @GetMapping({"/api/users/providers/{id}/listings", "/users/providers/{id}/listings"})
    public ResponseEntity<?> getProviderListings(@PathVariable String id, @RequestHeader(value = "X-User-Id", required = false) String currentUserId) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Provider not found."));
        }
        UserProfileResponse resp = mapToUserProfileResponse(userOpt.get(), currentUserId);
        return ResponseEntity.ok(Map.of("provider", resp, "services", resp.getServices()));
    }

    @GetMapping({"/api/users/{userId}", "/users/{userId}"})
    public ResponseEntity<?> getUserProfile(@PathVariable String userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found.");
        }
        User user = userOpt.get();
        UserProfileResponse resp = new UserProfileResponse();
        resp.setId(user.getId());
        resp.setEmail(user.getEmail());
        resp.setFullName(user.getFullName());
        resp.setProfilePictureUrl(user.getProfilePictureUrl());
        resp.setRole(user.getRole());
        resp.setIsVerified(user.getIsVerified());
        resp.setBio(user.getBio());
        resp.setRating(user.getRating() != null ? BigDecimal.valueOf(user.getRating()) : BigDecimal.ZERO);
        resp.setCompletedJobsCount(user.getCompletedJobsCount() != null ? user.getCompletedJobsCount() : 0);
        resp.setPortfolio(user.getPortfolio());
        resp.setServiceCategory(user.getServiceCategory());

        Optional<ProviderProfile> profileOpt = providerProfileRepository.findById(userId);
        if (profileOpt.isPresent()) {
            resp.setWhatsappNumber(profileOpt.get().getWhatsappNumber());
        }

        List<ProviderService> services = providerServiceRepository.findByProviderId(userId);
        resp.setServices(services);

        return ResponseEntity.ok(resp);
    }

    @PutMapping({"/api/users/{userId}/profile", "/users/{userId}/profile"})
    public ResponseEntity<?> updateProfile(@PathVariable String userId, @RequestBody Map<String, Object> body) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found.");
        }
        User user = userOpt.get();
        if (body.containsKey("fullName")) {
            String newName = (String) body.get("fullName");
            if (user.getFullName() != null && !user.getFullName().trim().isEmpty()) {
                if (newName == null || !user.getFullName().trim().equals(newName.trim())) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Full name cannot be altered once the account is created.");
                }
            } else {
                user.setFullName(newName);
            }
        }
        updateProviderProfileFields(userId, body);

        userRepository.save(user);
        return ResponseEntity.ok(user);
    }

    @PatchMapping({"/api/users/{userId}/category", "/users/{userId}/category"})
    public ResponseEntity<?> updateCategory(
            @PathVariable String userId,
            @RequestBody Map<String, String> body) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found.");
        }
        User user = userOpt.get();
        String serviceCategory = body.get("serviceCategory");
        user.setServiceCategory(serviceCategory);
        userRepository.save(user);
        return ResponseEntity.ok(user);
    }

    @PostMapping({"/api/users/providers/{providerId}/services", "/users/providers/{providerId}/services", "/providers/{providerId}/services"})
    public ResponseEntity<?> createProviderService(
            @PathVariable String providerId,
            @RequestBody Map<String, Object> body) {
        
        String categoryId = (String) body.get("categoryId");
        BigDecimal basePrice = new BigDecimal(body.get("basePrice").toString());

        if (categoryId == null) {
            return ResponseEntity.badRequest().body("categoryId is required.");
        }

        Optional<ServiceCategory> categoryOpt = serviceCategoryRepository.findById(categoryId);
        if (categoryOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Service Category not found.");
        }

        Optional<User> userOpt = userRepository.findById(providerId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            String approvedCat = user.getServiceCategory();
            if (approvedCat == null || approvedCat.trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You do not have any approved service categories. Please contact support.");
            }
            ServiceCategory targetCat = categoryOpt.get();
            boolean matches = approvedCat.equalsIgnoreCase(targetCat.getName()) 
                || approvedCat.equalsIgnoreCase(targetCat.getId()) 
                || Arrays.stream(approvedCat.split(",")).anyMatch(c -> c.trim().equalsIgnoreCase(targetCat.getName()) || c.trim().equalsIgnoreCase(targetCat.getId()));
            if (!matches) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You are approved strictly for category: " + approvedCat + ". You cannot create listings for " + targetCat.getName() + ".");
            }
        }



        ProviderService ps = new ProviderService();
        ps.setId("srv-" + UUID.randomUUID().toString());
        ps.setProviderId(providerId);
        ps.setCategory(categoryOpt.get());
        ps.setBasePrice(basePrice);
        ps.setCreatedAt(java.time.LocalDateTime.now());

        // Per-listing independent fields
        if (body.containsKey("title") && body.get("title") != null) {
            ps.setTitle(body.get("title").toString());
        }
        if (body.containsKey("description") && body.get("description") != null) {
            ps.setDescription(body.get("description").toString());
        }
        if (body.containsKey("keyServices") && body.get("keyServices") != null) {
            Object ksObj = body.get("keyServices");
            if (ksObj instanceof List) {
                ps.setListingKeyServices(((List<?>) ksObj).stream().map(Object::toString).collect(java.util.stream.Collectors.joining(",")));
            } else if (ksObj instanceof String) {
                ps.setListingKeyServices((String) ksObj);
            }
        }
        if (body.containsKey("portfolio") && body.get("portfolio") != null) {
            Object portObj = body.get("portfolio");
            if (portObj instanceof List) {
                ps.setListingPortfolio(((List<?>) portObj).stream().map(Object::toString).collect(java.util.stream.Collectors.joining(",")));
            } else if (portObj instanceof String) {
                ps.setListingPortfolio((String) portObj);
            }
        }

        providerServiceRepository.save(ps);
        updateProviderProfileFields(providerId, body);
        return ResponseEntity.status(HttpStatus.CREATED).body(ps);
    }

    @PutMapping({"/api/users/providers/{providerId}/services/{serviceId}", "/users/providers/{providerId}/services/{serviceId}", "/providers/{providerId}/services/{serviceId}"})
    public ResponseEntity<?> updateProviderService(
            @PathVariable String providerId,
            @PathVariable String serviceId,
            @RequestBody Map<String, Object> body) {
        Optional<ProviderService> psOpt = providerServiceRepository.findById(serviceId);
        if (psOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Service listing not found.");
        }
        ProviderService ps = psOpt.get();
        if (!ps.getProviderId().equals(providerId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Not authorized to modify this listing.");
        }
        if (body.containsKey("basePrice") && body.get("basePrice") != null) {
            ps.setBasePrice(new BigDecimal(body.get("basePrice").toString()));
        }
        if (body.containsKey("categoryId") && body.get("categoryId") != null) {
            String categoryId = (String) body.get("categoryId");
            Optional<ServiceCategory> categoryOpt = serviceCategoryRepository.findById(categoryId);
            if (categoryOpt.isPresent()) {
                ServiceCategory targetCat = categoryOpt.get();
                Optional<User> userOpt = userRepository.findById(providerId);
                if (userOpt.isPresent()) {
                    User user = userOpt.get();
                    String approvedCat = user.getServiceCategory();
                    if (approvedCat == null || approvedCat.trim().isEmpty()) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You do not have any approved service categories. Please contact support.");
                    }
                    boolean matches = approvedCat.equalsIgnoreCase(targetCat.getName()) 
                        || approvedCat.equalsIgnoreCase(targetCat.getId()) 
                        || Arrays.stream(approvedCat.split(",")).anyMatch(c -> c.trim().equalsIgnoreCase(targetCat.getName()) || c.trim().equalsIgnoreCase(targetCat.getId()));
                    if (!matches) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You are approved strictly for category: " + approvedCat + ". You cannot change listing category to " + targetCat.getName() + ".");
                    }
                }
                ps.setCategory(targetCat);
            }
        }
        // Per-listing independent fields update
        if (body.containsKey("title") && body.get("title") != null) {
            ps.setTitle(body.get("title").toString());
        }
        if (body.containsKey("description") && body.get("description") != null) {
            ps.setDescription(body.get("description").toString());
        }
        if (body.containsKey("keyServices") && body.get("keyServices") != null) {
            Object ksObj = body.get("keyServices");
            if (ksObj instanceof List) {
                ps.setListingKeyServices(((List<?>) ksObj).stream().map(Object::toString).collect(java.util.stream.Collectors.joining(",")));
            } else if (ksObj instanceof String) {
                ps.setListingKeyServices((String) ksObj);
            }
        }
        if (body.containsKey("portfolio") && body.get("portfolio") != null) {
            Object portObj = body.get("portfolio");
            if (portObj instanceof List) {
                ps.setListingPortfolio(((List<?>) portObj).stream().map(Object::toString).collect(java.util.stream.Collectors.joining(",")));
            } else if (portObj instanceof String) {
                ps.setListingPortfolio((String) portObj);
            }
        }

        providerServiceRepository.save(ps);
        updateProviderProfileFields(providerId, body);
        return ResponseEntity.ok(ps);
    }

    private void updateProviderProfileFields(String userId, Map<String, Object> body) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (body.containsKey("bio") && body.get("bio") != null) {
                user.setBio((String) body.get("bio"));
            }
            if (body.containsKey("portfolio") && body.get("portfolio") != null) {
                Object portObj = body.get("portfolio");
                List<String> portList = new ArrayList<>();
                if (portObj instanceof List) {
                    for (Object o : (List<?>) portObj) {
                        if (o != null) portList.add(o.toString());
                    }
                } else if (portObj instanceof String) {
                    String str = (String) portObj;
                    if (!str.trim().isEmpty()) {
                        for (String s : str.split(",")) {
                            if (!s.trim().isEmpty()) portList.add(s.trim());
                        }
                    }
                }
                user.setPortfolio(portList);
            }
            userRepository.save(user);
        }

        Optional<ProviderProfile> profileOpt = providerProfileRepository.findById(userId);
        ProviderProfile profile = profileOpt.orElseGet(() -> {
            ProviderProfile pp = new ProviderProfile();
            pp.setId(userId);
            return pp;
        });
        if (body.containsKey("bio") && body.get("bio") != null) {
            profile.setBio((String) body.get("bio"));
        }
        if (body.containsKey("whatsappNumber") && body.get("whatsappNumber") != null) {
            profile.setWhatsappNumber((String) body.get("whatsappNumber"));
        }
        if (body.containsKey("notifyNewRequests") && body.get("notifyNewRequests") != null) {
            profile.setNotifyNewRequests((Boolean) body.get("notifyNewRequests"));
        }
        if (body.containsKey("keyServices") && body.get("keyServices") != null) {
            Object ksObj = body.get("keyServices");
            List<String> ksList = new ArrayList<>();
            if (ksObj instanceof List) {
                for (Object o : (List<?>) ksObj) {
                    if (o != null && !o.toString().trim().isEmpty()) ksList.add(o.toString().trim());
                }
            } else if (ksObj instanceof String) {
                String str = (String) ksObj;
                if (!str.trim().isEmpty()) {
                    for (String s : str.split(",")) {
                        if (!s.trim().isEmpty()) ksList.add(s.trim());
                    }
                }
            }
            profile.setKeyServices(ksList);
        }
        if (body.containsKey("portfolio") && body.get("portfolio") != null) {
            Object portObj = body.get("portfolio");
            List<String> portList = new ArrayList<>();
            if (portObj instanceof List) {
                for (Object o : (List<?>) portObj) {
                    if (o != null) portList.add(o.toString());
                }
            } else if (portObj instanceof String) {
                String str = (String) portObj;
                if (!str.trim().isEmpty()) {
                    for (String s : str.split(",")) {
                        if (!s.trim().isEmpty()) portList.add(s.trim());
                    }
                }
            }
            profile.setPortfolioUrls(String.join(",", portList));
        }
        profile.setUpdatedAt(java.time.LocalDateTime.now());
        providerProfileRepository.save(profile);
    }

    @DeleteMapping({"/api/users/providers/{providerId}/services/{serviceId}", "/users/providers/{providerId}/services/{serviceId}", "/providers/{providerId}/services/{serviceId}"})
    public ResponseEntity<?> deleteProviderService(
            @PathVariable String providerId,
            @PathVariable String serviceId) {
        Optional<ProviderService> psOpt = providerServiceRepository.findById(serviceId);
        if (psOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Service listing not found.");
        }
        ProviderService ps = psOpt.get();
        if (!ps.getProviderId().equals(providerId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Not authorized to delete this listing.");
        }
        providerServiceRepository.delete(ps);
        return ResponseEntity.ok(Map.of("success", true, "message", "Service listing deleted successfully."));
    }

    @PatchMapping({"/api/users/{userId}/avatar", "/users/{userId}/avatar"})
    public ResponseEntity<?> uploadAvatar(
            @PathVariable String userId, 
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "avatar", required = false) MultipartFile avatar) {
        
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found.");
        }
        User user = userOpt.get();
        
        MultipartFile uploadFile = (file != null) ? file : avatar;
        if (uploadFile == null || uploadFile.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("File parameter 'file' or 'avatar' is required.");
        }
        
        if (user.getProfilePictureUrl() != null) {
            fileStorageService.deleteFile(user.getProfilePictureUrl());
        }

        String avatarUrl = fileStorageService.storeFile(uploadFile);
        user.setProfilePictureUrl(avatarUrl);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("avatarUrl", avatarUrl));
    }

    /** Serve uploaded files (profile pictures etc.) — accessible publicly via GET /users/files/{filename} */
    @GetMapping({"/users/files/{filename:.+}", "/api/users/files/{filename:.+}"})
    public ResponseEntity<Resource> serveFile(@PathVariable String filename) {
        try {
            Path filePath = fileStorageService.resolveFilePath(filename);
            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                return ResponseEntity.notFound().build();
            }
            String contentType = "application/octet-stream";
            String lower = filename.toLowerCase();
            if (lower.endsWith(".png")) contentType = "image/png";
            else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) contentType = "image/jpeg";
            else if (lower.endsWith(".webp")) contentType = "image/webp";
            else if (lower.endsWith(".gif")) contentType = "image/gif";
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                    .body(resource);
        } catch (MalformedURLException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping({"/api/users/{userId}/avatar", "/users/{userId}/avatar"})
    public ResponseEntity<?> deleteAvatar(@PathVariable String userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found.");
        }
        User user = userOpt.get();
        if (user.getProfilePictureUrl() != null) {
            fileStorageService.deleteFile(user.getProfilePictureUrl());
            user.setProfilePictureUrl(null);
            userRepository.save(user);
        }
        return ResponseEntity.ok().build();
    }

    @Transactional
    @PostMapping({"/api/users/{userId}/portfolio", "/users/{userId}/portfolio"})
    public ResponseEntity<?> uploadPortfolioPhoto(
            @PathVariable String userId,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "photo", required = false) MultipartFile photo) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found.");
        }
        User user = userOpt.get();
        MultipartFile uploadFile = (file != null) ? file : photo;
        if (uploadFile == null || uploadFile.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("File parameter 'file' or 'photo' is required.");
        }
        String photoUrl = fileStorageService.storeFile(uploadFile);
        List<String> portfolio = user.getPortfolio() != null ? new ArrayList<>(user.getPortfolio()) : new ArrayList<>();
        portfolio.add(photoUrl);
        user.setPortfolio(portfolio);
        userRepository.save(user);

        Optional<ProviderProfile> profileOpt = providerProfileRepository.findById(userId);
        if (profileOpt.isPresent()) {
            ProviderProfile profile = profileOpt.get();
            profile.setPortfolioUrls(String.join(",", portfolio));
            providerProfileRepository.save(profile);
        }

        return ResponseEntity.ok(Map.of("url", photoUrl, "portfolio", portfolio));
    }

    @Transactional
    @DeleteMapping({"/api/users/{userId}/portfolio", "/users/{userId}/portfolio"})
    public ResponseEntity<?> deletePortfolioPhoto(
            @PathVariable String userId,
            @RequestParam("url") String url) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found.");
        }
        User user = userOpt.get();
        List<String> portfolio = user.getPortfolio() != null ? new ArrayList<>(user.getPortfolio()) : new ArrayList<>();
        if (portfolio.remove(url)) {
            fileStorageService.deleteFile(url);
            user.setPortfolio(portfolio);
            userRepository.save(user);

            Optional<ProviderProfile> profileOpt = providerProfileRepository.findById(userId);
            if (profileOpt.isPresent()) {
                ProviderProfile profile = profileOpt.get();
                profile.setPortfolioUrls(String.join(",", portfolio));
                providerProfileRepository.save(profile);
            }
        }
        return ResponseEntity.ok(Map.of("success", true, "portfolio", portfolio));
    }
}
