package com.knust.campusserv.user.dto;

import java.math.BigDecimal;

public class AddServiceRequest {
    private String categoryId;
    private BigDecimal basePrice;

    // Getters and Setters
    public String getCategoryId() { return categoryId; }
    public void setCategoryId(String categoryId) { this.categoryId = categoryId; }

    public BigDecimal getBasePrice() { return basePrice; }
    public void setBasePrice(BigDecimal basePrice) { this.basePrice = basePrice; }
}
