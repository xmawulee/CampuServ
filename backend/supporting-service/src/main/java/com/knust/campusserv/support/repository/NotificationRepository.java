package com.knust.campusserv.support.repository;

import com.knust.campusserv.support.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, String> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(String userId);
    Page<Notification> findByUserId(String userId, Pageable pageable);
    List<Notification> findByUserIdAndIsRead(String userId, boolean isRead);
    void deleteByUserId(String userId);
}
