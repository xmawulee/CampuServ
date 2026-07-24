package com.knust.campusserv.request.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "request_locations")
public class RequestLocation {

    @Id
    private String id;

    @Column(name = "request_id", nullable = false)
    private String requestId;

    @Column(name = "pickup_latitude", nullable = false, precision = 10, scale = 8)
    private BigDecimal pickupLatitude;

    @Column(name = "pickup_longitude", nullable = false, precision = 11, scale = 8)
    private BigDecimal pickupLongitude;

    @Column(name = "pickup_address", nullable = false, length = 500)
    private String pickupAddress;

    @Column(name = "pickup_place_id")
    private String pickupPlaceId;

    @Column(name = "pickup_landmark", columnDefinition = "TEXT")
    private String pickupLandmark;

    @Column(name = "location_method", nullable = false)
    private String locationMethod;

    @Column(name = "pickup_confirmed_at")
    private LocalDateTime pickupConfirmedAt = LocalDateTime.now();

    @Column(name = "is_locked")
    private Boolean isLocked = false;

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getRequestId() { return requestId; }
    public void setRequestId(String requestId) { this.requestId = requestId; }

    public BigDecimal getPickupLatitude() { return pickupLatitude; }
    public void setPickupLatitude(BigDecimal pickupLatitude) { this.pickupLatitude = pickupLatitude; }

    public BigDecimal getPickupLongitude() { return pickupLongitude; }
    public void setPickupLongitude(BigDecimal pickupLongitude) { this.pickupLongitude = pickupLongitude; }

    public String getPickupAddress() { return pickupAddress; }
    public void setPickupAddress(String pickupAddress) { this.pickupAddress = pickupAddress; }

    public String getPickupPlaceId() { return pickupPlaceId; }
    public void setPickupPlaceId(String pickupPlaceId) { this.pickupPlaceId = pickupPlaceId; }

    public String getPickupLandmark() { return pickupLandmark; }
    public void setPickupLandmark(String pickupLandmark) { this.pickupLandmark = pickupLandmark; }

    public String getLocationMethod() { return locationMethod; }
    public void setLocationMethod(String locationMethod) { this.locationMethod = locationMethod; }

    public LocalDateTime getPickupConfirmedAt() { return pickupConfirmedAt; }
    public void setPickupConfirmedAt(LocalDateTime pickupConfirmedAt) { this.pickupConfirmedAt = pickupConfirmedAt; }

    public Boolean getIsLocked() { return isLocked; }
    public void setIsLocked(Boolean isLocked) { this.isLocked = isLocked; }
}
