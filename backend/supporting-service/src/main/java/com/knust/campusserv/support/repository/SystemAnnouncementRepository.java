package com.knust.campusserv.support.repository;

import com.knust.campusserv.support.model.SystemAnnouncement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SystemAnnouncementRepository extends JpaRepository<SystemAnnouncement, String> {
    List<SystemAnnouncement> findByIsActiveTrueOrderByCreatedAtDesc();
}
