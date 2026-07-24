package com.knust.campusserv.user.repository;

import com.knust.campusserv.user.model.ProviderService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProviderServiceRepository extends JpaRepository<ProviderService, String> {
    List<ProviderService> findByProviderId(String providerId);
    List<ProviderService> findByCategoryId(String categoryId);
}
