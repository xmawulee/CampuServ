package com.knust.campusserv.user.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "provider_services")
public class ProviderService {

    @Id
    private String id;

    @Column(name = "provider_id", nullable = false)
    private String providerId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id", nullable = false)
    private ServiceCategory category;

    @Column(name = "base_price", nullable = false)
    private BigDecimal basePrice;

    @Column(name = "title")
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    // Stored as comma-separated string; deserialized in getter
    @Column(name = "listing_key_services", columnDefinition = "TEXT")
    private String listingKeyServices;

    // Stored as comma-separated URL string; deserialized in getter
    @Column(name = "listing_portfolio", columnDefinition = "TEXT")
    private String listingPortfolio;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getProviderId() { return providerId; }
    public void setProviderId(String providerId) { this.providerId = providerId; }

    public ServiceCategory getCategory() { return category; }
    public void setCategory(ServiceCategory category) { this.category = category; }

    public BigDecimal getBasePrice() { return basePrice; }
    public void setBasePrice(BigDecimal basePrice) { this.basePrice = basePrice; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getListingKeyServices() { return listingKeyServices; }
    public void setListingKeyServices(String listingKeyServices) { this.listingKeyServices = listingKeyServices; }

    public List<String> getKeyServicesList() {
        if (listingKeyServices == null || listingKeyServices.trim().isEmpty()) return List.of();
        return List.of(listingKeyServices.split(",")).stream().map(String::trim).filter(s -> !s.isEmpty()).toList();
    }

    public String getListingPortfolio() { return listingPortfolio; }
    public void setListingPortfolio(String listingPortfolio) { this.listingPortfolio = listingPortfolio; }

    public List<String> getPortfolioList() {
        if (listingPortfolio == null || listingPortfolio.trim().isEmpty()) return List.of();
        return List.of(listingPortfolio.split(",")).stream().map(String::trim).filter(s -> !s.isEmpty()).toList();
    }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
