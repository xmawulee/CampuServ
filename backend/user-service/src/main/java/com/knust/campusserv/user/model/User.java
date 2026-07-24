package com.knust.campusserv.user.model;

import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "users")
public class User {
    @Id
    private String id;
    
    private String email;
    
    @Column(name = "full_name")
    private String fullName;
    
    @Column(name = "profile_picture_url")
    private String profilePictureUrl;
    
    private String role;
    
    @Column(name = "is_verified")
    private Boolean isVerified = false;
    
    private String bio;
    
    private Double rating = 0.0;
    
    @Column(name = "completed_jobs_count")
    private Integer completedJobsCount = 0;
    
    @ElementCollection
    @CollectionTable(name = "user_portfolio", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "portfolio_url")
    private List<String> portfolio;

    @Column(name = "primary_role")
    private String primaryRole;

    @Column(name = "secondary_role")
    private String secondaryRole;

    @Column(name = "secondary_role_status")
    private String secondaryRoleStatus;

    @Column(name = "is_provider")
    private Boolean isProvider = false;

    @Column(name = "account_status")
    private String accountStatus;

    @Column(name = "primary_role_verified")
    private Boolean primaryRoleVerified = true;

    @Column(name = "service_category")
    private String serviceCategory;

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

    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }

    public Double getRating() { return rating; }
    public void setRating(Double rating) { this.rating = rating; }

    public Integer getCompletedJobsCount() { return completedJobsCount; }
    public void setCompletedJobsCount(Integer completedJobsCount) { this.completedJobsCount = completedJobsCount; }

    public List<String> getPortfolio() { return portfolio; }
    public void setPortfolio(List<String> portfolio) { this.portfolio = portfolio; }

    public String getPrimaryRole() { return primaryRole; }
    public void setPrimaryRole(String primaryRole) { this.primaryRole = primaryRole; }

    public String getSecondaryRole() { return secondaryRole; }
    public void setSecondaryRole(String secondaryRole) { this.secondaryRole = secondaryRole; }

    public String getSecondaryRoleStatus() { return secondaryRoleStatus; }
    public void setSecondaryRoleStatus(String secondaryRoleStatus) { this.secondaryRoleStatus = secondaryRoleStatus; }

    public Boolean getIsProvider() { return isProvider; }
    public void setIsProvider(Boolean isProvider) { this.isProvider = isProvider; }

    public String getServiceCategory() { return serviceCategory; }
    public void setServiceCategory(String serviceCategory) { this.serviceCategory = serviceCategory; }

    public String getAccountStatus() { return accountStatus; }
    public void setAccountStatus(String accountStatus) { this.accountStatus = accountStatus; }

    public Boolean getPrimaryRoleVerified() { return primaryRoleVerified; }
    public void setPrimaryRoleVerified(Boolean primaryRoleVerified) { this.primaryRoleVerified = primaryRoleVerified; }
}
