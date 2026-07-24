package com.knust.campusserv.support.repository;

import com.knust.campusserv.support.model.ChatThread;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface ChatThreadRepository extends JpaRepository<ChatThread, String> {
    Optional<ChatThread> findByRequestId(String requestId);

    @Query(value = "SELECT * FROM chat_threads WHERE request_id = (SELECT request_id FROM jobs WHERE id = :jobId)", nativeQuery = true)
    Optional<ChatThread> findByJobId(@Param("jobId") String jobId);

    List<ChatThread> findByClientIdOrProviderId(String clientId, String providerId);
}
