package com.knust.campusserv.support.repository;

import com.knust.campusserv.support.model.ChatMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, String> {
    Page<ChatMessage> findByThreadIdOrderByCreatedAtDesc(String threadId, Pageable pageable);
    List<ChatMessage> findByThreadIdOrderByCreatedAtAsc(String threadId);
    List<ChatMessage> findByThreadIdAndSenderIdNotAndStatus(String threadId, String senderId, com.knust.campusserv.support.model.MessageStatus status);
}
