package com.knust.campusserv.job.repository;

import com.knust.campusserv.job.model.JobStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JobStatusHistoryRepository extends JpaRepository<JobStatusHistory, String> {
    List<JobStatusHistory> findByJobIdOrderByCreatedAtDesc(String jobId);
}
