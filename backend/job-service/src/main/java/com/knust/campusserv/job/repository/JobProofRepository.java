package com.knust.campusserv.job.repository;

import com.knust.campusserv.job.model.JobProof;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JobProofRepository extends JpaRepository<JobProof, String> {
    List<JobProof> findByJobId(String jobId);
}
