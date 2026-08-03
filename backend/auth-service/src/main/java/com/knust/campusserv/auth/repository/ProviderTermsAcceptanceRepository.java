package com.knust.campusserv.auth.repository;

import com.knust.campusserv.auth.model.ProviderTermsAcceptance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProviderTermsAcceptanceRepository extends JpaRepository<ProviderTermsAcceptance, String> {
    Optional<ProviderTermsAcceptance> findByUserIdAndTermsVersion(String userId, String termsVersion);
}
