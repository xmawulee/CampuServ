package com.knust.campusserv.auth.service;

import com.knust.campusserv.auth.model.PasswordResetCode;
import com.knust.campusserv.auth.model.PasswordResetSession;
import com.knust.campusserv.auth.model.User;
import com.knust.campusserv.auth.repository.PasswordResetCodeRepository;
import com.knust.campusserv.auth.repository.PasswordResetSessionRepository;
import com.knust.campusserv.auth.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PasswordResetServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordResetCodeRepository passwordResetCodeRepository;

    @Mock
    private PasswordResetSessionRepository passwordResetSessionRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthService authService;

    @Mock
    private BrevoEmailService brevoEmailService;

    @InjectMocks
    private PasswordResetService passwordResetService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testTokenHashingIsConsistentAndSHA256Length() {
        String token = "123456";
        String hash1 = passwordResetService.hashToken(token);
        String hash2 = passwordResetService.hashToken(token);

        assertEquals(hash1, hash2, "Hashing same token must produce identical output");
        assertEquals(64, hash1.length(), "SHA-256 hex string must be exactly 64 characters long");
    }

    @Test
    void testForgotPasswordDoesNotThrowForNonExistentEmail() {
        when(userRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

        // Enumeration protection: does not throw, returns silently
        assertDoesNotThrow(() ->
                passwordResetService.processForgotPassword("unknown@example.com", "127.0.0.1"));
        verify(passwordResetCodeRepository, never()).save(any());
        verify(brevoEmailService, never()).sendPasswordResetCodeEmail(any(), any(), any());
    }

    @Test
    void testForgotPasswordGeneratesHashedCodeAndSendsEmail() {
        User user = new User();
        user.setId("usr-test-1");
        user.setEmail("user@example.com");
        user.setFullName("Test User");

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(passwordResetCodeRepository.findTopByUserIdOrderByCreatedAtDesc("usr-test-1")).thenReturn(Optional.empty());

        passwordResetService.processForgotPassword("user@example.com", "127.0.0.1");

        verify(passwordResetCodeRepository).deleteByUserId(eq("usr-test-1"));
        
        ArgumentCaptor<PasswordResetCode> codeCaptor = ArgumentCaptor.forClass(PasswordResetCode.class);
        verify(passwordResetCodeRepository).save(codeCaptor.capture());
        
        PasswordResetCode savedCode = codeCaptor.getValue();
        assertEquals("usr-test-1", savedCode.getUserId());
        assertNotNull(savedCode.getCodeHash());
        assertEquals(64, savedCode.getCodeHash().length());
        assertTrue(savedCode.getExpiresAt().isAfter(LocalDateTime.now()));
        assertEquals(0, savedCode.getAttempts());

        verify(brevoEmailService).sendPasswordResetCodeEmail(eq("user@example.com"), eq("Test User"), anyString());
    }

    @Test
    void testVerifyResetCodeWithExpiredCodeFails() {
        User user = new User();
        user.setId("usr-test-1");
        user.setEmail("user@example.com");

        PasswordResetCode codeEntity = new PasswordResetCode();
        codeEntity.setUserId("usr-test-1");
        codeEntity.setCodeHash(passwordResetService.hashToken("123456"));
        codeEntity.setExpiresAt(LocalDateTime.now().minusMinutes(1)); // Expired

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(passwordResetCodeRepository.findTopByUserIdOrderByCreatedAtDesc("usr-test-1")).thenReturn(Optional.of(codeEntity));

        Exception exception = assertThrows(IllegalArgumentException.class, () ->
                passwordResetService.verifyResetCode("user@example.com", "123456"));
        assertTrue(exception.getMessage().contains("expired"));
    }

    @Test
    void testVerifyResetCodeWithTooManyAttemptsFails() {
        User user = new User();
        user.setId("usr-test-1");
        user.setEmail("user@example.com");

        PasswordResetCode codeEntity = new PasswordResetCode();
        codeEntity.setUserId("usr-test-1");
        codeEntity.setCodeHash(passwordResetService.hashToken("123456"));
        codeEntity.setExpiresAt(LocalDateTime.now().plusMinutes(10));
        codeEntity.setAttempts(5); // Locked out
        codeEntity.setCreatedAt(LocalDateTime.now().minusMinutes(2));

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(passwordResetCodeRepository.findTopByUserIdOrderByCreatedAtDesc("usr-test-1")).thenReturn(Optional.of(codeEntity));

        Exception exception = assertThrows(IllegalStateException.class, () ->
                passwordResetService.verifyResetCode("user@example.com", "123456"));
        assertTrue(exception.getMessage().contains("locked out") || exception.getMessage().contains("Too many wrong attempts"));
    }

    @Test
    void testVerifyResetCodeSuccessGeneratesSessionToken() {
        User user = new User();
        user.setId("usr-test-1");
        user.setEmail("user@example.com");

        PasswordResetCode codeEntity = new PasswordResetCode();
        codeEntity.setUserId("usr-test-1");
        codeEntity.setCodeHash(passwordResetService.hashToken("123456"));
        codeEntity.setExpiresAt(LocalDateTime.now().plusMinutes(10));
        codeEntity.setAttempts(0);

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(passwordResetCodeRepository.findTopByUserIdOrderByCreatedAtDesc("usr-test-1")).thenReturn(Optional.of(codeEntity));

        String rawSessionToken = passwordResetService.verifyResetCode("user@example.com", "123456");
        assertNotNull(rawSessionToken);
        assertEquals(64, rawSessionToken.length());

        verify(passwordResetCodeRepository).delete(codeEntity);
        verify(passwordResetSessionRepository).deleteByUserId("usr-test-1");
        verify(passwordResetSessionRepository).save(any(PasswordResetSession.class));
    }

    @Test
    void testResetPasswordSuccessRevokesAllUserSessions() {
        String rawSessionToken = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        String tokenHash = passwordResetService.hashToken(rawSessionToken);

        PasswordResetSession session = new PasswordResetSession();
        session.setId(UUID.randomUUID().toString());
        session.setUserId("usr-test-1");
        session.setTokenHash(tokenHash);
        session.setExpiresAt(LocalDateTime.now().plusMinutes(10));

        User user = new User();
        user.setId("usr-test-1");
        user.setEmail("user@example.com");
        user.setPasswordHash("$2a$10$OldPasswordHash");

        when(passwordResetSessionRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(session));
        when(userRepository.findById("usr-test-1")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("NewPass123!", "$2a$10$OldPasswordHash")).thenReturn(false);
        when(passwordEncoder.encode("NewPass123!")).thenReturn("$2a$10$NewPasswordHash");

        passwordResetService.resetPassword(rawSessionToken, "NewPass123!");

        assertEquals("$2a$10$NewPasswordHash", user.getPasswordHash());
        assertNotNull(session.getUsedAt());

        verify(passwordResetSessionRepository).save(session);
        verify(userRepository).save(user);

        // Verify session invalidation across DB and API Gateway
        verify(authService).revokeAllUserTokens("usr-test-1");
        verify(authService).revokeGatewayToken("usr-test-1");
    }
}
