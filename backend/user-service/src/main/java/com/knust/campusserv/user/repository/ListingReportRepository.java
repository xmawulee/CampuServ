package com.knust.campusserv.user.repository;

import com.knust.campusserv.user.model.ListingReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ListingReportRepository extends JpaRepository<ListingReport, String> {
    List<ListingReport> findByProviderId(String providerId);
    List<ListingReport> findByReporterId(String reporterId);
    boolean existsByProviderIdAndReporterIdAndStatus(String providerId, String reporterId, String status);
}
