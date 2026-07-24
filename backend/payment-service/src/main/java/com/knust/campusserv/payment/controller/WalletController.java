package com.knust.campusserv.payment.controller;

import com.knust.campusserv.payment.model.*;
import com.knust.campusserv.payment.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
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
public class WalletController {

    private static final Logger log = LoggerFactory.getLogger(WalletController.class);

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

    /**
     * Checks whether a user is an approved provider by querying the users table.
     * This MUST be used instead of trusting the X-User-Role header, which only
     * reflects activeRoleView (a UI concern) and must never gate wallet access.
     */
    private boolean isApprovedProvider(String userId) {
        try {
            String sql = "SELECT COUNT(*) FROM users WHERE id = ? AND account_status = 'ACTIVE' " +
                         "AND (primary_role = 'PROVIDER' OR (secondary_role = 'PROVIDER' AND secondary_role_status = 'APPROVED'))";
            Integer count = jdbcTemplate.queryForObject(sql, Integer.class, userId);
            return count != null && count > 0;
        } catch (Exception e) {
            log.warn("isApprovedProvider check failed for userId={}: {}", userId, e.getMessage());
            return false;
        }
    }

    // ── STUDENT WALLET ENDPOINTS ─────────────────────────────────────────────

    @GetMapping({"/payments/student/wallet", "/student/wallet"})
    public ResponseEntity<?> getStudentWallet(@RequestHeader("X-User-Id") String userId) {
        StudentWallet wallet = studentWalletRepository.findByUserId(userId)
                .orElseGet(() -> {
                    StudentWallet newWallet = new StudentWallet(userId);
                    return studentWalletRepository.save(newWallet);
                });
        return ResponseEntity.ok(wallet);
    }

    @GetMapping({"/payments/student/wallet/transactions", "/student/wallet/transactions"})
    public ResponseEntity<?> getStudentWalletTransactions(@RequestHeader("X-User-Id") String userId) {
        List<StudentWalletTransaction> txns = studentWalletTransactionRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return ResponseEntity.ok(txns);
    }

    @PostMapping({"/payments/student/wallet/deposit", "/student/wallet/deposit"})
    @Transactional
    public ResponseEntity<?> depositStudentWallet(
            @RequestHeader("X-User-Id") String userId,
            @RequestBody Map<String, Object> body) {

        BigDecimal amount = new BigDecimal(body.get("amount").toString());
        String paymentMethod = (String) body.get("paymentMethod");
        String mobileNumber = (String) body.get("mobileNumber");
        String referenceId = (String) body.get("referenceId"); // Idempotency key

        if (referenceId == null || referenceId.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("referenceId (idempotency key) is required.");
        }
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Amount must be greater than zero.");
        }

        // Idempotency check
        Optional<StudentWalletTransaction> existingTxn = studentWalletTransactionRepository.findByReferenceId(referenceId);
        if (existingTxn.isPresent()) {
            Map<String, String> response = new HashMap<>();
            response.put("walletTxnId", existingTxn.get().getWalletTxnId());
            response.put("status", existingTxn.get().getStatus());
            return ResponseEntity.ok(response);
        }

        if (paymentMethod == null) paymentMethod = "MTN MoMo";
        if (mobileNumber == null) mobileNumber = "";

        // Lock Student Wallet row
        StudentWallet wallet = studentWalletRepository.findByUserIdForWrite(userId)
                .orElseGet(() -> {
                    StudentWallet newWallet = new StudentWallet(userId);
                    return studentWalletRepository.save(newWallet);
                });

        BigDecimal balanceBefore = wallet.getBalance();
        BigDecimal balanceAfter = balanceBefore.add(amount);

        wallet.setBalance(balanceAfter);
        wallet.setUpdatedAt(LocalDateTime.now());
        studentWalletRepository.save(wallet);

        String walletTxnId = "SWTXN-" + Calendar.getInstance().get(Calendar.YEAR) + "-" + (10000 + new Random().nextInt(90000));

        StudentWalletTransaction wTx = new StudentWalletTransaction();
        wTx.setWalletTxnId(walletTxnId);
        wTx.setUserId(userId);
        wTx.setType("DEPOSIT");
        wTx.setStatus("SUCCESS");
        wTx.setAmount(amount);
        wTx.setBalanceBefore(balanceBefore);
        wTx.setBalanceAfter(balanceAfter);
        wTx.setCurrency("GHS");
        wTx.setReferenceId(referenceId);
        wTx.setNarration("Wallet Deposit via " + paymentMethod);
        wTx.setCreatedAt(LocalDateTime.now());

        studentWalletTransactionRepository.save(wTx);

        Map<String, String> response = new HashMap<>();
        response.put("walletTxnId", walletTxnId);
        response.put("status", "SUCCESS");

        return ResponseEntity.ok(response);
    }

    // ── PROVIDER WALLET ENDPOINTS ─────────────────────────────────────────────

    @GetMapping({"/payments/provider/wallet", "/provider/wallet"})
    public ResponseEntity<?> getProviderWallet(
            @RequestHeader("X-User-Id") String userId) {

        if (!isApprovedProvider(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only approved providers can access the provider earnings wallet.");
        }

        ProviderWallet wallet = providerWalletRepository.findByUserId(userId)
                .orElseGet(() -> {
                    ProviderWallet newWallet = new ProviderWallet(userId);
                    return providerWalletRepository.save(newWallet);
                });
        return ResponseEntity.ok(wallet);
    }

    @GetMapping({"/payments/provider/wallet/transactions", "/provider/wallet/transactions"})
    public ResponseEntity<?> getProviderWalletTransactions(
            @RequestHeader("X-User-Id") String userId) {

        if (!isApprovedProvider(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only approved providers can access provider earnings transactions.");
        }

        List<ProviderWalletTransaction> txns = providerWalletTransactionRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return ResponseEntity.ok(txns);
    }

    @PostMapping({"/payments/provider/wallet/withdraw", "/provider/wallet/withdraw"})
    @Transactional
    public ResponseEntity<?> withdrawProviderWallet(
            @RequestHeader("X-User-Id") String userId,
            @RequestBody Map<String, Object> body) {

        if (!isApprovedProvider(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only approved providers can withdraw earnings.");
        }

        BigDecimal amount = new BigDecimal(body.get("amount").toString());
        String paymentMethod = (String) body.get("paymentMethod");
        String mobileNumber = (String) body.get("mobileNumber");
        String referenceId = (String) body.get("referenceId"); // Idempotency key

        if (referenceId == null || referenceId.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("referenceId (idempotency key) is required.");
        }
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Amount must be greater than zero.");
        }

        // Idempotency check
        Optional<ProviderWalletTransaction> existingTxn = providerWalletTransactionRepository.findByReferenceId(referenceId);
        if (existingTxn.isPresent()) {
            Map<String, String> response = new HashMap<>();
            response.put("walletTxnId", existingTxn.get().getWalletTxnId());
            response.put("status", existingTxn.get().getStatus());
            return ResponseEntity.ok(response);
        }

        // Lock Provider Wallet row
        ProviderWallet wallet = providerWalletRepository.findByUserIdForWrite(userId)
                .orElseThrow(() -> new IllegalArgumentException("Provider wallet not initialized."));

        if (wallet.getBalance().compareTo(amount) < 0) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Insufficient earnings balance.");
        }

        BigDecimal balanceBefore = wallet.getBalance();
        BigDecimal balanceAfter = balanceBefore.subtract(amount);

        wallet.setBalance(balanceAfter);
        wallet.setUpdatedAt(LocalDateTime.now());
        providerWalletRepository.save(wallet);

        String walletTxnId = "PWTXN-" + Calendar.getInstance().get(Calendar.YEAR) + "-" + (10000 + new Random().nextInt(90000));

        ProviderWalletTransaction wTx = new ProviderWalletTransaction();
        wTx.setWalletTxnId(walletTxnId);
        wTx.setUserId(userId);
        wTx.setType("WITHDRAWAL");
        wTx.setStatus("SUCCESS");
        wTx.setAmount(amount);
        wTx.setBalanceBefore(balanceBefore);
        wTx.setBalanceAfter(balanceAfter);
        wTx.setCurrency("GHS");
        wTx.setReferenceId(referenceId);
        wTx.setNarration("Withdrawal to " + (paymentMethod != null ? paymentMethod : "MTN MoMo"));
        wTx.setCreatedAt(LocalDateTime.now());

        providerWalletTransactionRepository.save(wTx);

        Map<String, String> response = new HashMap<>();
        response.put("walletTxnId", walletTxnId);
        response.put("status", "SUCCESS");

        return ResponseEntity.ok(response);
    }

    @PostMapping({"/payments/student/wallet/withdraw", "/student/wallet/withdraw"})
    @Transactional
    public ResponseEntity<?> withdrawStudentWallet(
            @RequestHeader("X-User-Id") String userId,
            @RequestBody Map<String, Object> body) {

        BigDecimal amount = new BigDecimal(body.get("amount").toString());
        String paymentMethod = (String) body.get("paymentMethod");
        String mobileNumber = (String) body.get("mobileNumber");
        String referenceId = (String) body.get("referenceId"); // Idempotency key

        if (referenceId == null || referenceId.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("referenceId (idempotency key) is required.");
        }
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Amount must be greater than zero.");
        }

        // Idempotency check
        Optional<StudentWalletTransaction> existingTxn = studentWalletTransactionRepository.findByReferenceId(referenceId);
        if (existingTxn.isPresent()) {
            Map<String, String> response = new HashMap<>();
            response.put("walletTxnId", existingTxn.get().getWalletTxnId());
            response.put("status", existingTxn.get().getStatus());
            return ResponseEntity.ok(response);
        }

        // Lock Student Wallet row
        StudentWallet wallet = studentWalletRepository.findByUserIdForWrite(userId)
                .orElseThrow(() -> new IllegalArgumentException("Student wallet not initialized."));

        if (wallet.getBalance().compareTo(amount) < 0) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Insufficient balance.");
        }

        BigDecimal balanceBefore = wallet.getBalance();
        BigDecimal balanceAfter = balanceBefore.subtract(amount);

        wallet.setBalance(balanceAfter);
        wallet.setUpdatedAt(LocalDateTime.now());
        studentWalletRepository.save(wallet);

        String walletTxnId = "SWTXN-" + Calendar.getInstance().get(Calendar.YEAR) + "-" + (10000 + new Random().nextInt(90000));

        StudentWalletTransaction wTx = new StudentWalletTransaction();
        wTx.setWalletTxnId(walletTxnId);
        wTx.setUserId(userId);
        wTx.setType("WITHDRAWAL");
        wTx.setStatus("SUCCESS");
        wTx.setAmount(amount);
        wTx.setBalanceBefore(balanceBefore);
        wTx.setBalanceAfter(balanceAfter);
        wTx.setCurrency("GHS");
        wTx.setReferenceId(referenceId);
        wTx.setNarration("Withdrawal to " + (paymentMethod != null ? paymentMethod : "MTN MoMo"));
        wTx.setCreatedAt(LocalDateTime.now());

        studentWalletTransactionRepository.save(wTx);

        Map<String, String> response = new HashMap<>();
        response.put("walletTxnId", walletTxnId);
        response.put("status", "SUCCESS");

        return ResponseEntity.ok(response);
    }

    // ── INTERNAL WALLET INITIALIZATION ───────────────────────────────────────

    @PostMapping("/wallet/create")
    @Transactional
    public ResponseEntity<?> createWallet(@RequestBody Map<String, Object> body) {
        String userId = (String) body.get("userId");
        
        // Always initialize Student wallet
        StudentWallet sWallet = studentWalletRepository.findByUserId(userId)
                .orElseGet(() -> {
                    StudentWallet newWallet = new StudentWallet(userId);
                    return studentWalletRepository.save(newWallet);
                });

        // Also check if user is a provider, if so, initialize Provider wallet
        try {
            List<Map<String, Object>> users = jdbcTemplate.queryForList(
                    "SELECT primary_role, secondary_role, secondary_role_status FROM users WHERE id = ?", userId
            );
            if (!users.isEmpty()) {
                Map<String, Object> user = users.get(0);
                String primary = (String) user.get("primary_role");
                String secondary = (String) user.get("secondary_role");
                String status = (String) user.get("secondary_role_status");

                if ("PROVIDER".equalsIgnoreCase(primary) || ("PROVIDER".equalsIgnoreCase(secondary) && "APPROVED".equalsIgnoreCase(status))) {
                    providerWalletRepository.findByUserId(userId)
                            .orElseGet(() -> {
                                ProviderWallet newWallet = new ProviderWallet(userId);
                                return providerWalletRepository.save(newWallet);
                            });
                }
            }
        } catch (Exception e) {
            log.warn("createWallet: failed to check provider status for user: {}", userId, e);
        }

        return ResponseEntity.ok(sWallet);
    }

    @GetMapping("/wallet/transactions/{txnId}")
    public ResponseEntity<?> getWalletTransactionById(@PathVariable("txnId") String txnId) {
        if (txnId.startsWith("SWTXN")) {
            Optional<StudentWalletTransaction> tx = studentWalletTransactionRepository.findByWalletTxnId(txnId);
            if (tx.isPresent()) {
                StudentWalletTransaction t = tx.get();
                Map<String, Object> resp = new HashMap<>();
                resp.put("walletTxnId", t.getWalletTxnId());
                resp.put("narration", t.getNarration());
                resp.put("type", t.getType());
                resp.put("amount", t.getAmount());
                resp.put("status", t.getStatus());
                resp.put("ownerName", "Student");
                resp.put("initiatedAt", t.getCreatedAt());
                resp.put("createdAt", t.getCreatedAt());
                return ResponseEntity.ok(resp);
            }
        } else if (txnId.startsWith("PWTXN")) {
            Optional<ProviderWalletTransaction> tx = providerWalletTransactionRepository.findByWalletTxnId(txnId);
            if (tx.isPresent()) {
                ProviderWalletTransaction t = tx.get();
                Map<String, Object> resp = new HashMap<>();
                resp.put("walletTxnId", t.getWalletTxnId());
                resp.put("narration", t.getNarration());
                resp.put("type", t.getType());
                resp.put("amount", t.getAmount());
                resp.put("status", t.getStatus());
                resp.put("ownerName", "Provider");
                resp.put("initiatedAt", t.getCreatedAt());
                resp.put("createdAt", t.getCreatedAt());
                return ResponseEntity.ok(resp);
            }
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Wallet transaction not found.");
    }
}
