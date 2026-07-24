package com.knust.campusserv.payment.repository;

import com.knust.campusserv.payment.model.StudentWallet;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StudentWalletRepository extends JpaRepository<StudentWallet, String> {
    
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM StudentWallet s WHERE s.userId = :userId")
    Optional<StudentWallet> findByUserIdForWrite(@Param("userId") String userId);

    Optional<StudentWallet> findByUserId(String userId);
}
