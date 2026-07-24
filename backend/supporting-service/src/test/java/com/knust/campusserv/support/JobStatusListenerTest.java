package com.knust.campusserv.support;

import com.knust.campusserv.support.listener.JobStatusListener;
import com.knust.campusserv.support.model.Notification;
import com.knust.campusserv.support.repository.ChatMessageRepository;
import com.knust.campusserv.support.repository.ChatThreadRepository;
import com.knust.campusserv.support.repository.NotificationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class JobStatusListenerTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private ChatThreadRepository chatThreadRepository;

    @Mock
    private ChatMessageRepository chatMessageRepository;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private JobStatusListener listener;

    @Test
    public void testAwaitingCodeStatusCreatesNotificationAndBroadcasts() {
        Map<String, Object> event = new HashMap<>();
        event.put("jobId", "job-123");
        event.put("requestId", "req-456");
        event.put("requesterId", "usr-student");
        event.put("providerId", "usr-provider");
        event.put("status", "AWAITING_CODE");
        event.put("completionCode", "123456");

        listener.receiveStatusChange(event);

        // Verify notification saved in DB
        ArgumentCaptor<Notification> notifCaptor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository, times(1)).save(notifCaptor.capture());
        Notification notification = notifCaptor.getValue();

        assertEquals("usr-student", notification.getUserId());
        assertEquals("Completion Code Ready", notification.getTitle());
        assertTrue(notification.getMessage().contains("123456"));
        assertEquals("JOB_STARTED", notification.getType());
        assertEquals("job-123", notification.getReferenceId());

        // Verify STOMP broadcast for notification list update
        verify(messagingTemplate, times(1)).convertAndSend(
                eq("/topic/user/usr-student/notifications"),
                eq(notification)
        );

        // Verify STOMP broadcast for completion-code channel
        Map<String, String> expectedPayload = new HashMap<>();
        expectedPayload.put("code", "123456");
        expectedPayload.put("jobId", "job-123");
        verify(messagingTemplate, times(1)).convertAndSend(
                eq("/topic/user/usr-student/completion-code"),
                eq(expectedPayload)
        );
    }
}
