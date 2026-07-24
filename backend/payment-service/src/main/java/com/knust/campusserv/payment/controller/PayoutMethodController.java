package com.knust.campusserv.payment.controller;

import com.knust.campusserv.payment.model.PayoutMethod;
import com.knust.campusserv.payment.repository.PayoutMethodRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/wallet/payout-methods")
public class PayoutMethodController {

    @Autowired
    private PayoutMethodRepository payoutMethodRepository;

    @PostMapping
    @Transactional
    public ResponseEntity<?> addPayoutMethod(@RequestBody PayoutMethod method,
                                             @RequestHeader("X-User-Id") String userId) {
        method.setId(UUID.randomUUID().toString());
        method.setUserId(userId);

        List<PayoutMethod> existing = payoutMethodRepository.findByUserIdOrderByCreatedAtDesc(userId);
        if (existing.isEmpty()) {
            method.setIsDefault(true);
        }

        PayoutMethod saved = payoutMethodRepository.save(method);
        return ResponseEntity.ok(saved);
    }

    @GetMapping
    public ResponseEntity<List<PayoutMethod>> getPayoutMethods(@RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(payoutMethodRepository.findByUserIdOrderByCreatedAtDesc(userId));
    }

    @PutMapping("/{id}/default")
    @Transactional
    public ResponseEntity<?> setDefaultPayoutMethod(@PathVariable("id") String id,
                                                    @RequestHeader("X-User-Id") String userId) {
        PayoutMethod method = payoutMethodRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Payout method not found"));

        if (!method.getUserId().equals(userId)) {
            return ResponseEntity.status(403).body("Not your payout method.");
        }

        List<PayoutMethod> existing = payoutMethodRepository.findByUserIdOrderByCreatedAtDesc(userId);
        for (PayoutMethod p : existing) {
            p.setIsDefault(false);
            payoutMethodRepository.save(p);
        }

        method.setIsDefault(true);
        payoutMethodRepository.save(method);

        return ResponseEntity.ok(method);
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> updatePayoutMethod(@PathVariable("id") String id,
                                                @RequestBody PayoutMethod request,
                                                @RequestHeader("X-User-Id") String userId) {
        PayoutMethod method = payoutMethodRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Payout method not found"));

        if (!method.getUserId().equals(userId)) {
            return ResponseEntity.status(403).body("Not your payout method.");
        }

        if (request.getType() != null) {
            method.setType(request.getType());
        }
        if (request.getProvider() != null) {
            method.setProvider(request.getProvider());
        }
        if (request.getAccountNumber() != null) {
            method.setAccountNumber(request.getAccountNumber());
        }
        if (request.getAccountName() != null) {
            method.setAccountName(request.getAccountName());
        }

        PayoutMethod saved = payoutMethodRepository.save(method);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deletePayoutMethod(@PathVariable("id") String id,
                                                @RequestHeader("X-User-Id") String userId) {
        PayoutMethod method = payoutMethodRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Payout method not found"));

        if (!method.getUserId().equals(userId)) {
            return ResponseEntity.status(403).body("Not your payout method.");
        }

        boolean wasDefault = Boolean.TRUE.equals(method.getIsDefault());
        payoutMethodRepository.delete(method);

        if (wasDefault) {
            List<PayoutMethod> remaining = payoutMethodRepository.findByUserIdOrderByCreatedAtDesc(userId);
            if (!remaining.isEmpty()) {
                PayoutMethod newDefault = remaining.get(0);
                newDefault.setIsDefault(true);
                payoutMethodRepository.save(newDefault);
            }
        }

        return ResponseEntity.ok().build();
    }
}
