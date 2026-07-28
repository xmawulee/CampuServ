package com.knust.campusserv.user.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "saved_listings", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"student_id", "provider_id"})
})
public class SavedListing {

    @Id
    private String id = UUID.randomUUID().toString();

    @Column(name = "student_id", nullable = false)
    private String studentId;

    @Column(name = "provider_id", nullable = false)
    private String providerId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public SavedListing() {}

    public SavedListing(String studentId, String providerId) {
        this.studentId = studentId;
        this.providerId = providerId;
        this.id = UUID.randomUUID().toString();
        this.createdAt = LocalDateTime.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public String getProviderId() { return providerId; }
    public void setProviderId(String providerId) { this.providerId = providerId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
