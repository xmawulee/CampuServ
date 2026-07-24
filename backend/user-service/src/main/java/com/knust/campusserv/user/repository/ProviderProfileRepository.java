package com.knust.campusserv.user.repository;

import com.knust.campusserv.user.model.ProviderProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface ProviderProfileRepository extends JpaRepository<ProviderProfile, String> {
    
    @Query("SELECT p FROM ProviderProfile p WHERE p.rating >= :minRating ORDER BY p.rating DESC")
    List<ProviderProfile> findByFilters(@Param("minRating") BigDecimal minRating);

    @Query("SELECT p FROM ProviderProfile p WHERE p.rating >= :minRating AND (:categoryId IS NULL OR p.id IN (SELECT s.providerId FROM ProviderService s WHERE s.category.id = :categoryId))")
    org.springframework.data.domain.Page<ProviderProfile> findByFiltersWithCategory(
        @Param("minRating") BigDecimal minRating, 
        @Param("categoryId") String categoryId, 
        org.springframework.data.domain.Pageable pageable);
}
