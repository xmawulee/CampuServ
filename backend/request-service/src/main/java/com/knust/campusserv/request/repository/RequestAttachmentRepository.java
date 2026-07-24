package com.knust.campusserv.request.repository;

import com.knust.campusserv.request.model.RequestAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RequestAttachmentRepository extends JpaRepository<RequestAttachment, String> {
    List<RequestAttachment> findByServiceRequestId(String requestId);
}
