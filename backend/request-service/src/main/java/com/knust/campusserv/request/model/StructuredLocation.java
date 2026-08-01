package com.knust.campusserv.request.model;

import jakarta.persistence.Embeddable;

@Embeddable
public class StructuredLocation {
    private String address;
    private Double latitude;
    private Double longitude;
    private String placeId;
    private String landmark;

    public StructuredLocation() {}

    public StructuredLocation(String address, Double latitude, Double longitude, String placeId, String landmark) {
        this.address = address;
        this.latitude = latitude;
        this.longitude = longitude;
        this.placeId = placeId;
        this.landmark = landmark;
    }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public String getPlaceId() { return placeId; }
    public void setPlaceId(String placeId) { this.placeId = placeId; }

    public String getLandmark() { return landmark; }
    public void setLandmark(String landmark) { this.landmark = landmark; }
}
