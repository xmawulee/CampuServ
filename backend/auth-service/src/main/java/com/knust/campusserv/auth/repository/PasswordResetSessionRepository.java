package com.knust.campusserv.auth.repository;

import com.knust.campusserv.auth.model.PasswordResetSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PasswordResetSessionRepository extends JpaRepository<PasswordResetSession, String> {
    Optional<PasswordResetSession> findByTokenHash(String tokenHash);

    @org.springframework.transaction.annotation.Transactional
    void deleteByUserId(String userId);
}
