package com.knust.campusserv.support;

import com.knust.campusserv.support.listener.BidPlacedListener;
import com.knust.campusserv.support.listener.AdminNotificationListener;
import com.knust.campusserv.support.model.Notification;
import com.knust.campusserv.support.model.NotificationPayload;
import com.knust.campusserv.support.repository.NotificationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.HashMap;
import java.util.Map;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class NotificationLifecycleTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private JdbcTemplate jdbcTemplate;

    @InjectMocks
    private BidPlacedListener bidPlacedListener;

    @InjectMocks
    private AdminNotificationListener adminNotificationListener;

    @Test
    public void testBidPlacedFiresNotificationToStudent() {
        Map<String, Object> event = new HashMap<>();
        event.put("requestId", "req-123");
        event.put("offerId", "off-456");
        event.put("providerId", "prov-789");
        event.put("requesterId", "stud-101");
        event.put("price", 150.0);

        when(notificationRepository.existsByUserIdAndTypeAndReferenceId("stud-101", "BID_RECEIVED", "off-456"))
                .thenReturn(false);
        when(jdbcTemplate.queryForObject(eq("SELECT title FROM service_requests WHERE id = ?"), eq(String.class), eq("req-123")))
                .thenReturn("Laundry request");
        when(jdbcTemplate.queryForObject(eq("SELECT full_name FROM users WHERE id = ?"), eq(String.class), eq("prov-789")))
                .thenReturn("Adom Kofi");

        bidPlacedListener.handleBidPlaced(event);

        ArgumentCaptor<Notification> notifCaptor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository, times(1)).save(notifCaptor.capture());
        Notification saved = notifCaptor.getValue();

        assertEquals("stud-101", saved.getUserId());
        assertEquals("New Bid Received", saved.getTitle());
        assertTrue(saved.getMessage().contains("Adom Kofi"));
        assertTrue(saved.getMessage().contains("Laundry request"));
        assertEquals("BID_RECEIVED", saved.getType());
        assertEquals("off-456", saved.getReferenceId());

        verify(messagingTemplate, times(1)).convertAndSend(
                eq("/topic/user/stud-101/notifications"),
                eq(saved)
        );
    }

    @Test
    public void testBidPlacedIdempotencyPreventsDuplicates() {
        Map<String, Object> event = new HashMap<>();
        event.put("requestId", "req-123");
        event.put("offerId", "off-456");
        event.put("providerId", "prov-789");
        event.put("requesterId", "stud-101");
        event.put("price", 150.0);

        when(notificationRepository.existsByUserIdAndTypeAndReferenceId("stud-101", "BID_RECEIVED", "off-456"))
                .thenReturn(true);

        bidPlacedListener.handleBidPlaced(event);

        verify(notificationRepository, never()).save(any());
        verify(messagingTemplate, never()).convertAndSend(startsWith("/topic/user/"), any(Object.class));
    }

    @Test
    public void testOfferAcceptedDispatchesNotifications() {
        NotificationPayload payload = new NotificationPayload();
        payload.setType("offer.accepted");
        payload.setRequestId("req-123");
        payload.setOfferId("off-456");
        payload.setProviderId("prov-789");
        payload.setRequesterId("stud-101");

        when(jdbcTemplate.queryForObject(eq("SELECT title FROM service_requests WHERE id = ?"), eq(String.class), eq("req-123")))
                .thenReturn("Laundry request");
        when(jdbcTemplate.queryForObject(eq("SELECT full_name FROM users WHERE id = ?"), eq(String.class), eq("prov-789")))
                .thenReturn("Adom Kofi");

        when(jdbcTemplate.queryForList(anyString(), eq(String.class), eq("req-123"), eq("prov-789")))
                .thenReturn(List.of("prov-other"));

        adminNotificationListener.handleAdminNotification(payload);

        ArgumentCaptor<Notification> notifCaptor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository, atLeast(1)).save(notifCaptor.capture());

        List<Notification> savedNotifs = notifCaptor.getAllValues();
        
        Notification acceptedNotif = savedNotifs.stream().filter(n -> "BID_ACCEPTED".equals(n.getType())).findFirst().orElse(null);
        assertNotNull(acceptedNotif);
        assertEquals("prov-789", acceptedNotif.getUserId());
        assertTrue(acceptedNotif.getMessage().contains("Laundry request"));

        Notification studentNotif = savedNotifs.stream().filter(n -> "JOB_STARTED".equals(n.getType())).findFirst().orElse(null);
        assertNotNull(studentNotif);
        assertEquals("stud-101", studentNotif.getUserId());

        Notification rejectedNotif = savedNotifs.stream().filter(n -> "BID_REJECTED".equals(n.getType())).findFirst().orElse(null);
        assertNotNull(rejectedNotif);
        assertEquals("prov-other", rejectedNotif.getUserId());
    }
}
