package com.knust.campusserv.payment.repository;

import com.knust.campusserv.payment.model.StudentWalletTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StudentWalletTransactionRepository extends JpaRepository<StudentWalletTransaction, UUID> {
    List<StudentWalletTransaction> findByUserIdOrderByCreatedAtDesc(String userId);
    Optional<StudentWalletTransaction> findByReferenceId(String referenceId);
    Optional<StudentWalletTransaction> findByWalletTxnId(String walletTxnId);
}
