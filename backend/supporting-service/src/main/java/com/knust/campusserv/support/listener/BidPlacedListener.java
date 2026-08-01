package com.knust.campusserv.support.listener;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Listens for bid.placed events published by the request-service and relays
 * them to the STOMP topic the student's RequestDetailsScreen subscribes to.
 *
 * Event payload (Map from request-service):
 *   type        = "bid.placed"
 *   requestId   = the service-request ID
 *   requesterId = the student (requester) user ID
 *   offerId     = the newly-created offer ID
 *   providerId  = the provider who placed the bid
 *   price       = the bid amount
 *   eta         = the provider estimated completion time
 *
 * STOMP destination: /topic/request.{requestId}.bids
 * Frontend handler in RequestDetailsScreen calls fetchRequestDetails() on receipt,
 * which re-fetches the full enriched request+offers list from request-service.
 */
@Component
public class BidPlacedListener {

    private static final Logger logger = LoggerFactory.getLogger(BidPlacedListener.class);

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private com.knust.campusserv.support.repository.NotificationRepository notificationRepository;

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @RabbitListener(queues = "bid_placed_queue")
    public void handleBidPlaced(Map<String, Object> event) {
        try {
            String requestId = (String) event.get("requestId");
            String offerId   = (String) event.get("offerId");

            if (requestId == null || requestId.isBlank()) {
                logger.warn("BidPlacedListener: received event with missing requestId, skipping");
                return;
            }

            logger.info("BidPlacedListener: bid {} placed on request {} — broadcasting STOMP", offerId, requestId);
            messagingTemplate.convertAndSend("/topic/request." + requestId + ".bids", event);

            String requesterId = (String) event.get("requesterId");
            String providerId  = (String) event.get("providerId");
            Number priceNum    = (Number) event.get("price");
            double price       = priceNum != null ? priceNum.doubleValue() : 0.0;

            if (requesterId != null && !requesterId.isBlank() && offerId != null && !offerId.isBlank()) {
                if (!notificationRepository.existsByUserIdAndTypeAndReferenceId(requesterId, "BID_RECEIVED", offerId)) {
                    String title = "Request";
                    try {
                        title = jdbcTemplate.queryForObject("SELECT title FROM service_requests WHERE id = ?", String.class, requestId);
                    } catch (Exception e) {
                        logger.warn("BidPlacedListener: request title not found for requestId={}", requestId);
                    }

                    String providerName = "Provider";
                    try {
                        providerName = jdbcTemplate.queryForObject("SELECT full_name FROM users WHERE id = ?", String.class, providerId);
                    } catch (Exception e) {
                        logger.warn("BidPlacedListener: provider name not found for providerId={}", providerId);
                    }

                    com.knust.campusserv.support.model.Notification notification = new com.knust.campusserv.support.model.Notification();
                    notification.setId("ntf-" + java.util.UUID.randomUUID().toString());
                    notification.setUserId(requesterId);
                    notification.setTitle("New Bid Received");
                    notification.setMessage(providerName + " bid GHS " + String.format("%.2f", price) + " on your request '" + title + "'");
                    notification.setType("BID_RECEIVED");
                    notification.setReferenceId(offerId);
                    notification.setIsRead(false);
                    notificationRepository.save(notification);

                    messagingTemplate.convertAndSend("/topic/user/" + requesterId + "/notifications", notification);
                    logger.info("BidPlacedListener: saved and broadcasted BID_RECEIVED notification to student {}", requesterId);
                } else {
                    logger.info("BidPlacedListener: duplicate bid.placed event detected for offerId={}, ignoring", offerId);
                }
            }
        } catch (Exception e) {
            logger.error("BidPlacedListener: failed to relay STOMP message for event {}: {}", event, e.getMessage(), e);
        }
    }
}
