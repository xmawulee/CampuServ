package com.knust.campusserv.support.repository;

import com.knust.campusserv.support.model.CallLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CallLogRepository extends JpaRepository<CallLog, String> {
}
