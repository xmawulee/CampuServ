package com.knust.campusserv.user.repository;

import com.knust.campusserv.user.model.ProviderCategoryRating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProviderCategoryRatingRepository extends JpaRepository<ProviderCategoryRating, String> {
    List<ProviderCategoryRating> findByProviderId(String providerId);
}
