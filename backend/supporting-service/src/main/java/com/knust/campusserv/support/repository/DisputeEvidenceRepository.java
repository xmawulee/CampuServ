package com.knust.campusserv.support.repository;

import com.knust.campusserv.support.model.DisputeEvidence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DisputeEvidenceRepository extends JpaRepository<DisputeEvidence, String> {
    List<DisputeEvidence> findByDisputeIdOrderByCreatedAtAsc(String disputeId);
}
