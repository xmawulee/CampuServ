package com.knust.campusserv.auth.repository;

import com.knust.campusserv.auth.model.AccountDeletionTracker;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AccountDeletionTrackerRepository extends JpaRepository<AccountDeletionTracker, String> {
}
