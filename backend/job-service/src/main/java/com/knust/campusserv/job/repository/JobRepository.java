package com.knust.campusserv.job.repository;

import com.knust.campusserv.job.model.Job;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface JobRepository extends JpaRepository<Job, String> {
    
    @Query("SELECT j FROM Job j WHERE j.requesterId = :userId OR j.providerId = :userId ORDER BY j.createdAt DESC")
    List<Job> findByUser(@Param("userId") String userId);

    Optional<Job> findByRequestId(String requestId);

    List<Job> findByStatusAndUpdatedAtBefore(String status, LocalDateTime time);

    org.springframework.data.domain.Page<Job> findByStatusOrderByCreatedAtDesc(String status, org.springframework.data.domain.Pageable pageable);

    org.springframework.data.domain.Page<Job> findAllByOrderByCreatedAtDesc(org.springframework.data.domain.Pageable pageable);

    long countByProviderIdAndStatusIn(String providerId, List<String> statuses);

    org.springframework.data.domain.Page<Job> findByProviderIdAndStatusInOrderByUpdatedAtDesc(String providerId, List<String> statuses, org.springframework.data.domain.Pageable pageable);

    org.springframework.data.domain.Page<Job> findByProviderIdOrderByUpdatedAtDesc(String providerId, org.springframework.data.domain.Pageable pageable);

    long countByProviderIdAndStatus(String providerId, String status);

    @Query("SELECT COALESCE(SUM(j.agreedPrice), 0) FROM Job j WHERE j.providerId = :providerId AND j.status = 'COMPLETED'")
    java.math.BigDecimal sumCompletedEarningsByProviderId(@Param("providerId") String providerId);
}
