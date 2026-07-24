package com.knust.campusserv.user.dto;

import com.knust.campusserv.user.model.ProviderService;
import java.math.BigDecimal;
import java.util.List;

public class UserProfileResponse {
    private String id;
    private String email;
    private String fullName;
    private String profilePictureUrl;
    private String role;
    private Boolean isVerified;
    private String studentIdPhotoUrl;
    
    // Provider specific details
    private String bio;
    private BigDecimal rating;
    private Integer completedJobsCount;
    private List<String> portfolio;
    private List<ProviderService> services;
    private String serviceCategory;
    private String whatsappNumber;

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getProfilePictureUrl() { return profilePictureUrl; }
    public void setProfilePictureUrl(String profilePictureUrl) { this.profilePictureUrl = profilePictureUrl; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public Boolean getIsVerified() { return isVerified; }
    public void setIsVerified(Boolean verified) { isVerified = verified; }

    public String getStudentIdPhotoUrl() { return studentIdPhotoUrl; }
    public void setStudentIdPhotoUrl(String studentIdPhotoUrl) { this.studentIdPhotoUrl = studentIdPhotoUrl; }

    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }

    public BigDecimal getRating() { return rating; }
    public void setRating(BigDecimal rating) { this.rating = rating; }

    public Integer getCompletedJobsCount() { return completedJobsCount; }
    public void setCompletedJobsCount(Integer completedJobsCount) { this.completedJobsCount = completedJobsCount; }

    public List<String> getPortfolio() { return portfolio; }
    public void setPortfolio(List<String> portfolio) { this.portfolio = portfolio; }

    public List<ProviderService> getServices() { return services; }
    public void setServices(List<ProviderService> services) { this.services = services; }

    public String getServiceCategory() { return serviceCategory; }
    public void setServiceCategory(String serviceCategory) { this.serviceCategory = serviceCategory; }

    public String getWhatsappNumber() { return whatsappNumber; }
    public void setWhatsappNumber(String whatsappNumber) { this.whatsappNumber = whatsappNumber; }
}
