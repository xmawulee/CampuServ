package com.knust.campusserv.support.service;

import com.knust.campusserv.support.model.Dispute;
import com.knust.campusserv.support.model.DisputeEvidence;
import com.knust.campusserv.support.repository.DisputeEvidenceRepository;
import com.knust.campusserv.support.repository.DisputeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class DisputeService {

    @Autowired
    private DisputeRepository disputeRepository;

    @Autowired
    private DisputeEvidenceRepository evidenceRepository;

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Transactional
    public Dispute raiseDispute(String jobId, String raisedById, String reason) {
        // Only requester or accepted provider can raise
        Map<String, Object> job = restTemplate.getForObject("http://job-service/jobs/" + jobId, Map.class);
        if (job == null) throw new IllegalArgumentException("Job not found");

        String requesterId = (String) job.get("requesterId");
        String providerId = (String) job.get("providerId");

        if (!raisedById.equals(requesterId) && !raisedById.equals(providerId)) {
            throw new IllegalArgumentException("Only the requester or provider can raise a dispute for this job.");
        }

        // Set job status to DISPUTED
        jdbcTemplate.update("UPDATE jobs SET status = 'DISPUTED' WHERE id = ?", jobId);

        Dispute dispute = new Dispute();
        dispute.setId(UUID.randomUUID().toString());
        dispute.setJobId(jobId);
        dispute.setRaisedById(raisedById);
        dispute.setReason(reason);
        dispute.setStatus(Dispute.DisputeStatus.OPEN);

        return disputeRepository.save(dispute);
    }

    public DisputeEvidence addEvidence(String disputeId, String userId, String fileUrl, String description) {
        Dispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new IllegalArgumentException("Dispute not found"));

        if (dispute.getStatus() == Dispute.DisputeStatus.RESOLVED) {
            throw new IllegalStateException("Cannot add evidence to a resolved dispute.");
        }

        DisputeEvidence evidence = new DisputeEvidence();
        evidence.setId(UUID.randomUUID().toString());
        evidence.setDisputeId(disputeId);
        evidence.setUploadedByUserId(userId);
        evidence.setFileUrl(fileUrl);
        evidence.setDescription(description);

        return evidenceRepository.save(evidence);
    }

    public Dispute getDispute(String disputeId) {
        return disputeRepository.findById(disputeId)
                .orElseThrow(() -> new IllegalArgumentException("Dispute not found"));
    }

    public List<DisputeEvidence> getEvidenceForDispute(String disputeId) {
        return evidenceRepository.findByDisputeIdOrderByCreatedAtAsc(disputeId);
    }

    public Page<Dispute> getDisputes(Dispute.DisputeStatus status, Pageable pageable) {
        if (status != null) {
            return disputeRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
        }
        return disputeRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    @Transactional
    public Dispute resolveDispute(String disputeId, Dispute.DisputeResolution resolution, String note, String adminId) {
        Dispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new IllegalArgumentException("Dispute not found"));

        dispute.setStatus(Dispute.DisputeStatus.RESOLVED);
        dispute.setResolution(resolution);
        dispute.setResolvedByAdminId(adminId);
        dispute.setResolvedAt(LocalDateTime.now());

        // Call payment-service
        try {
            if (resolution == Dispute.DisputeResolution.REFUND_REQUESTER) {
                restTemplate.put("http://payment-service/payments/refund?jobId=" + dispute.getJobId(), null);
            } else if (resolution == Dispute.DisputeResolution.SPLIT) {
                restTemplate.put("http://payment-service/payments/escrow/split?jobId=" + dispute.getJobId() + "&providerPercentage=50", null);
            } else if (resolution == Dispute.DisputeResolution.RELEASE_TO_PROVIDER) {
                restTemplate.put("http://payment-service/payments/release?jobId=" + dispute.getJobId(), null);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to process dispute payment resolution: " + e.getMessage(), e);
        }

        // Update job status to COMPLETED (it's resolved)
        jdbcTemplate.update("UPDATE jobs SET status = 'COMPLETED' WHERE id = ?", dispute.getJobId());

        return disputeRepository.save(dispute);
    }
}
