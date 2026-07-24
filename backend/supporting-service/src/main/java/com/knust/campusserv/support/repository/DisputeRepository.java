package com.knust.campusserv.support.repository;

import com.knust.campusserv.support.model.Dispute;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DisputeRepository extends JpaRepository<Dispute, String> {
    Optional<Dispute> findByJobId(String jobId);

    org.springframework.data.domain.Page<Dispute> findByStatusOrderByCreatedAtDesc(Dispute.DisputeStatus status, org.springframework.data.domain.Pageable pageable);

    org.springframework.data.domain.Page<Dispute> findAllByOrderByCreatedAtDesc(org.springframework.data.domain.Pageable pageable);

    java.util.List<Dispute> findByRaisedById(String raisedById);
}
