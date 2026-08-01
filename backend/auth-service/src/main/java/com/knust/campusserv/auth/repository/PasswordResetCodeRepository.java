package com.knust.campusserv.auth.repository;

import com.knust.campusserv.auth.model.PasswordResetCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PasswordResetCodeRepository extends JpaRepository<PasswordResetCode, String> {
    Optional<PasswordResetCode> findTopByUserIdOrderByCreatedAtDesc(String userId);

    @org.springframework.transaction.annotation.Transactional
    void deleteByUserId(String userId);
}
