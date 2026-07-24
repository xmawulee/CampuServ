package com.knust.campusserv.payment.controller;

import com.knust.campusserv.payment.model.*;
import com.knust.campusserv.payment.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.data.domain.Sort;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import com.knust.campusserv.payment.service.WithdrawalService;

@RestController
@RequestMapping("/admin/finance")
public class AdminFinanceController {

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
    private WithdrawalService withdrawalService;

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @Autowired
    private PaymentController paymentController;

    private void logAudit(String adminId, String actionType, String targetEntity, String targetId, String reason) {
        try {
            Map<String, String> payload = new HashMap<>();
            payload.put("adminId", adminId);
            payload.put("actionType", actionType);
            payload.put("targetEntity", targetEntity);
            payload.put("targetId", targetId);
            payload.put("reason", reason);
            restTemplate.postForEntity("http://supporting-service/admin/audit", payload, Void.class);
        } catch (Exception e) {
            System.err.println("Failed to log audit event: " + e.getMessage());
        }
    }

    @GetMapping("/transactions")
    public ResponseEntity<List<Transaction>> getAllTransactions() {
        return ResponseEntity.ok(transactionRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    @GetMapping("/student-wallets")
    public ResponseEntity<List<StudentWallet>> getAllStudentWallets() {
        return ResponseEntity.ok(studentWalletRepository.findAll());
    }

    @GetMapping("/provider-wallets")
    public ResponseEntity<List<ProviderWallet>> getAllProviderWallets() {
        return ResponseEntity.ok(providerWalletRepository.findAll());
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getSystemFinanceStats() {
        List<StudentWallet> sWallets = studentWalletRepository.findAll();
        List<ProviderWallet> pWallets = providerWalletRepository.findAll();
        
        BigDecimal totalEscrow = BigDecimal.ZERO;
        BigDecimal totalStudentBalances = BigDecimal.ZERO;
        BigDecimal totalProviderBalances = BigDecimal.ZERO;
        
        for (StudentWallet w : sWallets) {
            if (!"usr-admin".equals(w.getUserId())) {
                totalEscrow = totalEscrow.add(w.getHeldBalance());
                totalStudentBalances = totalStudentBalances.add(w.getBalance());
            }
        }

        for (ProviderWallet w : pWallets) {
            totalProviderBalances = totalProviderBalances.add(w.getBalance());
        }
        
        Optional<StudentWallet> adminWallet = studentWalletRepository.findByUserId("usr-admin");
        BigDecimal platformRevenue = adminWallet.map(StudentWallet::getBalance).orElse(BigDecimal.ZERO);

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalEscrow", totalEscrow);
        stats.put("totalStudentBalances", totalStudentBalances);
        stats.put("totalProviderBalances", totalProviderBalances);
        stats.put("platformRevenue", platformRevenue);

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/ledger/student")
    public ResponseEntity<List<StudentWalletTransaction>> getStudentLedger(@RequestParam(value = "userId", required = false) String userId) {
        if (userId != null && !userId.isEmpty()) {
            return ResponseEntity.ok(studentWalletTransactionRepository.findByUserIdOrderByCreatedAtDesc(userId));
        }
        return ResponseEntity.ok(studentWalletTransactionRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    @GetMapping("/ledger/provider")
    public ResponseEntity<List<ProviderWalletTransaction>> getProviderLedger(@RequestParam(value = "userId", required = false) String userId) {
        if (userId != null && !userId.isEmpty()) {
            return ResponseEntity.ok(providerWalletTransactionRepository.findByUserIdOrderByCreatedAtDesc(userId));
        }
        return ResponseEntity.ok(providerWalletTransactionRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    @GetMapping("/withdrawals")
    public ResponseEntity<?> getWithdrawals() {
        // Query pending provider wallet withdrawals
        List<ProviderWalletTransaction> pending = providerWalletTransactionRepository.findAll().stream()
                .filter(t -> "WITHDRAWAL".equalsIgnoreCase(t.getType()) && "PENDING".equalsIgnoreCase(t.getStatus()))
                .toList();
        return ResponseEntity.ok(pending);
    }

    @PutMapping("/withdrawals/{id}/approve")
    public ResponseEntity<?> approveWithdrawal(
            @PathVariable UUID id,
            @RequestHeader(value = "X-User-Id", required = false) String adminId,
            @RequestHeader(value = "X-User-Role", required = false) String role) {
        
        if (!"ADMIN".equals(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            withdrawalService.approveWithdrawal(id);
            logAudit(adminId != null ? adminId : "SYSTEM", "APPROVE_WITHDRAWAL", "WITHDRAWAL", id.toString(), "Approved withdrawal");
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/withdrawals/{id}/reject")
    public ResponseEntity<?> rejectWithdrawal(
            @PathVariable UUID id,
            @RequestHeader(value = "X-User-Id", required = false) String adminId,
            @RequestHeader(value = "X-User-Role", required = false) String role) {

        if (!"ADMIN".equals(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            withdrawalService.rejectWithdrawal(id);
            logAudit(adminId != null ? adminId : "SYSTEM", "REJECT_WITHDRAWAL", "WITHDRAWAL", id.toString(), "Rejected withdrawal");
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/escrow")
    public ResponseEntity<?> getEscrowOversight() {
        try {
            List<Transaction> transactions = transactionRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
            return ResponseEntity.ok(transactions);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to load escrow: " + e.getMessage());
        }
    }

    @GetMapping("/ledger")
    public ResponseEntity<?> getSystemLedger() {
        String sql = 
            "(SELECT t.wallet_txn_id AS \"walletTxnId\", u.full_name AS \"ownerName\", " +
            "        t.type AS \"type\", t.amount AS \"amount\", t.status AS \"status\", " +
            "        'Student Wallet' AS \"paymentMethod\", t.created_at AS \"initiatedAt\", " +
            "        t.reference_id AS \"paystackReference\" " +
            " FROM student_wallet_transactions t " +
            " LEFT JOIN users u ON t.user_id = u.id) " +
            "UNION ALL " +
            "(SELECT t.wallet_txn_id AS \"walletTxnId\", u.full_name AS \"ownerName\", " +
            "        t.type AS \"type\", t.amount AS \"amount\", t.status AS \"status\", " +
            "        'Provider Wallet' AS \"paymentMethod\", t.created_at AS \"initiatedAt\", " +
            "        t.reference_id AS \"paystackReference\" " +
            " FROM provider_wallet_transactions t " +
            " LEFT JOIN users u ON t.user_id = u.id) " +
            "ORDER BY \"initiatedAt\" DESC";
        try {
            List<Map<String, Object>> ledger = jdbcTemplate.queryForList(sql);
            return ResponseEntity.ok(ledger);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to load ledger: " + e.getMessage());
        }
    }

    @PostMapping("/escrow/{transactionId}/action")
    public ResponseEntity<?> handleEscrowAction(
            @PathVariable String transactionId,
            @RequestBody Map<String, String> body,
            @RequestHeader(value = "X-User-Id", required = false) String adminId,
            @RequestHeader(value = "X-User-Role", required = false) String role) {

        if (!"ADMIN".equals(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        String action = body.get("action");
        String reason = body.get("reason");

        Optional<Transaction> txOpt = transactionRepository.findById(transactionId);
        if (txOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Transaction not found.");
        }
        Transaction tx = txOpt.get();

        if ("RELEASE_TO_PROVIDER".equalsIgnoreCase(action)) {
            ResponseEntity<?> resp = paymentController.releasePayment(tx.getJobId());
            if (resp.getStatusCode().is2xxSuccessful()) {
                logAudit(adminId != null ? adminId : "SYSTEM", "FORCE_RELEASE_ESCROW", "TRANSACTION", transactionId, reason);
            }
            return resp;
        } else if ("REFUND_TO_CLIENT".equalsIgnoreCase(action)) {
            ResponseEntity<?> resp = paymentController.refundPayment(tx.getJobId());
            if (resp.getStatusCode().is2xxSuccessful()) {
                logAudit(adminId != null ? adminId : "SYSTEM", "FORCE_REFUND_ESCROW", "TRANSACTION", transactionId, reason);
            }
            return resp;
        }

        return ResponseEntity.badRequest().body("Invalid action: " + action);
    }
}
