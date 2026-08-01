package com.knust.campusserv.auth;

import com.knust.campusserv.auth.model.User;
import com.knust.campusserv.auth.model.PasswordResetCode;
import com.knust.campusserv.auth.model.PasswordResetSession;
import com.knust.campusserv.auth.repository.UserRepository;
import com.knust.campusserv.auth.repository.PasswordResetCodeRepository;
import com.knust.campusserv.auth.repository.PasswordResetSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.client.RestTemplate;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-dev")
@org.springframework.transaction.annotation.Transactional
public class PasswordResetIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordResetCodeRepository passwordResetCodeRepository;

    @Autowired
    private PasswordResetSessionRepository passwordResetSessionRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockBean
    private RestTemplate restTemplate;

    @MockBean
    private RabbitTemplate rabbitTemplate;

    private final String rawPassword = "OldPassword123";
    private final String newPassword = "NewPassword123";

    private void cleanupUser(String email) {
        Optional<User> existing = userRepository.findByEmail(email);
        existing.ifPresent(user -> {
            passwordResetCodeRepository.deleteByUserId(user.getId());
            passwordResetSessionRepository.deleteByUserId(user.getId());
            userRepository.delete(user);
            userRepository.flush();
        });
    }

    private String hashCodeSHA256(String rawCode) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawCode.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new RuntimeException("Error hashing code", e);
        }
    }

    @Test
    void testForgotPasswordSendsCode() throws Exception {
        String email = "reset-request@st.knust.edu.gh";
        cleanupUser(email);

        User user = new User();
        user.setId("usr-reset-request");
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setFullName("Reset User");
        user.setRole("STUDENT");
        user.setEmailVerified(true);
        userRepository.saveAndFlush(user);

        String forgotJson = "{\n" +
                "  \"email\": \"" + email + "\"\n" +
                "}";

        mockMvc.perform(post("/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(forgotJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("If that email exists, a verification code has been sent."));

        Optional<PasswordResetCode> codeOpt = passwordResetCodeRepository.findTopByUserIdOrderByCreatedAtDesc(user.getId());
        assertTrue(codeOpt.isPresent());
        assertEquals(0, codeOpt.get().getAttempts());
    }

    @Test
    void testEnumerationProtection() throws Exception {
        String email = "unregistered@st.knust.edu.gh";
        cleanupUser(email);

        String forgotJson = "{\n" +
                "  \"email\": \"" + email + "\"\n" +
                "}";

        // Should return the same success message and 200 OK status
        mockMvc.perform(post("/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(forgotJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("If that email exists, a verification code has been sent."));
    }

    @Test
    void testCodeVerificationSuccess() throws Exception {
        String email = "reset-verify@st.knust.edu.gh";
        cleanupUser(email);

        User user = new User();
        user.setId("usr-reset-verify");
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setFullName("Reset Verify User");
        user.setRole("STUDENT");
        user.setEmailVerified(true);
        userRepository.saveAndFlush(user);

        PasswordResetCode codeEntity = new PasswordResetCode();
        codeEntity.setId("prc-verify-success");
        codeEntity.setUserId(user.getId());
        codeEntity.setCodeHash(hashCodeSHA256("123456"));
        codeEntity.setExpiresAt(LocalDateTime.now().plusMinutes(10));
        codeEntity.setAttempts(0);
        passwordResetCodeRepository.saveAndFlush(codeEntity);

        String verifyJson = "{\n" +
                "  \"email\": \"" + email + "\",\n" +
                "  \"code\": \"123456\"\n" +
                "}";

        mockMvc.perform(post("/auth/verify-reset-code")
                .contentType(MediaType.APPLICATION_JSON)
                .content(verifyJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resetSessionToken").exists());

        // Code should be deleted
        assertFalse(passwordResetCodeRepository.findById("prc-verify-success").isPresent());
    }

    @Test
    void testWrongCodeIncrementsAttemptsAndLocksOut() throws Exception {
        String email = "reset-lockout@st.knust.edu.gh";
        cleanupUser(email);

        User user = new User();
        user.setId("usr-reset-lockout");
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setFullName("Reset Lockout User");
        user.setRole("STUDENT");
        user.setEmailVerified(true);
        userRepository.saveAndFlush(user);

        PasswordResetCode codeEntity = new PasswordResetCode();
        codeEntity.setId("prc-lockout");
        codeEntity.setUserId(user.getId());
        codeEntity.setCodeHash(hashCodeSHA256("123456"));
        codeEntity.setExpiresAt(LocalDateTime.now().plusMinutes(10));
        codeEntity.setAttempts(4); // 4 wrong attempts
        passwordResetCodeRepository.saveAndFlush(codeEntity);

        String verifyJson = "{\n" +
                "  \"email\": \"" + email + "\",\n" +
                "  \"code\": \"999999\"\n" + // Wrong code
                "}";

        // 5th attempt locks out
        mockMvc.perform(post("/auth/verify-reset-code")
                .contentType(MediaType.APPLICATION_JSON)
                .content(verifyJson))
                .andExpect(status().isTooManyRequests());

        // Requesting another code immediately is blocked by the 5-minute cooldown
        String forgotJson = "{\n" +
                "  \"email\": \"" + email + "\"\n" +
                "}";

        mockMvc.perform(post("/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(forgotJson))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void testResetPasswordSuccess() throws Exception {
        String email = "reset-pass-success@st.knust.edu.gh";
        cleanupUser(email);

        User user = new User();
        user.setId("usr-reset-pass-success");
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setFullName("Reset Pass User");
        user.setRole("STUDENT");
        user.setEmailVerified(true);
        userRepository.saveAndFlush(user);

        PasswordResetSession session = new PasswordResetSession();
        session.setId("prs-success");
        session.setUserId(user.getId());
        session.setTokenHash(hashCodeSHA256("session_token_123"));
        session.setExpiresAt(LocalDateTime.now().plusMinutes(15));
        passwordResetSessionRepository.saveAndFlush(session);

        String resetJson = "{\n" +
                "  \"token\": \"session_token_123\",\n" +
                "  \"newPassword\": \"" + newPassword + "\"\n" +
                "}";

        mockMvc.perform(post("/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(resetJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Your password has been successfully reset. Please sign in with your new password."));

        // Verify password is changed
        User updatedUser = userRepository.findById(user.getId()).orElseThrow();
        assertTrue(passwordEncoder.matches(newPassword, updatedUser.getPasswordHash()));

        // Session should be marked as used
        PasswordResetSession updatedSession = passwordResetSessionRepository.findById("prs-success").orElseThrow();
        assertNotNull(updatedSession.getUsedAt());
    }

    @Test
    void testResetSessionTokenSingleUse() throws Exception {
        String email = "reset-pass-single@st.knust.edu.gh";
        cleanupUser(email);

        User user = new User();
        user.setId("usr-reset-pass-single");
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setFullName("Reset Single User");
        user.setRole("STUDENT");
        user.setEmailVerified(true);
        userRepository.saveAndFlush(user);

        PasswordResetSession session = new PasswordResetSession();
        session.setId("prs-single");
        session.setUserId(user.getId());
        session.setTokenHash(hashCodeSHA256("session_token_single"));
        session.setExpiresAt(LocalDateTime.now().plusMinutes(15));
        session.setUsedAt(LocalDateTime.now().minusMinutes(1)); // Already used
        passwordResetSessionRepository.saveAndFlush(session);

        String resetJson = "{\n" +
                "  \"token\": \"session_token_single\",\n" +
                "  \"newPassword\": \"" + newPassword + "\"\n" +
                "}";

        // Second use should be rejected
        mockMvc.perform(post("/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(resetJson))
                .andExpect(status().isBadRequest());
    }
}
