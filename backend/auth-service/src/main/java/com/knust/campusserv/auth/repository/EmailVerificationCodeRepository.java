package com.knust.campusserv.auth.repository;

import com.knust.campusserv.auth.model.EmailVerificationCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmailVerificationCodeRepository extends JpaRepository<EmailVerificationCode, String> {
    Optional<EmailVerificationCode> findTopByUserIdOrderByCreatedAtDesc(String userId);
    @org.springframework.transaction.annotation.Transactional
    void deleteByUserId(String userId);
}
