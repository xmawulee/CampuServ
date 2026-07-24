package com.knust.campusserv.support.repository;

import com.knust.campusserv.support.model.AdminNotification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AdminNotificationRepository extends JpaRepository<AdminNotification, UUID> {
    Page<AdminNotification> findByRead(boolean read, Pageable pageable);
}
