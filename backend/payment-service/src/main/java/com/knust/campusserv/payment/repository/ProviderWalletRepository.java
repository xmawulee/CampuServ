package com.knust.campusserv.payment.repository;

import com.knust.campusserv.payment.model.ProviderWallet;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProviderWalletRepository extends JpaRepository<ProviderWallet, String> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM ProviderWallet p WHERE p.userId = :userId")
    Optional<ProviderWallet> findByUserIdForWrite(@Param("userId") String userId);

    Optional<ProviderWallet> findByUserId(String userId);
}
