package com.knust.campusserv.payment.service;

import com.knust.campusserv.payment.model.PayoutMethod;
import com.knust.campusserv.payment.model.ProviderWallet;
import com.knust.campusserv.payment.model.ProviderWalletTransaction;
import com.knust.campusserv.payment.repository.PayoutMethodRepository;
import com.knust.campusserv.payment.repository.ProviderWalletRepository;
import com.knust.campusserv.payment.repository.ProviderWalletTransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class WithdrawalService {

    @Autowired
    private ProviderWalletRepository providerWalletRepository;

    @Autowired
    private PayoutMethodRepository payoutMethodRepository;

    @Autowired
    private ProviderWalletTransactionRepository providerWalletTransactionRepository;

    @Transactional
    public ProviderWalletTransaction initiateWithdrawal(String userId, BigDecimal amount, String payoutMethodId) {
        ProviderWallet wallet = providerWalletRepository.findByUserIdForWrite(userId)
                .orElseThrow(() -> new IllegalArgumentException("Provider wallet not initialized."));

        if (wallet.getBalance().compareTo(amount) < 0) {
            throw new IllegalArgumentException("Insufficient wallet balance.");
        }

        PayoutMethod method = payoutMethodRepository.findById(payoutMethodId)
                .orElseThrow(() -> new IllegalArgumentException("Payout method not found."));

        if (!method.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Not your payout method.");
        }

        // Deduct balance
        BigDecimal balanceBefore = wallet.getBalance();
        wallet.setBalance(wallet.getBalance().subtract(amount));
        wallet.setUpdatedAt(LocalDateTime.now());
        providerWalletRepository.save(wallet);

        // Record pending transaction
        ProviderWalletTransaction tx = new ProviderWalletTransaction();
        tx.setWalletTxnId("wd-" + UUID.randomUUID().toString().substring(0, 12));
        tx.setUserId(userId);
        tx.setType("WITHDRAWAL");
        tx.setStatus("PENDING");
        tx.setAmount(amount);
        tx.setBalanceBefore(balanceBefore);
        tx.setBalanceAfter(wallet.getBalance());
        tx.setCurrency("GHS");
        tx.setNarration("Earnings Withdrawal");

        // Mock Paystack transfer reference
        String mockTransferCode = "TRF_" + UUID.randomUUID().toString();
        tx.setReferenceId(mockTransferCode);

        return providerWalletTransactionRepository.save(tx);
    }

    @Transactional
    public void approveWithdrawal(UUID id) {
        ProviderWalletTransaction tx = providerWalletTransactionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found."));
        if (!"PENDING".equals(tx.getStatus()) && !"PROCESSING".equals(tx.getStatus())) {
            throw new IllegalArgumentException("Transaction is not in a pending state.");
        }
        tx.setStatus("SUCCESS");
        tx.setUpdatedAt(LocalDateTime.now());
        providerWalletTransactionRepository.save(tx);
    }

    @Transactional
    public void rejectWithdrawal(UUID id) {
        ProviderWalletTransaction tx = providerWalletTransactionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found."));
        if (!"PENDING".equals(tx.getStatus()) && !"PROCESSING".equals(tx.getStatus())) {
            throw new IllegalArgumentException("Transaction is not in a pending state.");
        }
        tx.setStatus("FAILED");
        tx.setUpdatedAt(LocalDateTime.now());
        providerWalletTransactionRepository.save(tx);

        // Refund the amount to the provider's wallet
        ProviderWallet wallet = providerWalletRepository.findByUserIdForWrite(tx.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("Provider wallet not initialized."));
        wallet.setBalance(wallet.getBalance().add(tx.getAmount()));
        wallet.setUpdatedAt(LocalDateTime.now());
        providerWalletRepository.save(wallet);
    }
}
