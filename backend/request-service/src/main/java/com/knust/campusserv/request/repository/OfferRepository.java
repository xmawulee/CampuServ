package com.knust.campusserv.request.repository;

import com.knust.campusserv.request.model.Offer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OfferRepository extends JpaRepository<Offer, String> {
    List<Offer> findByRequestId(String requestId);
    List<Offer> findByProviderId(String providerId);
    boolean existsByRequestIdAndProviderId(String requestId, String providerId);
    int countByRequestIdAndProviderIdAndPrice(String requestId, String providerId, java.math.BigDecimal price);
    List<Offer> findByRequestIdAndProviderIdOrderByCreatedAtDesc(String requestId, String providerId);
}
