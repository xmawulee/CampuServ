package com.knust.campusserv.request.messaging;

import com.knust.campusserv.request.model.*;
import com.knust.campusserv.request.repository.*;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class RequestDeletionConsumer {

    @Autowired
    private ServiceRequestRepository serviceRequestRepository;

    @Autowired
    private OfferRepository offerRepository;

    @Autowired
    private RequestAttachmentRepository requestAttachmentRepository;

    @Autowired
    private RequestLocationRepository requestLocationRepository;

    @Autowired
    private RabbitTemplate rabbitTemplate;

    @RabbitListener(queues = "request-service.account.deletion")
    @Transactional
    public void handleAccountDeletion(Map<String, String> payload) {
        String userId = payload.get("userId");
        if (userId == null) return;

        System.out.println("[RequestDeletionConsumer] Starting deletion processing for userId: " + userId);

        // 1. Process requests where this user is the requester
        List<ServiceRequest> myRequests = serviceRequestRepository.findByRequesterId(userId);
        for (ServiceRequest req : myRequests) {
            if ("COMPLETED".equals(req.getStatus())) {
                // Retain completed requests for financial audit, but anonymize requester ID
                req.setRequesterId("DELETED");
                if (req.getTargetProviderId() != null && req.getTargetProviderId().equals(userId)) {
                    req.setTargetProviderId("DELETED");
                }
                serviceRequestRepository.save(req);
            } else {
                // Hard delete draft, open, assigned, or cancelled requests
                // Delete attachments
                List<RequestAttachment> attachments = requestAttachmentRepository.findByServiceRequestId(req.getId());
                requestAttachmentRepository.deleteAll(attachments);

                // Delete location
                Optional<RequestLocation> locationOpt = requestLocationRepository.findByRequestId(req.getId());
                locationOpt.ifPresent(requestLocation -> requestLocationRepository.delete(requestLocation));

                // Delete offers made to this request
                List<Offer> offers = offerRepository.findByRequestId(req.getId());
                offerRepository.deleteAll(offers);

                // Delete request
                serviceRequestRepository.delete(req);
            }
        }

        // 2. Process offers made by this user (as a provider)
        List<Offer> myOffers = offerRepository.findByProviderId(userId);
        for (Offer offer : myOffers) {
            if ("ACCEPTED".equals(offer.getStatus())) {
                // Retain accepted offers of completed jobs, but anonymize provider ID
                offer.setProviderId("DELETED");
                offerRepository.save(offer);
            } else {
                // Delete pending or declined offers
                offerRepository.delete(offer);
            }
        }

        System.out.println("[RequestDeletionConsumer] Completed request-service cleanup for: " + userId);

        // 3. Send acknowledgment event
        Map<String, String> ack = new HashMap<>();
        ack.put("userId", userId);
        ack.put("serviceName", "request-service");
        rabbitTemplate.convertAndSend("account.deletion.acknowledgment", ack);
    }
}
