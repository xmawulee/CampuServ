package com.knust.campusserv.user.controller;

import com.knust.campusserv.user.dto.UserProfileResponse;
import com.knust.campusserv.user.model.User;
import com.knust.campusserv.user.model.ProviderService;
import com.knust.campusserv.user.model.ServiceCategory;
import com.knust.campusserv.user.repository.UserRepository;
import com.knust.campusserv.user.repository.ProviderServiceRepository;
import com.knust.campusserv.user.repository.ServiceCategoryRepository;
import com.knust.campusserv.user.repository.ProviderProfileRepository;
import com.knust.campusserv.user.model.ProviderProfile;
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

import java.math.BigDecimal;
import java.net.MalformedURLException;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.List;
import java.util.UUID;

@RestController
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProviderServiceRepository providerServiceRepository;

    @Autowired
    private ServiceCategoryRepository serviceCategoryRepository;

    @Autowired
    private ProviderProfileRepository providerProfileRepository;

    @Autowired
    private FileStorageService fileStorageService;

    @GetMapping({"/api/users/providers", "/users/providers"})
    public ResponseEntity<?> getProviders(
        @RequestParam(required = false) String category,
        @RequestParam(required = false) String name,
        @RequestParam(defaultValue = "0.0") Double minRating,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size,
        @RequestParam(defaultValue = "rating") String sort
    ) {
        org.springframework.data.domain.Sort.Direction direction = org.springframework.data.domain.Sort.Direction.DESC;
        String sortProp = sort;
        if (sort.startsWith("-")) {
            direction = org.springframework.data.domain.Sort.Direction.ASC;
            sortProp = sort.substring(1);
        }
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size, org.springframework.data.domain.Sort.by(direction, sortProp));
        
        org.springframework.data.domain.Page<User> providers = userRepository.searchProviders(
                category != null && !category.trim().isEmpty() ? category.trim() : null,
                name != null && !name.trim().isEmpty() ? name.trim() : null,
                minRating,
                pageable
        );

        Map<String, Object> response = new HashMap<>();
        response.put("content", providers.getContent());
        response.put("totalElements", providers.getTotalElements());
        response.put("totalPages", providers.getTotalPages());
        response.put("currentPage", providers.getNumber());

        return ResponseEntity.ok(response);
    }

    @GetMapping({"/api/users/providers/{providerId}", "/users/providers/{providerId}"})
    public ResponseEntity<?> getProviderProfile(@PathVariable String providerId) {
        Optional<User> userOpt = userRepository.findById(providerId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Provider not found.");
        }
        User user = userOpt.get();
        boolean isProv = "PROVIDER".equalsIgnoreCase(user.getPrimaryRole()) 
                || ("PROVIDER".equalsIgnoreCase(user.getSecondaryRole()) && "APPROVED".equalsIgnoreCase(user.getSecondaryRoleStatus()));
        if (!isProv) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("User is not an approved provider.");
        }
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

        Optional<ProviderProfile> profileOpt = providerProfileRepository.findById(providerId);
        if (profileOpt.isPresent()) {
            resp.setWhatsappNumber(profileOpt.get().getWhatsappNumber());
        }

        List<ProviderService> services = providerServiceRepository.findByProviderId(providerId);
        resp.setServices(services);

        return ResponseEntity.ok(resp);
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
        if (body.containsKey("bio")) {
            user.setBio((String) body.get("bio"));
        }
        if (body.containsKey("serviceCategory")) {
            user.setServiceCategory((String) body.get("serviceCategory"));
        }

        if (body.containsKey("whatsappNumber")) {
            Optional<ProviderProfile> profileOpt = providerProfileRepository.findById(userId);
            if (profileOpt.isPresent()) {
                ProviderProfile profile = profileOpt.get();
                profile.setWhatsappNumber((String) body.get("whatsappNumber"));
                providerProfileRepository.save(profile);
            }
        }

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

        // Prevent duplicate listing for the same provider + category
        List<ProviderService> existing = providerServiceRepository.findByProviderId(providerId);
        for (ProviderService ps : existing) {
            if (ps.getCategory().getId().equals(categoryId)) {
                ps.setBasePrice(basePrice);
                providerServiceRepository.save(ps);
                return ResponseEntity.ok(ps);
            }
        }

        ProviderService ps = new ProviderService();
        ps.setId("srv-" + UUID.randomUUID().toString());
        ps.setProviderId(providerId);
        ps.setCategory(categoryOpt.get());
        ps.setBasePrice(basePrice);
        ps.setCreatedAt(java.time.LocalDateTime.now());
        
        providerServiceRepository.save(ps);
        return ResponseEntity.status(HttpStatus.CREATED).body(ps);
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
}
