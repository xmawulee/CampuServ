package com.knust.campusserv.user.dto;

import com.knust.campusserv.user.model.ProviderService;
import java.math.BigDecimal;
import java.util.List;

public class ProviderResponse {
    private String providerId;
    private String fullName;
    private String email;
    private String bio;
    private BigDecimal rating;
    private Integer completedJobsCount;
    private List<String> portfolio;
    private List<ProviderService> services;
    private List<com.knust.campusserv.user.model.ProviderCategoryRating> categoryRatings;

    // Constructor
    public ProviderResponse(String providerId, String fullName, String email, String bio, BigDecimal rating, Integer completedJobsCount, List<String> portfolio, List<ProviderService> services, List<com.knust.campusserv.user.model.ProviderCategoryRating> categoryRatings) {
        this.providerId = providerId;
        this.fullName = fullName;
        this.email = email;
        this.bio = bio;
        this.rating = rating;
        this.completedJobsCount = completedJobsCount;
        this.portfolio = portfolio;
        this.services = services;
        this.categoryRatings = categoryRatings;
    }

    // Getters and Setters
    public String getProviderId() { return providerId; }
    public void setProviderId(String providerId) { this.providerId = providerId; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

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

    public List<com.knust.campusserv.user.model.ProviderCategoryRating> getCategoryRatings() { return categoryRatings; }
    public void setCategoryRatings(List<com.knust.campusserv.user.model.ProviderCategoryRating> categoryRatings) { this.categoryRatings = categoryRatings; }
}
