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
        } catch (Exception e) {
            logger.error("BidPlacedListener: failed to relay STOMP message for event {}: {}", event, e.getMessage(), e);
        }
    }
}
