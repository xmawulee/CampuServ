package com.knust.campusserv.auth.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {

    @Id
    private String id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    // CRITICAL WARNING: Legacy fields (role, isProvider, verificationStatus) must NOT be modified
    // directly. They are denormalized read-only mirrors updated only inside syncLegacyFields().
    @Column(nullable = false)
    private String role = "STUDENT"; // 'STUDENT', 'PROVIDER', 'ADMIN'

    @Column(name = "primary_role_verified")
    private Boolean primaryRoleVerified = false;

    @Column(name = "is_verified")
    private Boolean isVerified = false;

    // CRITICAL WARNING: Read-only legacy mirror. Do not write directly.
    @Column(name = "verification_status")
    private String verificationStatus = "PENDING_VERIFICATION"; // Legacy mirror

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "student_id_photo_url")
    private String studentIdPhotoUrl;

    @Column(name = "profile_picture_url")
    private String profilePictureUrl;

    @Column(name = "account_status")
    private String accountStatus = "PENDING_VERIFICATION"; // 'PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'BANNED'

    @Column(name = "service_category")
    private String serviceCategory;

    // CRITICAL WARNING: Read-only legacy mirror. Do not write directly.
    @Column(name = "is_provider")
    private Boolean isProvider = false; // Legacy mirror

    @Column(name = "rejection_count")
    private Integer rejectionCount = 0;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "original_email")
    private String originalEmail;

    // Backward compatibility alias
    public Boolean getEmailVerified() { return true; }
    public void setEmailVerified(Boolean emailVerified) {}

    public String getOriginalEmail() { return originalEmail; }
    public void setOriginalEmail(String originalEmail) { this.originalEmail = originalEmail; }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    @Column(name = "primary_role")
    private String primaryRole;

    @Column(name = "secondary_role")
    private String secondaryRole;

    @Column(name = "secondary_role_status")
    private String secondaryRoleStatus;

    @Column(name = "secondary_role_requested_at")
    private LocalDateTime secondaryRoleRequestedAt;

    @Column(name = "secondary_role_acquired_at")
    private LocalDateTime secondaryRoleAcquiredAt;

    @Column(name = "active_role_view")
    private String activeRoleView;

    public String getPrimaryRole() { return primaryRole; }
    public void setPrimaryRole(String primaryRole) { this.primaryRole = primaryRole; }

    public String getSecondaryRole() { return secondaryRole; }
    public void setSecondaryRole(String secondaryRole) { this.secondaryRole = secondaryRole; }

    public String getSecondaryRoleStatus() { return secondaryRoleStatus; }
    public void setSecondaryRoleStatus(String secondaryRoleStatus) { this.secondaryRoleStatus = secondaryRoleStatus; }

    public LocalDateTime getSecondaryRoleRequestedAt() { return secondaryRoleRequestedAt; }
    public void setSecondaryRoleRequestedAt(LocalDateTime secondaryRoleRequestedAt) { this.secondaryRoleRequestedAt = secondaryRoleRequestedAt; }

    public LocalDateTime getSecondaryRoleAcquiredAt() { return secondaryRoleAcquiredAt; }
    public void setSecondaryRoleAcquiredAt(LocalDateTime secondaryRoleAcquiredAt) { this.secondaryRoleAcquiredAt = secondaryRoleAcquiredAt; }

    public String getActiveRoleView() { return activeRoleView; }
    public void setActiveRoleView(String activeRoleView) { this.activeRoleView = activeRoleView; }

    public Boolean getPrimaryRoleVerified() { return primaryRoleVerified; }
    public void setPrimaryRoleVerified(Boolean primaryRoleVerified) { this.primaryRoleVerified = primaryRoleVerified; }

    public Boolean getIsVerified() { 
        if ("PROVIDER".equalsIgnoreCase(role)) {
            return Boolean.TRUE.equals(primaryRoleVerified);
        }
        return true;
    }
    public void setIsVerified(Boolean verified) { isVerified = verified; }

    public String getVerificationStatus() { return verificationStatus; }
    public void setVerificationStatus(String verificationStatus) { this.verificationStatus = verificationStatus; }

    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }

    public String getStudentIdPhotoUrl() { return studentIdPhotoUrl; }
    public void setStudentIdPhotoUrl(String studentIdPhotoUrl) { this.studentIdPhotoUrl = studentIdPhotoUrl; }

    public String getProfilePictureUrl() { return profilePictureUrl; }
    public void setProfilePictureUrl(String profilePictureUrl) { this.profilePictureUrl = profilePictureUrl; }

    public String getAccountStatus() { return accountStatus; }
    public void setAccountStatus(String accountStatus) { this.accountStatus = accountStatus; }

    public String getServiceCategory() { return serviceCategory; }
    public void setServiceCategory(String serviceCategory) { this.serviceCategory = serviceCategory; }

    public Boolean getIsProvider() { return isProvider; }
    public void setIsProvider(Boolean isProvider) { this.isProvider = isProvider; }

    public Integer getRejectionCount() { return rejectionCount; }
    public void setRejectionCount(Integer rejectionCount) { this.rejectionCount = rejectionCount; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    @Transient
    private String initialRole;

    @PostLoad
    public void captureInitialRole() {
        this.initialRole = this.role;
    }

    @PrePersist
    @PreUpdate
    public void syncLegacyFields() {
        if (this.initialRole != null && !this.initialRole.equalsIgnoreCase(this.role)) {
            // throw new IllegalStateException("Account role is immutable post-creation (attempted " + initialRole + " -> " + role + ")");
            // No longer throwing error here since role view might change, but primary_role is the immutable one.
        }

        // Mirror active_role_view into role for JWT backward compatibility, fallback to primaryRole
        if (this.activeRoleView != null) {
            this.role = this.activeRoleView;
        } else if (this.primaryRole != null) {
            this.role = this.primaryRole;
            this.activeRoleView = this.primaryRole;
        }

        this.isProvider = "PROVIDER".equalsIgnoreCase(this.role) || "PROVIDER".equalsIgnoreCase(this.primaryRole) || "PROVIDER".equalsIgnoreCase(this.secondaryRole);

        if ("PROVIDER".equalsIgnoreCase(this.primaryRole)) {
            this.verificationStatus = Boolean.TRUE.equals(primaryRoleVerified) ? "APPROVED" : "PENDING_VERIFICATION";
            this.isVerified = Boolean.TRUE.equals(primaryRoleVerified);
        } else {
            this.verificationStatus = "APPROVED";
            this.isVerified = true;
        }

        if (!"SUSPENDED".equalsIgnoreCase(this.accountStatus) && 
            !"BANNED".equalsIgnoreCase(this.accountStatus) &&
            !"INCOMPLETE".equalsIgnoreCase(this.accountStatus)) {
            this.accountStatus = Boolean.TRUE.equals(this.isVerified) ? "ACTIVE" : "PENDING_VERIFICATION";
        }
    }
}
