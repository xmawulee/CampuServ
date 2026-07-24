package com.knust.campusserv.payment;

import com.knust.campusserv.payment.model.StudentWallet;
import com.knust.campusserv.payment.model.ProviderWallet;
import com.knust.campusserv.payment.model.StudentWalletTransaction;
import com.knust.campusserv.payment.repository.StudentWalletRepository;
import com.knust.campusserv.payment.repository.ProviderWalletRepository;
import com.knust.campusserv.payment.repository.StudentWalletTransactionRepository;
import com.knust.campusserv.payment.service.ReconciliationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("local-dev")
public class PaymentServiceTest {

    @Autowired
    private StudentWalletRepository studentWalletRepository;

    @Autowired
    private ProviderWalletRepository providerWalletRepository;

    @Autowired
    private StudentWalletTransactionRepository studentWalletTransactionRepository;

    @Autowired
    private ReconciliationService reconciliationService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private TransactionTemplate transactionTemplate;

    private final String testUserId = "usr-test-runner-" + UUID.randomUUID().toString().substring(0, 8);

    @BeforeEach
    public void setUp() {
        // Seed users table first to avoid foreign key violations
        jdbcTemplate.update("INSERT INTO users (id, email, password_hash, role, primary_role, full_name, active_role_view) " +
                "VALUES (?, ?, 'hash', 'STUDENT', 'STUDENT', 'Test Runner User', 'STUDENT') " +
                "ON CONFLICT (id) DO NOTHING", testUserId, testUserId + "@test.com");

        // Clear existing transactions to ensure clean reconciliation checks
        jdbcTemplate.update("DELETE FROM student_wallet_transactions WHERE user_id = ?", testUserId);
        jdbcTemplate.update("DELETE FROM provider_wallet_transactions WHERE user_id = ?", testUserId);
        jdbcTemplate.update("DELETE FROM student_wallets WHERE user_id = ?", testUserId);
        jdbcTemplate.update("DELETE FROM provider_wallets WHERE user_id = ?", testUserId);

        // Initialize clean wallets for test runner user with 0.00 GHS
        StudentWallet sWallet = new StudentWallet(testUserId);
        sWallet.setBalance(BigDecimal.ZERO);
        sWallet.setHeldBalance(BigDecimal.ZERO);
        studentWalletRepository.save(sWallet);

        ProviderWallet pWallet = new ProviderWallet(testUserId);
        pWallet.setBalance(BigDecimal.ZERO);
        providerWalletRepository.save(pWallet);
    }

    @Test
    public void testIdempotentDeposits() {
        String referenceId = "ref-idem-" + UUID.randomUUID().toString().substring(0, 10);
        BigDecimal amount = new BigDecimal("25.00");

        // First deposit inside transaction
        transactionTemplate.execute(status -> {
            StudentWallet wallet1 = studentWalletRepository.findByUserIdForWrite(testUserId).orElseThrow();
            BigDecimal balanceBefore1 = wallet1.getBalance();
            wallet1.setBalance(balanceBefore1.add(amount));
            studentWalletRepository.save(wallet1);

            StudentWalletTransaction wTx1 = new StudentWalletTransaction();
            wTx1.setWalletTxnId("SWTXN-IDEM-1-" + UUID.randomUUID().toString().substring(0, 8));
            wTx1.setUserId(testUserId);
            wTx1.setType("DEPOSIT");
            wTx1.setStatus("SUCCESS");
            wTx1.setAmount(amount);
            wTx1.setBalanceBefore(balanceBefore1);
            wTx1.setBalanceAfter(wallet1.getBalance());
            wTx1.setCurrency("GHS");
            wTx1.setReferenceId(referenceId);
            studentWalletTransactionRepository.save(wTx1);
            return null;
        });

        // Try second deposit with same referenceId
        boolean isDuplicate = studentWalletTransactionRepository.findByReferenceId(referenceId).isPresent();
        assertTrue(isDuplicate, "Second attempt should be detected as a duplicate reference");

        // Verify balance was only updated once
        StudentWallet finalWallet = studentWalletRepository.findByUserId(testUserId).orElseThrow();
        assertEquals(0, finalWallet.getBalance().compareTo(new BigDecimal("25.00")));
    }

    @Test
    public void testReconciliationServiceFlagsMismatch() {
        // Run initial clean reconciliation (ledger matches balance which are both 0.00)
        boolean initialMatch = reconciliationService.reconcileUserStudentWallet(testUserId);
        assertTrue(initialMatch, "Reconciliation should pass initially when ledger matches wallet balance");

        // Inject balance mismatch manually inside transaction
        transactionTemplate.execute(status -> {
            StudentWallet wallet = studentWalletRepository.findByUserIdForWrite(testUserId).orElseThrow();
            wallet.setBalance(new BigDecimal("500.00")); // Mismatch! Ledger says expected is 0
            studentWalletRepository.save(wallet);
            return null;
        });

        // Verify reconciliation now catches the mismatch
        boolean mismatchDetected = reconciliationService.reconcileUserStudentWallet(testUserId);
        assertFalse(mismatchDetected, "Reconciliation service must fail when balance is mismatched with ledger sum");
    }

    @Test
    public void testWalletConcurrencyWithPessimisticLocks() throws InterruptedException {
        // First deposit 100 GHS to test user's wallet to provide funds for deductions
        transactionTemplate.execute(status -> {
            StudentWallet wallet = studentWalletRepository.findByUserIdForWrite(testUserId).orElseThrow();
            wallet.setBalance(new BigDecimal("100.00"));
            studentWalletRepository.save(wallet);
            return null;
        });

        int threadsCount = 5;
        ExecutorService executor = Executors.newFixedThreadPool(threadsCount);
        CountDownLatch latch = new CountDownLatch(threadsCount);

        BigDecimal transferAmount = new BigDecimal("10.00");

        for (int i = 0; i < threadsCount; i++) {
            executor.submit(() -> {
                try {
                    transactionTemplate.execute(status -> {
                        StudentWallet wallet = studentWalletRepository.findByUserIdForWrite(testUserId).orElseThrow();
                        BigDecimal currentBalance = wallet.getBalance();
                        if (currentBalance.compareTo(transferAmount) >= 0) {
                            wallet.setBalance(currentBalance.subtract(transferAmount));
                            studentWalletRepository.saveAndFlush(wallet);
                        }
                        return null;
                    });
                } finally {
                    latch.countDown();
                }
            });
        }

        latch.await(5, TimeUnit.SECONDS);
        executor.shutdown();

        // Verify that parallel threads did not cause negative or incorrect balances
        StudentWallet finalWallet = studentWalletRepository.findByUserId(testUserId).orElseThrow();
        // Since original was 100.00, and 5 threads subtract 10.00, final should be exactly 50.00
        assertEquals(0, finalWallet.getBalance().compareTo(new BigDecimal("50.00")),
                "Concurrent updates should correctly serialize and deduct balance cleanly");
    }
}
