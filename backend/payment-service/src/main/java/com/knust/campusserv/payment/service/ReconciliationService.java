package com.knust.campusserv.payment.service;

import com.knust.campusserv.payment.model.StudentWallet;
import com.knust.campusserv.payment.model.ProviderWallet;
import com.knust.campusserv.payment.repository.StudentWalletRepository;
import com.knust.campusserv.payment.repository.ProviderWalletRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service
public class ReconciliationService {

    private static final Logger log = LoggerFactory.getLogger(ReconciliationService.class);

    @Autowired
    private StudentWalletRepository studentWalletRepository;

    @Autowired
    private ProviderWalletRepository providerWalletRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    /**
     * Runs every hour to reconcile all student and provider wallets.
     */
    @Scheduled(cron = "0 0 * * * *")
    public void runReconciliation() {
        log.info("Starting financial reconciliation job...");
        reconcileStudentWallets();
        reconcileProviderWallets();
        log.info("Financial reconciliation job completed.");
    }

    public boolean reconcileStudentWallets() {
        boolean allMatch = true;
        List<StudentWallet> wallets = studentWalletRepository.findAll();
        for (StudentWallet wallet : wallets) {
            String userId = wallet.getUserId();
            BigDecimal balance = wallet.getBalance();
            BigDecimal held = wallet.getHeldBalance();

            // Sums from student_wallet_transactions
            BigDecimal sumDeposit = getSumOfType(userId, "DEPOSIT");
            BigDecimal sumRefund = getSumOfType(userId, "ESCROW_REFUND");
            BigDecimal sumHold = getSumOfType(userId, "ESCROW_HOLD");
            BigDecimal sumRelease = getSumOfType(userId, "ESCROW_RELEASE");
            BigDecimal sumWithdrawal = getSumOfType(userId, "WITHDRAWAL");

            BigDecimal expectedBalance = sumDeposit.add(sumRefund).subtract(sumHold).subtract(sumWithdrawal);
            BigDecimal expectedHeld = sumHold.subtract(sumRelease).subtract(sumRefund);

            if (balance.compareTo(expectedBalance) != 0 || held.compareTo(expectedHeld) != 0) {
                allMatch = false;
                log.error("CRITICAL MISMATCH: Student Wallet for user {} has balance {} (expected {}) and held {} (expected {})",
                        userId, balance, expectedBalance, held, expectedHeld);
                // In production, publish an alert event/send notification here
            }
        }
        return allMatch;
    }

    public boolean reconcileProviderWallets() {
        boolean allMatch = true;
        List<ProviderWallet> wallets = providerWalletRepository.findAll();
        for (ProviderWallet wallet : wallets) {
            String userId = wallet.getUserId();
            BigDecimal balance = wallet.getBalance();

            // Sums from provider_wallet_transactions
            BigDecimal sumPayout = getProviderSumOfType(userId, "JOB_PAYOUT");
            BigDecimal sumWithdrawal = getProviderSumOfType(userId, "WITHDRAWAL");

            BigDecimal expectedBalance = sumPayout.subtract(sumWithdrawal);

            if (balance.compareTo(expectedBalance) != 0) {
                allMatch = false;
                log.error("CRITICAL MISMATCH: Provider Wallet for user {} has balance {} (expected {})",
                        userId, balance, expectedBalance);
            }
        }
        return allMatch;
    }

    public boolean reconcileUserStudentWallet(String userId) {
        StudentWallet wallet = studentWalletRepository.findByUserId(userId).orElse(null);
        if (wallet == null) return true;
        BigDecimal balance = wallet.getBalance();
        BigDecimal held = wallet.getHeldBalance();

        BigDecimal sumDeposit = getSumOfType(userId, "DEPOSIT");
        BigDecimal sumRefund = getSumOfType(userId, "ESCROW_REFUND");
        BigDecimal sumHold = getSumOfType(userId, "ESCROW_HOLD");
        BigDecimal sumRelease = getSumOfType(userId, "ESCROW_RELEASE");
        BigDecimal sumWithdrawal = getSumOfType(userId, "WITHDRAWAL");

        BigDecimal expectedBalance = sumDeposit.add(sumRefund).subtract(sumHold).subtract(sumWithdrawal);
        BigDecimal expectedHeld = sumHold.subtract(sumRelease).subtract(sumRefund);

        if (balance.compareTo(expectedBalance) != 0 || held.compareTo(expectedHeld) != 0) {
            log.error("CRITICAL MISMATCH: Student Wallet for user {} has balance {} (expected {}) and held {} (expected {})",
                    userId, balance, expectedBalance, held, expectedHeld);
            return false;
        }
        return true;
    }

    public boolean reconcileUserProviderWallet(String userId) {
        ProviderWallet wallet = providerWalletRepository.findByUserId(userId).orElse(null);
        if (wallet == null) return true;
        BigDecimal balance = wallet.getBalance();

        BigDecimal sumPayout = getProviderSumOfType(userId, "JOB_PAYOUT");
        BigDecimal sumWithdrawal = getProviderSumOfType(userId, "WITHDRAWAL");

        BigDecimal expectedBalance = sumPayout.subtract(sumWithdrawal);

        if (balance.compareTo(expectedBalance) != 0) {
            log.error("CRITICAL MISMATCH: Provider Wallet for user {} has balance {} (expected {})",
                    userId, balance, expectedBalance);
            return false;
        }
        return true;
    }

    private BigDecimal getSumOfType(String userId, String type) {
        String sql = "SELECT COALESCE(SUM(amount), 0) FROM student_wallet_transactions WHERE user_id = ? AND type = ? AND status = 'SUCCESS'";
        Double val = jdbcTemplate.queryForObject(sql, Double.class, userId, type);
        return BigDecimal.valueOf(val != null ? val : 0.0).setScale(2, java.math.RoundingMode.HALF_UP);
    }

    private BigDecimal getProviderSumOfType(String userId, String type) {
        String sql = "SELECT COALESCE(SUM(amount), 0) FROM provider_wallet_transactions WHERE user_id = ? AND type = ? AND status = 'SUCCESS'";
        Double val = jdbcTemplate.queryForObject(sql, Double.class, userId, type);
        return BigDecimal.valueOf(val != null ? val : 0.0).setScale(2, java.math.RoundingMode.HALF_UP);
    }
}
