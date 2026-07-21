package com.knust.campusserv.payment.controller;

import com.knust.campusserv.payment.model.*;
import com.knust.campusserv.payment.repository.*;
import com.knust.campusserv.payment.dto.TransactionReceiptDto;
import com.knust.campusserv.payment.service.WithdrawalService;
import com.knust.campusserv.payment.util.CommissionUtils;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/payments")
public class PaymentController {

    private static final Logger log = LoggerFactory.getLogger(PaymentController.class);

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private StudentWalletRepository studentWalletRepository;

    @Autowired
    private ProviderWalletRepository providerWalletRepository;

    @Autowired
    private StudentWalletTransactionRepository studentWalletTransactionRepository;

    @Autowired
    private ProviderWalletTransactionRepository providerWalletTransactionRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private WithdrawalService withdrawalService;

    @Value("${paystack.secret.key:placeholder_secret}")
    private String paystackSecret;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private com.knust.campusserv.payment.service.PaystackService paystackService;

    @PostMapping("/initiate")
    public ResponseEntity<?> initiatePayment(@RequestBody Map<String, Object> body,
                                             @RequestHeader(value = "X-User-Id", required = false) String userId) {
        String jobId = (String) body.get("jobId");
        BigDecimal amount = new BigDecimal(body.get("amount").toString());

        String reference = "ref-" + UUID.randomUUID().toString().substring(0, 12);
        
        Transaction tx = new Transaction();
        tx.setId("tx-" + UUID.randomUUID().toString());
        tx.setJobId(jobId);
        tx.setAmount(amount);
        tx.setPaystackReference(reference);
        tx.setStatus("INITIATED");
        tx.setEscrowStatus("INITIATED");
        
        populateReceiptFields(tx);
        transactionRepository.save(tx);

        String payerEmail = "customer@campusserv.com";
        if (userId != null) {
            try {
                payerEmail = jdbcTemplate.queryForObject(
                        "SELECT email FROM users WHERE id = ?", String.class, userId.trim());
            } catch (Exception e) {
                log.warn("Could not find email for user: {}", userId);
            }
        }

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("jobId", jobId);
        metadata.put("type", "escrow_payment");

        Map<String, String> paystackResult = paystackService.initializeTransaction(
                payerEmail, amount, reference, metadata);

        Map<String, String> response = new HashMap<>();
        response.put("reference", paystackResult.getOrDefault("reference", reference));
        response.put("checkoutUrl", paystackResult.get("authorization_url"));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/webhook")
    @Transactional
    public ResponseEntity<?> handlePaystackWebhook(
            @RequestHeader(value = "x-paystack-signature", required = false) String signature,
            @RequestBody String requestBody) {

        log.info("Received Paystack webhook notification. Signature: {}", signature);

        Map<String, Object> payload;
        try {
            payload = objectMapper.readValue(requestBody, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.error("Failed to parse Paystack webhook body: {}", e.getMessage());
            return ResponseEntity.badRequest().body("Invalid JSON");
        }

        String event = (String) payload.get("event");
        Map<String, Object> dataObj = (Map<String, Object>) payload.get("data");
        
        String reference = null;
        BigDecimal amount = BigDecimal.ZERO;

        if (dataObj != null) {
            reference = (String) dataObj.get("reference");
            if (dataObj.containsKey("amount")) {
                amount = new BigDecimal(dataObj.get("amount").toString()).divide(new BigDecimal("100.00"));
            }
        }

        // Handle Transfer Webhooks (Withdrawals)
        if ("transfer.success".equals(event) || "transfer.failed".equals(event) || "transfer.reversed".equals(event)) {
            if (dataObj != null && dataObj.containsKey("transfer_code")) {
                reference = (String) dataObj.get("transfer_code");
            }
            
            Optional<ProviderWalletTransaction> wTxOpt = providerWalletTransactionRepository.findByReferenceId(reference);
            if (wTxOpt.isPresent()) {
                ProviderWalletTransaction wTx = wTxOpt.get();
                if (!"PENDING".equals(wTx.getStatus())) {
                    return ResponseEntity.ok("Transfer already processed.");
                }
                
                if ("transfer.success".equals(event)) {
                    wTx.setStatus("SUCCESS");
                    wTx.setNarration("Earnings Withdrawal Successful");
                } else {
                    wTx.setStatus("FAILED");
                    wTx.setNarration("Earnings Withdrawal Failed");
                    
                    // Refund Provider Wallet
                    ProviderWallet wallet = providerWalletRepository.findByUserIdForWrite(wTx.getUserId())
                            .orElseThrow(() -> new IllegalArgumentException("Provider wallet not initialized."));
                    wallet.setBalance(wallet.getBalance().add(wTx.getAmount()));
                    wallet.setUpdatedAt(LocalDateTime.now());
                    providerWalletRepository.save(wallet);
                }
                providerWalletTransactionRepository.save(wTx);
            }
            return ResponseEntity.ok("Transfer webhook processed.");
        }

        if (reference == null) {
            return ResponseEntity.ok("Event ignored or unrecognized format.");
        }

        // Handle deposits via Paystack
        Optional<StudentWalletTransaction> wTxOpt = studentWalletTransactionRepository.findByReferenceId(reference);
        if (wTxOpt.isPresent()) {
            StudentWalletTransaction wTx = wTxOpt.get();
            if (!"PENDING".equals(wTx.getStatus())) {
                return ResponseEntity.ok("Wallet transaction already processed.");
            }
            wTx.setStatus("SUCCESS");

            StudentWallet wallet = studentWalletRepository.findByUserIdForWrite(wTx.getUserId())
                    .orElseGet(() -> {
                        StudentWallet newWallet = new StudentWallet(wTx.getUserId());
                        return studentWalletRepository.save(newWallet);
                    });

            wTx.setBalanceBefore(wallet.getBalance());
            wallet.setBalance(wallet.getBalance().add(wTx.getAmount()));
            wallet.setUpdatedAt(LocalDateTime.now());
            studentWalletRepository.save(wallet);
            wTx.setBalanceAfter(wallet.getBalance());

            studentWalletTransactionRepository.save(wTx);
            return ResponseEntity.ok("Wallet deposit webhook processed successfully.");
        }

        // Job payment webhook
        Optional<Transaction> txOpt = transactionRepository.findByPaystackReference(reference);
        if (txOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Transaction reference not found.");
        }

        Transaction tx = txOpt.get();
        if (!"INITIATED".equals(tx.getStatus())) {
            return ResponseEntity.ok("Transaction already processed.");
        }

        boolean isDeposit = tx.getJobId() != null && tx.getJobId().startsWith("deposit-");
        tx.setStatus(isDeposit ? "RELEASED" : "HELD");
        tx.setConfirmedAt(LocalDateTime.now());
        tx.setUpdatedAt(LocalDateTime.now());
        populateReceiptFields(tx);
        transactionRepository.save(tx);

        if (isDeposit) {
            String userId = tx.getJobId().substring(8);
            StudentWallet wallet = studentWalletRepository.findByUserIdForWrite(userId)
                    .orElseGet(() -> {
                        StudentWallet newWallet = new StudentWallet(userId);
                        return studentWalletRepository.save(newWallet);
                    });

            wallet.setBalance(wallet.getBalance().add(tx.getAmount()));
            wallet.setUpdatedAt(LocalDateTime.now());
            studentWalletRepository.save(wallet);
        } else {
            String requesterId = null;
            try {
                requesterId = jdbcTemplate.queryForObject(
                        "SELECT requester_id FROM jobs WHERE id = ?", String.class, tx.getJobId()
                );
            } catch (Exception e) {
                log.error("Job not found in database for native query: {}", tx.getJobId(), e);
            }

            if (requesterId != null) {
                final String finalRequesterId = requesterId;
                StudentWallet wallet = studentWalletRepository.findByUserIdForWrite(finalRequesterId)
                        .orElseGet(() -> {
                            StudentWallet newWallet = new StudentWallet(finalRequesterId);
                            return studentWalletRepository.save(newWallet);
                        });

                wallet.setHeldBalance(wallet.getHeldBalance().add(tx.getAmount()));
                wallet.setUpdatedAt(LocalDateTime.now());
                studentWalletRepository.save(wallet);
            }
        }

        return ResponseEntity.ok("Webhook processed successfully.");
    }

    @PostMapping("/wallet/deposit")
    public ResponseEntity<?> depositFunds(@RequestHeader("X-User-Id") String userId,
                                          @RequestBody Map<String, Object> body) {
        BigDecimal amount = new BigDecimal(body.get("amount").toString());
        String provider = (String) body.get("gateway");
        if (provider == null || provider.trim().isEmpty()) {
            provider = "paystack";
        }
        provider = provider.toLowerCase().trim();

        String reference = "ref-dep-" + UUID.randomUUID().toString().substring(0, 12);
        
        Transaction tx = new Transaction();
        tx.setId("tx-" + UUID.randomUUID().toString());
        tx.setJobId("deposit-" + userId);
        tx.setAmount(amount);
        tx.setPaystackReference(reference);
        tx.setStatus("INITIATED");
        tx.setEscrowStatus("RELEASED_TO_PROVIDER");
        
        transactionRepository.save(tx);

        String payerEmail = "customer@campusserv.com";
        try {
            payerEmail = jdbcTemplate.queryForObject(
                    "SELECT email FROM users WHERE id = ?", String.class, userId.trim());
        } catch (Exception e) {
            log.warn("Could not look up user email for deposit: {}", e.getMessage());
        }

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("userId", userId);
        metadata.put("type", "wallet_deposit");

        Map<String, String> paystackResult = paystackService.initializeTransaction(
                payerEmail, amount, reference, metadata);

        Map<String, String> response = new HashMap<>();
        response.put("reference", paystackResult.getOrDefault("reference", reference));
        response.put("checkoutUrl", paystackResult.get("authorization_url"));
        response.put("gateway", provider);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/escrow/lock")
    @Transactional
    public ResponseEntity<?> lockEscrow(@RequestBody Map<String, Object> body) {
        String userId = (String) body.get("userId");
        String jobId = (String) body.get("jobId");
        BigDecimal amount = new BigDecimal(body.get("amount").toString());

        Optional<Transaction> existingTx = transactionRepository.findByJobId(jobId);
        if (existingTx.isPresent()) {
            return ResponseEntity.ok("Funds secured in escrow (idempotent).");
        }

        StudentWallet wallet = studentWalletRepository.findByUserIdForWrite(userId)
                .orElseThrow(() -> new IllegalArgumentException("Student wallet not initialized."));

        if (wallet.getBalance().compareTo(amount) < 0) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Insufficient wallet balance.");
        }

        BigDecimal balanceBefore = wallet.getBalance();
        wallet.setBalance(balanceBefore.subtract(amount));
        wallet.setHeldBalance(wallet.getHeldBalance().add(amount));
        wallet.setUpdatedAt(LocalDateTime.now());
        studentWalletRepository.save(wallet);

        String reference = "esc-" + UUID.randomUUID().toString().substring(0, 12);
        Transaction tx = new Transaction();
        tx.setId("tx-" + UUID.randomUUID().toString());
        tx.setJobId(jobId);
        tx.setAmount(amount);
        tx.setPaystackReference(reference);
        tx.setStatus("HELD");
        tx.setEscrowStatus("HELD");
        tx.setConfirmedAt(LocalDateTime.now());
        
        populateReceiptFields(tx);
        transactionRepository.save(tx);

        // Record Student ESCROW_HOLD ledger entry
        StudentWalletTransaction wTx = new StudentWalletTransaction();
        wTx.setWalletTxnId("SWTXN-HOLD-" + UUID.randomUUID().toString().substring(0, 10));
        wTx.setUserId(userId);
        wTx.setType("ESCROW_HOLD");
        wTx.setStatus("SUCCESS");
        wTx.setAmount(amount);
        wTx.setBalanceBefore(balanceBefore);
        wTx.setBalanceAfter(wallet.getBalance());
        wTx.setCurrency("GHS");
        wTx.setRelatedJobId(jobId);
        wTx.setNarration("Funds locked in escrow for Job " + jobId);
        wTx.setCreatedAt(LocalDateTime.now());
        studentWalletTransactionRepository.save(wTx);

        return ResponseEntity.ok("Funds secured in escrow.");
    }

    @PutMapping("/release")
    @Transactional
    public ResponseEntity<?> releasePayment(@RequestParam("jobId") String jobId) {
        Optional<Transaction> txOpt = transactionRepository.findByJobId(jobId);
        if (txOpt.isEmpty() && jobId != null && jobId.startsWith("job-")) {
            try {
                String reqId = jdbcTemplate.queryForObject(
                        "SELECT request_id FROM jobs WHERE id = ?", String.class, jobId
                );
                if (reqId != null) {
                    txOpt = transactionRepository.findByJobId(reqId);
                }
            } catch (Exception e) {
                log.warn("Could not lookup request_id for jobId {}: {}", jobId, e.getMessage());
            }
        }
        if (txOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Transaction not found for job.");
        }

        Transaction tx = txOpt.get();
        if ("RELEASED".equals(tx.getStatus())) {
            return ResponseEntity.ok("Escrow funds released (idempotent).");
        }
        if (!"HELD".equals(tx.getStatus())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Funds are not in HELD status.");
        }

        tx.setStatus("RELEASED");
        tx.setEscrowReleasedAt(LocalDateTime.now());
        tx.setEscrowStatus("RELEASED_TO_PROVIDER");
        tx.setUpdatedAt(LocalDateTime.now());

        // The escrow holds (basePrice + 5% service fee). Recover the base price and fee:
        // totalEscrow = basePrice * 1.05  =>  basePrice = totalEscrow / 1.05
        // platformFee = totalEscrow - basePrice (the service fee already charged to student)
        BigDecimal totalEscrow = tx.getAmount();
        BigDecimal divisor = new BigDecimal("1.05");
        BigDecimal basePrice = totalEscrow.divide(divisor, 10, java.math.RoundingMode.HALF_UP)
                                         .setScale(2, java.math.RoundingMode.HALF_UP);
        BigDecimal platformFee = totalEscrow.subtract(basePrice).setScale(2, java.math.RoundingMode.HALF_UP);
        // Provider receives 100% of the agreed bid price
        BigDecimal netPayout = basePrice;
        
        tx.setPlatformCommission(platformFee);
        tx.setProviderPayout(netPayout);
        transactionRepository.save(tx);

        String requesterId = null;
        String providerId = null;
        try {
            Map<String, Object> jobMap = jdbcTemplate.queryForMap(
                    "SELECT requester_id, provider_id FROM jobs WHERE id = ?", jobId
            );
            requesterId = (String) jobMap.get("requester_id");
            providerId = (String) jobMap.get("provider_id");
        } catch (Exception e) {
            log.error("Could not lookup job details via JDBC template: {}", e.getMessage(), e);
        }

        if (requesterId != null && providerId != null) {
            // 1. Deduct pending escrow from requester
            StudentWallet reqWallet = studentWalletRepository.findByUserIdForWrite(requesterId)
                    .orElseThrow(() -> new IllegalArgumentException("Requester wallet not initialized."));
            
            BigDecimal reqBalanceBefore = reqWallet.getBalance();
            reqWallet.setHeldBalance(reqWallet.getHeldBalance().subtract(tx.getAmount()));
            reqWallet.setUpdatedAt(LocalDateTime.now());
            studentWalletRepository.save(reqWallet);

            // Record Student ESCROW_RELEASE ledger entry
            StudentWalletTransaction swTx = new StudentWalletTransaction();
            swTx.setWalletTxnId("SWTXN-REL-" + UUID.randomUUID().toString().substring(0, 10));
            swTx.setUserId(requesterId);
            swTx.setType("ESCROW_RELEASE");
            swTx.setStatus("SUCCESS");
            swTx.setAmount(tx.getAmount());
            swTx.setBalanceBefore(reqBalanceBefore);
            swTx.setBalanceAfter(reqWallet.getBalance());
            swTx.setCurrency("GHS");
            swTx.setRelatedJobId(jobId);
            swTx.setNarration("Escrow released to provider for Job " + jobId);
            swTx.setCreatedAt(LocalDateTime.now());
            studentWalletTransactionRepository.save(swTx);

            // 2. Add net payout to provider earnings wallet
            final String finalProviderId = providerId;
            ProviderWallet provWallet = providerWalletRepository.findByUserIdForWrite(finalProviderId)
                    .orElseGet(() -> {
                        ProviderWallet newWallet = new ProviderWallet(finalProviderId);
                        return providerWalletRepository.save(newWallet);
                    });

            BigDecimal provBalanceBefore = provWallet.getBalance();
            BigDecimal provBalanceAfter = provBalanceBefore.add(netPayout);
            provWallet.setBalance(provBalanceAfter);
            provWallet.setUpdatedAt(LocalDateTime.now());
            providerWalletRepository.save(provWallet);

            // Record Provider JOB_PAYOUT ledger entry
            ProviderWalletTransaction pwTx1 = new ProviderWalletTransaction();
            pwTx1.setWalletTxnId("PWTXN-PAY-" + UUID.randomUUID().toString().substring(0, 10));
            pwTx1.setUserId(providerId);
            pwTx1.setType("JOB_PAYOUT");
            pwTx1.setStatus("SUCCESS");
            pwTx1.setAmount(netPayout);
            pwTx1.setBalanceBefore(provBalanceBefore);
            pwTx1.setBalanceAfter(provBalanceAfter);
            pwTx1.setCurrency("GHS");
            pwTx1.setRelatedJobId(jobId);
            pwTx1.setNarration("Earnings payout for Job " + jobId);
            pwTx1.setCreatedAt(LocalDateTime.now());
            providerWalletTransactionRepository.save(pwTx1);

            // Record Provider COMMISSION_DEDUCTED ledger entry (visible item)
            ProviderWalletTransaction pwTx2 = new ProviderWalletTransaction();
            pwTx2.setWalletTxnId("PWTXN-COM-" + UUID.randomUUID().toString().substring(0, 10));
            pwTx2.setUserId(providerId);
            pwTx2.setType("COMMISSION_DEDUCTED");
            pwTx2.setStatus("SUCCESS");
            pwTx2.setAmount(platformFee);
            // Balance is unchanged here because netPayout was already balance after commission deduction
            pwTx2.setBalanceBefore(provBalanceAfter);
            pwTx2.setBalanceAfter(provBalanceAfter);
            pwTx2.setCurrency("GHS");
            pwTx2.setRelatedJobId(jobId);
            pwTx2.setNarration("5% Platform Service Fee (charged to student, not deducted from provider)");
            pwTx2.setCreatedAt(LocalDateTime.now());
            providerWalletTransactionRepository.save(pwTx2);

            // 3. Add fee to Admin wallet (Student Wallet for administration account)
            StudentWallet adminWallet = studentWalletRepository.findByUserIdForWrite("usr-admin")
                    .orElseGet(() -> {
                        StudentWallet newWallet = new StudentWallet("usr-admin");
                        return studentWalletRepository.save(newWallet);
                    });
            adminWallet.setBalance(adminWallet.getBalance().add(platformFee));
            adminWallet.setUpdatedAt(LocalDateTime.now());
            studentWalletRepository.save(adminWallet);
        }

        return ResponseEntity.ok("Escrow funds released.");
    }

    @PutMapping("/refund")
    @Transactional
    public ResponseEntity<?> refundPayment(@RequestParam("jobId") String jobId) {
        Optional<Transaction> txOpt = transactionRepository.findByJobId(jobId);
        if (txOpt.isEmpty() && jobId != null && jobId.startsWith("job-")) {
            try {
                String reqId = jdbcTemplate.queryForObject(
                        "SELECT request_id FROM jobs WHERE id = ?", String.class, jobId
                );
                if (reqId != null) {
                    txOpt = transactionRepository.findByJobId(reqId);
                }
            } catch (Exception e) {
                log.warn("Could not lookup request_id for jobId {}: {}", jobId, e.getMessage());
            }
        }
        if (txOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Transaction not found.");
        }

        Transaction tx = txOpt.get();
        if ("REFUNDED".equals(tx.getStatus())) {
            return ResponseEntity.ok("Escrow payment fully refunded to requester (idempotent).");
        }
        if (!"HELD".equals(tx.getStatus())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Transaction cannot be refunded.");
        }

        tx.setStatus("REFUNDED");
        tx.setEscrowStatus("REFUNDED_TO_STUDENT");
        tx.setUpdatedAt(LocalDateTime.now());
        transactionRepository.save(tx);

        String requesterId = null;
        try {
            requesterId = jdbcTemplate.queryForObject(
                    "SELECT requester_id FROM jobs WHERE id = ?", String.class, jobId
            );
        } catch (Exception e) {
            log.error("Could not lookup job requester for refund: {}", jobId, e);
        }

        if (requesterId != null) {
            StudentWallet wallet = studentWalletRepository.findByUserIdForWrite(requesterId)
                    .orElseThrow(() -> new IllegalArgumentException("Requester wallet not initialized."));
            
            BigDecimal balanceBefore = wallet.getBalance();
            wallet.setHeldBalance(wallet.getHeldBalance().subtract(tx.getAmount()));
            wallet.setBalance(balanceBefore.add(tx.getAmount()));
            wallet.setUpdatedAt(LocalDateTime.now());
            studentWalletRepository.save(wallet);

            // Record Student ESCROW_REFUND ledger entry
            StudentWalletTransaction wTx = new StudentWalletTransaction();
            wTx.setWalletTxnId("SWTXN-REF-" + UUID.randomUUID().toString().substring(0, 10));
            wTx.setUserId(requesterId);
            wTx.setType("ESCROW_REFUND");
            wTx.setStatus("SUCCESS");
            wTx.setAmount(tx.getAmount());
            wTx.setBalanceBefore(balanceBefore);
            wTx.setBalanceAfter(wallet.getBalance());
            wTx.setCurrency("GHS");
            wTx.setRelatedJobId(jobId);
            wTx.setNarration("Escrow refunded for Job " + jobId);
            wTx.setCreatedAt(LocalDateTime.now());
            studentWalletTransactionRepository.save(wTx);
        }

        return ResponseEntity.ok("Escrow payment fully refunded to requester.");
    }

    @PutMapping("/escrow/split")
    @Transactional
    public ResponseEntity<?> splitPayment(@RequestParam("jobId") String jobId, @RequestParam("providerPercentage") int providerPercentage) {
        if (providerPercentage < 0 || providerPercentage > 100) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid percentage.");
        }

        Optional<Transaction> txOpt = transactionRepository.findByJobId(jobId);
        if (txOpt.isEmpty() && jobId != null && jobId.startsWith("job-")) {
            try {
                String reqId = jdbcTemplate.queryForObject(
                        "SELECT request_id FROM jobs WHERE id = ?", String.class, jobId
                );
                if (reqId != null) {
                    txOpt = transactionRepository.findByJobId(reqId);
                }
            } catch (Exception e) {
                log.warn("Could not lookup request_id for jobId {}: {}", jobId, e.getMessage());
            }
        }
        if (txOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Transaction not found.");
        }

        Transaction tx = txOpt.get();
        if ("SPLIT".equals(tx.getStatus())) {
            return ResponseEntity.ok("Escrow split completed (idempotent).");
        }
        if (!"HELD".equals(tx.getStatus())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Transaction is not held in escrow.");
        }

        tx.setStatus("SPLIT");
        tx.setEscrowStatus("PARTIALLY_RELEASED");
        tx.setUpdatedAt(LocalDateTime.now());

        BigDecimal totalAmount = tx.getAmount();
        BigDecimal divisor = new BigDecimal("1.05");
        BigDecimal basePrice = totalAmount.divide(divisor, 10, java.math.RoundingMode.HALF_UP)
                                         .setScale(2, java.math.RoundingMode.HALF_UP);
        BigDecimal totalPlatformFee = totalAmount.subtract(basePrice).setScale(2, java.math.RoundingMode.HALF_UP);

        BigDecimal providerPercentageDec = new BigDecimal(providerPercentage).divide(new BigDecimal(100), 10, java.math.RoundingMode.HALF_UP);

        BigDecimal netPayout = basePrice.multiply(providerPercentageDec).setScale(2, java.math.RoundingMode.HALF_UP);
        BigDecimal platformFee = totalPlatformFee.multiply(providerPercentageDec).setScale(2, java.math.RoundingMode.HALF_UP);
        BigDecimal requesterRefund = totalAmount.subtract(netPayout).subtract(platformFee);

        tx.setPlatformCommission(platformFee);
        tx.setProviderPayout(netPayout);
        transactionRepository.save(tx);

        String requesterId = null;
        String providerId = null;
        try {
            Map<String, Object> jobMap = jdbcTemplate.queryForMap(
                    "SELECT requester_id, provider_id FROM jobs WHERE id = ?", jobId
            );
            requesterId = (String) jobMap.get("requester_id");
            providerId = (String) jobMap.get("provider_id");
        } catch (Exception e) {
            log.error("Could not lookup job details: {}", e.getMessage(), e);
        }

        if (requesterId != null && providerId != null) {
            // 1. Handle Requester: deduct total from held, refund their share to balance
            StudentWallet reqWallet = studentWalletRepository.findByUserIdForWrite(requesterId)
                    .orElseThrow(() -> new IllegalArgumentException("Requester wallet not initialized."));
            
            BigDecimal reqBalanceBefore = reqWallet.getBalance();
            reqWallet.setHeldBalance(reqWallet.getHeldBalance().subtract(totalAmount));
            reqWallet.setBalance(reqBalanceBefore.add(requesterRefund));
            reqWallet.setUpdatedAt(LocalDateTime.now());
            studentWalletRepository.save(reqWallet);

            // Record Student ESCROW_REFUND ledger entry for the split refund
            StudentWalletTransaction swTx = new StudentWalletTransaction();
            swTx.setWalletTxnId("SWTXN-SPL-" + UUID.randomUUID().toString().substring(0, 10));
            swTx.setUserId(requesterId);
            swTx.setType("ESCROW_REFUND");
            swTx.setStatus("SUCCESS");
            swTx.setAmount(requesterRefund);
            swTx.setBalanceBefore(reqBalanceBefore);
            swTx.setBalanceAfter(reqWallet.getBalance());
            swTx.setCurrency("GHS");
            swTx.setRelatedJobId(jobId);
            swTx.setNarration("Escrow split refund for Job " + jobId);
            swTx.setCreatedAt(LocalDateTime.now());
            studentWalletTransactionRepository.save(swTx);

            // 2. Add net payout to provider earnings wallet
            final String finalProviderId = providerId;
            ProviderWallet provWallet = providerWalletRepository.findByUserIdForWrite(finalProviderId)
                    .orElseGet(() -> {
                        ProviderWallet newWallet = new ProviderWallet(finalProviderId);
                        return providerWalletRepository.save(newWallet);
                    });

            BigDecimal provBalanceBefore = provWallet.getBalance();
            BigDecimal provBalanceAfter = provBalanceBefore.add(netPayout);
            provWallet.setBalance(provBalanceAfter);
            provWallet.setUpdatedAt(LocalDateTime.now());
            providerWalletRepository.save(provWallet);

            // Record Provider JOB_PAYOUT ledger entry
            ProviderWalletTransaction pwTx1 = new ProviderWalletTransaction();
            pwTx1.setWalletTxnId("PWTXN-SPL-PAY-" + UUID.randomUUID().toString().substring(0, 8));
            pwTx1.setUserId(providerId);
            pwTx1.setType("JOB_PAYOUT");
            pwTx1.setStatus("SUCCESS");
            pwTx1.setAmount(netPayout);
            pwTx1.setBalanceBefore(provBalanceBefore);
            pwTx1.setBalanceAfter(provBalanceAfter);
            pwTx1.setCurrency("GHS");
            pwTx1.setRelatedJobId(jobId);
            pwTx1.setNarration("Split earnings payout for Job " + jobId);
            pwTx1.setCreatedAt(LocalDateTime.now());
            providerWalletTransactionRepository.save(pwTx1);

            // Record Provider COMMISSION_DEDUCTED ledger entry
            ProviderWalletTransaction pwTx2 = new ProviderWalletTransaction();
            pwTx2.setWalletTxnId("PWTXN-SPL-COM-" + UUID.randomUUID().toString().substring(0, 8));
            pwTx2.setUserId(providerId);
            pwTx2.setType("COMMISSION_DEDUCTED");
            pwTx2.setStatus("SUCCESS");
            pwTx2.setAmount(platformFee);
            pwTx2.setBalanceBefore(provBalanceAfter);
            pwTx2.setBalanceAfter(provBalanceAfter);
            pwTx2.setCurrency("GHS");
            pwTx2.setRelatedJobId(jobId);
            pwTx2.setNarration("Split Platform Commission deducted");
            pwTx2.setCreatedAt(LocalDateTime.now());
            providerWalletTransactionRepository.save(pwTx2);

            // 3. Add fee to Admin wallet
            StudentWallet adminWallet = studentWalletRepository.findByUserIdForWrite("usr-admin")
                    .orElseGet(() -> {
                        StudentWallet newWallet = new StudentWallet("usr-admin");
                        return studentWalletRepository.save(newWallet);
                    });
            adminWallet.setBalance(adminWallet.getBalance().add(platformFee));
            adminWallet.setUpdatedAt(LocalDateTime.now());
            studentWalletRepository.save(adminWallet);
        }

        return ResponseEntity.ok("Escrow split: " + providerPercentage + "% to provider, rest refunded.");
    }

    @GetMapping("/transactions")
    public ResponseEntity<?> getTransactions(@RequestParam("userId") String userId,
                                            @RequestParam(value = "page", defaultValue = "0") int page,
                                            @RequestParam(value = "size", defaultValue = "20") int size) {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        org.springframework.data.domain.Page<Transaction> txPage = transactionRepository.findByUserId(userId, pageable);
        
        org.springframework.data.domain.Page<TransactionReceiptDto> dtoPage = txPage.map(TransactionReceiptDto::new);
        return ResponseEntity.ok(dtoPage);
    }

    @GetMapping("/transactions/{transactionId}")
    public ResponseEntity<?> getTransactionById(@PathVariable("transactionId") String transactionId) {
        Optional<Transaction> txOpt = transactionRepository.findById(transactionId);
        if (txOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Transaction not found.");
        }
        return ResponseEntity.ok(new TransactionReceiptDto(txOpt.get()));
    }

    private void populateReceiptFields(Transaction tx) {
        if (tx.getJobId() == null || tx.getJobId().startsWith("deposit-")) {
            return;
        }
        try {
            Map<String, Object> details = jdbcTemplate.queryForMap(
                "SELECT " +
                "  r.title AS service_title, " +
                "  c.name AS service_category, " +
                "  r.description AS service_description, " +
                "  r.location AS campus_zone, " +
                "  req.full_name AS payer_name, " +
                "  req.email AS payer_email, " +
                "  req.id AS payer_id, " +
                "  prov.full_name AS provider_name, " +
                "  prov.id AS provider_id " +
                "FROM jobs j " +
                "JOIN service_requests r ON j.request_id = r.id " +
                "JOIN service_categories c ON r.category_id = c.id " +
                "JOIN users req ON j.requester_id = req.id " +
                "JOIN users prov ON j.provider_id = prov.id " +
                "WHERE j.id = ?",
                tx.getJobId()
            );

            tx.setServiceTitle((String) details.get("service_title"));
            tx.setServiceCategory((String) details.get("service_category"));
            tx.setServiceDescription((String) details.get("service_description"));
            tx.setCampusZone((String) details.get("campus_zone"));
            tx.setPayerName((String) details.get("payer_name"));
            tx.setPayerEmail((String) details.get("payer_email"));
            tx.setPayerStudentId((String) details.get("payer_id"));
            tx.setProviderName((String) details.get("provider_name"));
            tx.setProviderStudentId((String) details.get("provider_id"));
        } catch (Exception e) {
            // ignore
        }
    }
}
