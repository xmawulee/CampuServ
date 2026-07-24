package com.knust.campusserv.request.repository;

import com.knust.campusserv.request.model.RequestLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RequestLocationRepository extends JpaRepository<RequestLocation, String> {
    Optional<RequestLocation> findByRequestId(String requestId);
}
