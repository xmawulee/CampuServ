package com.knust.campusserv.support.repository;

import com.knust.campusserv.support.model.ChatMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, String> {

    // Paginated messages for history load (newest first)
    Page<ChatMessage> findByThreadIdOrderBySentAtDesc(String threadId, Pageable pageable);

    // Latest single message for thread preview
    Optional<ChatMessage> findTopByThreadIdOrderBySentAtDesc(String threadId);

    // Count unread messages (sent by the other party) in a thread
    long countByThreadIdAndSenderIdNotAndReadAtIsNull(String threadId, String viewerId);

    // Mark all unread messages in a thread as read (by the non-sender)
    @Transactional
    @Modifying
    @Query("UPDATE ChatMessage m SET m.readAt = :now WHERE m.threadId = :threadId AND m.senderId <> :viewerId AND m.readAt IS NULL")
    int markThreadAsRead(@Param("threadId") String threadId, @Param("viewerId") String viewerId, @Param("now") LocalDateTime now);
}
