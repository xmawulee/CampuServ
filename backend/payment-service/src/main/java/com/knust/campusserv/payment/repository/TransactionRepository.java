package com.knust.campusserv.payment.repository;

import com.knust.campusserv.payment.model.Transaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, String> {
    Optional<Transaction> findByJobId(String jobId);
    Optional<Transaction> findByPaystackReference(String paystackReference);

    @Query(value = "SELECT t.* FROM transactions t " +
            "LEFT JOIN jobs j ON t.job_id = j.id " +
            "WHERE j.requester_id = :userId OR j.provider_id = :userId OR t.job_id = CONCAT('deposit-', :userId) " +
            "ORDER BY t.created_at DESC", 
            countQuery = "SELECT count(*) FROM transactions t " +
                    "LEFT JOIN jobs j ON t.job_id = j.id " +
                    "WHERE j.requester_id = :userId OR j.provider_id = :userId OR t.job_id = CONCAT('deposit-', :userId)",
            nativeQuery = true)
    Page<Transaction> findByUserId(@Param("userId") String userId, Pageable pageable);

    List<Transaction> findByEscrowStatusOrderByCreatedAtDesc(String escrowStatus);
}
