package com.knust.campusserv.payment.repository;

import com.knust.campusserv.payment.model.ProviderWalletTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProviderWalletTransactionRepository extends JpaRepository<ProviderWalletTransaction, UUID> {
    List<ProviderWalletTransaction> findByUserIdOrderByCreatedAtDesc(String userId);
    Optional<ProviderWalletTransaction> findByReferenceId(String referenceId);
    Optional<ProviderWalletTransaction> findByWalletTxnId(String walletTxnId);
}
