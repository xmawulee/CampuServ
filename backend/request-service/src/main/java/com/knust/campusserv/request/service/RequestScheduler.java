package com.knust.campusserv.request.service;

import com.knust.campusserv.request.model.Offer;
import com.knust.campusserv.request.model.ServiceRequest;
import com.knust.campusserv.request.repository.OfferRepository;
import com.knust.campusserv.request.repository.ServiceRequestRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class RequestScheduler {

    private static final Logger log = LoggerFactory.getLogger(RequestScheduler.class);

    @Autowired
    private ServiceRequestRepository requestRepository;

    @Autowired
    private OfferRepository offerRepository;

    @Scheduled(cron = "0 * * * * *")
    @Transactional
    public void processExpiredRequestWindows() {
        LocalDateTime now = LocalDateTime.now();
        log.debug("RequestScheduler: running check for expired request windows at {}", now);

        // 1. Find OPEN requests whose bid window has closed
        List<ServiceRequest> openExpired = requestRepository.findByStatusAndBidWindowClosesBefore("OPEN", now);
        for (ServiceRequest req : openExpired) {
            log.info("RequestScheduler: request {} bid window closed, transitioning to BIDDING_CLOSED", req.getId());
            req.setStatus("BIDDING_CLOSED");
            req.setUpdatedAt(now);
            requestRepository.save(req);
        }

        // 2. Find BIDDING_CLOSED requests whose selection window has expired (60 minutes past bidWindowCloses)
        List<ServiceRequest> selectionExpired = requestRepository.findByStatusAndBidWindowClosesBefore("BIDDING_CLOSED", now.minusMinutes(60));
        for (ServiceRequest req : selectionExpired) {
            log.info("RequestScheduler: request {} selection window expired, auto-cancelling request", req.getId());
            req.setStatus("CANCELLED");
            req.setUpdatedAt(now);
            requestRepository.save(req);

            // Decline all pending offers
            List<Offer> offers = offerRepository.findByRequestId(req.getId());
            for (Offer o : offers) {
                if ("PENDING".equals(o.getStatus())) {
                    o.setStatus("DECLINED");
                    offerRepository.save(o);
                    log.info("RequestScheduler: auto-declining offer {} for cancelled request {}", o.getId(), req.getId());
                }
            }
        }
    }
}
