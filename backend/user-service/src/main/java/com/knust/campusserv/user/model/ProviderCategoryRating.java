package com.knust.campusserv.user.model;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "provider_category_ratings", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"provider_id", "category_id"})
})
public class ProviderCategoryRating {

    @Id
    private String id;

    @Column(name = "provider_id", nullable = false)
    private String providerId;

    @Column(name = "category_id", nullable = false)
    private String categoryId;

    @Column(precision = 3, scale = 2)
    private BigDecimal rating = BigDecimal.ZERO;

    @Column(name = "review_count")
    private Integer reviewCount = 0;

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getProviderId() { return providerId; }
    public void setProviderId(String providerId) { this.providerId = providerId; }

    public String getCategoryId() { return categoryId; }
    public void setCategoryId(String categoryId) { this.categoryId = categoryId; }

    public BigDecimal getRating() { return rating; }
    public void setRating(BigDecimal rating) { this.rating = rating; }

    public Integer getReviewCount() { return reviewCount; }
    public void setReviewCount(Integer reviewCount) { this.reviewCount = reviewCount; }
}
