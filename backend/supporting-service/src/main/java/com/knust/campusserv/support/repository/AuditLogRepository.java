package com.knust.campusserv.support.repository;

import com.knust.campusserv.support.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
    List<AuditLog> findByTargetEntityAndTargetId(String targetEntity, String targetId);
    List<AuditLog> findByAdminId(String adminId);
}
