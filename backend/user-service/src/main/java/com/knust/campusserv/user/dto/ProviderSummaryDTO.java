package com.knust.campusserv.user.dto;

import java.math.BigDecimal;

public class ProviderSummaryDTO {

    private String providerId;
    private String name;
    private String profilePhotoUrl;
    private BigDecimal averageRating;
    private Integer totalReviews;
    private Boolean verified;
    private Integer completedJobsCount;

    public ProviderSummaryDTO() {
    }

    public ProviderSummaryDTO(String providerId, String name, String profilePhotoUrl, BigDecimal averageRating, Integer totalReviews, Boolean verified, Integer completedJobsCount) {
        this.providerId = providerId;
        this.name = name;
        this.profilePhotoUrl = profilePhotoUrl;
        this.averageRating = averageRating;
        this.totalReviews = totalReviews;
        this.verified = verified;
        this.completedJobsCount = completedJobsCount;
    }

    public String getProviderId() {
        return providerId;
    }

    public void setProviderId(String providerId) {
        this.providerId = providerId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getProfilePhotoUrl() {
        return profilePhotoUrl;
    }

    public void setProfilePhotoUrl(String profilePhotoUrl) {
        this.profilePhotoUrl = profilePhotoUrl;
    }

    public BigDecimal getAverageRating() {
        return averageRating;
    }

    public void setAverageRating(BigDecimal averageRating) {
        this.averageRating = averageRating;
    }

    public Integer getTotalReviews() {
        return totalReviews;
    }

    public void setTotalReviews(Integer totalReviews) {
        this.totalReviews = totalReviews;
    }

    public Boolean getVerified() {
        return verified;
    }

    public void setVerified(Boolean verified) {
        this.verified = verified;
    }

    public Integer getCompletedJobsCount() {
        return completedJobsCount;
    }

    public void setCompletedJobsCount(Integer completedJobsCount) {
        this.completedJobsCount = completedJobsCount;
    }
}
