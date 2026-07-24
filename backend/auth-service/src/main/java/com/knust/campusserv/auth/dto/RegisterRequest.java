package com.knust.campusserv.auth.dto;

import java.util.List;

public class RegisterRequest {
    private String email;
    private String password;
    private String fullName;
    private String role; // 'STUDENT', 'PROVIDER', 'ADMIN'
    private String serviceCategory;

    // Getters and Setters
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getServiceCategory() { return serviceCategory; }
    public void setServiceCategory(String serviceCategory) { this.serviceCategory = serviceCategory; }
}
