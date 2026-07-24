package com.knust.campusserv.support.controller;

import com.knust.campusserv.support.model.ChatMessage;
import com.knust.campusserv.support.model.ChatThread;
import com.knust.campusserv.support.repository.ChatMessageRepository;
import com.knust.campusserv.support.repository.ChatThreadRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/admin/chats")
public class AdminChatController {

    @Autowired
    private ChatThreadRepository chatThreadRepository;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @GetMapping("/job/{jobId}")
    public ResponseEntity<?> getChatForJob(@PathVariable String jobId) {
        Optional<ChatThread> threadOpt = chatThreadRepository.findByJobId(jobId);
        if (threadOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("No chat thread found for this job.");
        }

        ChatThread thread = threadOpt.get();
        List<ChatMessage> messages = chatMessageRepository.findByThreadIdOrderByCreatedAtAsc(thread.getId());

        Map<String, Object> response = new HashMap<>();
        response.put("thread", thread);
        response.put("messages", messages);

        return ResponseEntity.ok(response);
    }
}
