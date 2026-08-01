package com.knust.campusserv.user.repository;

import com.knust.campusserv.user.model.SavedListing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SavedListingRepository extends JpaRepository<SavedListing, String> {
    List<SavedListing> findByStudentId(String studentId);
    List<SavedListing> findByProviderId(String providerId);
    Optional<SavedListing> findByStudentIdAndProviderId(String studentId, String providerId);
    boolean existsByStudentIdAndProviderId(String studentId, String providerId);
    void deleteByStudentIdAndProviderId(String studentId, String providerId);
}
