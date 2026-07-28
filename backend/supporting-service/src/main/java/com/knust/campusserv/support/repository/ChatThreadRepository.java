package com.knust.campusserv.support.repository;

import com.knust.campusserv.support.model.ChatThread;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatThreadRepository extends JpaRepository<ChatThread, String> {

    Optional<ChatThread> findByStudentIdAndProviderId(String studentId, String providerId);

    // Retrieve all threads where the user is either the student or the provider, sorted by latest activity
    @Query("SELECT t FROM ChatThread t WHERE t.studentId = :userId OR t.providerId = :userId ORDER BY t.lastMessageAt DESC")
    List<ChatThread> findByUserId(@Param("userId") String userId);
}
