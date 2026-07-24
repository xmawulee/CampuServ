package com.knust.campusserv.request.repository;

import com.knust.campusserv.request.model.ServiceRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ServiceRequestRepository extends JpaRepository<ServiceRequest, String> {
    Page<ServiceRequest> findByStatus(String status, Pageable pageable);
    Page<ServiceRequest> findByCategoryIdAndStatus(String categoryId, String status, Pageable pageable);
    List<ServiceRequest> findByRequesterId(String requesterId);
    Page<ServiceRequest> findByRequesterIdAndStatusIn(String requesterId, List<String> statuses, Pageable pageable);
    long countByRequesterIdAndStatusIn(String requesterId, List<String> statuses);
    List<ServiceRequest> findByStatusAndBidWindowClosesBefore(String status, LocalDateTime time);
}
