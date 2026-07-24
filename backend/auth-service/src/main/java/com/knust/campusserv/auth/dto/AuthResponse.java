package com.knust.campusserv.auth.dto;

import java.time.LocalDateTime;

public class AuthResponse {
    private String accessToken;
    private String refreshToken;
    private String userId;
    private String role;
    private String primaryRole;
    private String secondaryRole;
    private String secondaryRoleStatus;
    private String activeRoleView;
    private Boolean primaryRoleVerified;
    private LocalDateTime secondaryRoleRequestedAt;
    private LocalDateTime secondaryRoleAcquiredAt;
    private String email;
    private String fullName;
    private String profilePictureUrl;
    private Boolean isVerified;
    private String verificationStatus;
    private String studentIdPhotoUrl;
    private String serviceCategory;
    private String accountStatus;
    private Boolean isProvider;
    private String rejectionReason;
    private Integer rejectionCount;

    public AuthResponse(String accessToken, String refreshToken, String userId, String role, 
                        String primaryRole, String secondaryRole, String secondaryRoleStatus, String activeRoleView, Boolean primaryRoleVerified,
                        LocalDateTime secondaryRoleRequestedAt, LocalDateTime secondaryRoleAcquiredAt,
                        String email, String fullName, String profilePictureUrl, Boolean isVerified, 
                        String verificationStatus, String studentIdPhotoUrl, String serviceCategory, 
                        String accountStatus, Boolean isProvider, String rejectionReason) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.userId = userId;
        this.role = role;
        this.primaryRole = primaryRole != null ? primaryRole : (role != null ? role : "STUDENT");
        this.secondaryRole = secondaryRole;
        this.secondaryRoleStatus = secondaryRoleStatus;
        this.activeRoleView = activeRoleView != null ? activeRoleView : this.primaryRole;
        this.primaryRoleVerified = primaryRoleVerified != null ? primaryRoleVerified : true;
        this.secondaryRoleRequestedAt = secondaryRoleRequestedAt;
        this.secondaryRoleAcquiredAt = secondaryRoleAcquiredAt;
        this.email = email;
        this.fullName = fullName;
        this.profilePictureUrl = profilePictureUrl;
        this.isVerified = isVerified;
        this.verificationStatus = verificationStatus;
        this.studentIdPhotoUrl = studentIdPhotoUrl;
        this.serviceCategory = serviceCategory;
        this.accountStatus = accountStatus;
        this.isProvider = isProvider != null ? isProvider : "PROVIDER".equals(role);
        this.rejectionReason = rejectionReason;
        this.rejectionCount = 0;
    }

    public AuthResponse(String accessToken, String refreshToken, String userId, String role, String email, String fullName, String profilePictureUrl, Boolean isVerified, String verificationStatus, String studentIdPhotoUrl, String serviceCategory, String accountStatus, Boolean isProvider, String rejectionReason) {
        this(accessToken, refreshToken, userId, role, role != null ? role : "STUDENT", null, null, role != null ? role : "STUDENT", true, null, null, email, fullName, profilePictureUrl, isVerified, verificationStatus, studentIdPhotoUrl, serviceCategory, accountStatus, isProvider, rejectionReason);
    }

    public AuthResponse(String accessToken, String refreshToken, String userId, String role, String email, String fullName, String profilePictureUrl) {
        this(accessToken, refreshToken, userId, role, email, fullName, profilePictureUrl, false, "UNVERIFIED", null, null, "PENDING_VERIFICATION", "PROVIDER".equals(role), null);
    }

    // Getters and Setters
    public String getAccessToken() { return accessToken; }
    public void setAccessToken(String accessToken) { this.accessToken = accessToken; }

    public String getRefreshToken() { return refreshToken; }
    public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getPrimaryRole() { return primaryRole; }
    public void setPrimaryRole(String primaryRole) { this.primaryRole = primaryRole; }

    public String getSecondaryRole() { return secondaryRole; }
    public void setSecondaryRole(String secondaryRole) { this.secondaryRole = secondaryRole; }

    public String getSecondaryRoleStatus() { return secondaryRoleStatus; }
    public void setSecondaryRoleStatus(String secondaryRoleStatus) { this.secondaryRoleStatus = secondaryRoleStatus; }

    public String getActiveRoleView() { return activeRoleView; }
    public void setActiveRoleView(String activeRoleView) { this.activeRoleView = activeRoleView; }

    public Boolean getPrimaryRoleVerified() { return primaryRoleVerified; }
    public void setPrimaryRoleVerified(Boolean primaryRoleVerified) { this.primaryRoleVerified = primaryRoleVerified; }

    public LocalDateTime getSecondaryRoleRequestedAt() { return secondaryRoleRequestedAt; }
    public void setSecondaryRoleRequestedAt(LocalDateTime secondaryRoleRequestedAt) { this.secondaryRoleRequestedAt = secondaryRoleRequestedAt; }

    public LocalDateTime getSecondaryRoleAcquiredAt() { return secondaryRoleAcquiredAt; }
    public void setSecondaryRoleAcquiredAt(LocalDateTime secondaryRoleAcquiredAt) { this.secondaryRoleAcquiredAt = secondaryRoleAcquiredAt; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getProfilePictureUrl() { return profilePictureUrl; }
    public void setProfilePictureUrl(String profilePictureUrl) { this.profilePictureUrl = profilePictureUrl; }

    public Boolean getIsVerified() { return isVerified; }
    public void setIsVerified(Boolean isVerified) { this.isVerified = isVerified; }

    public String getVerificationStatus() { return verificationStatus; }
    public void setVerificationStatus(String verificationStatus) { this.verificationStatus = verificationStatus; }

    public String getStudentIdPhotoUrl() { return studentIdPhotoUrl; }
    public void setStudentIdPhotoUrl(String studentIdPhotoUrl) { this.studentIdPhotoUrl = studentIdPhotoUrl; }

    public String getServiceCategory() { return serviceCategory; }
    public void setServiceCategory(String serviceCategory) { this.serviceCategory = serviceCategory; }

    public String getAccountStatus() { return accountStatus; }
    public void setAccountStatus(String accountStatus) { this.accountStatus = accountStatus; }

    public Boolean getIsProvider() { return isProvider; }
    public void setIsProvider(Boolean isProvider) { this.isProvider = isProvider; }

    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }

    public Integer getRejectionCount() { return rejectionCount; }
    public void setRejectionCount(Integer rejectionCount) { this.rejectionCount = rejectionCount; }
}
