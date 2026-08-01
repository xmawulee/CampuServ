package com.knust.campusserv.auth;

import com.knust.campusserv.auth.model.User;
import com.knust.campusserv.auth.model.EmailVerificationCode;
import com.knust.campusserv.auth.repository.UserRepository;
import com.knust.campusserv.auth.repository.EmailVerificationCodeRepository;
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
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-dev")
@org.springframework.transaction.annotation.Transactional
public class EmailVerificationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailVerificationCodeRepository emailVerificationCodeRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockBean
    private RestTemplate restTemplate;

    @MockBean
    private RabbitTemplate rabbitTemplate;

    private final String rawPassword = "Password123";

    private void cleanupEmail(String email) {
        Optional<User> existing = userRepository.findByEmail(email);
        existing.ifPresent(user -> {
            emailVerificationCodeRepository.deleteByUserId(user.getId());
            userRepository.delete(user);
            userRepository.flush();
        });
    }

    @Test
    void testEmailCheckConflict() throws Exception {
        String email = "conflict@st.knust.edu.gh";
        cleanupEmail(email);

        // Create verified user
        User user = new User();
        user.setId("usr-test-verified-123");
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setFullName("Verified Test User");
        user.setRole("STUDENT");
        user.setEmailVerified(true);
        userRepository.saveAndFlush(user);

        // Check email should return conflict
        mockMvc.perform(get("/auth/check-email")
                .param("email", email))
                .andExpect(status().isConflict());

        // Check email for unregistered/unverified email should return OK
        mockMvc.perform(get("/auth/check-email")
                .param("email", "newemail@st.knust.edu.gh"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(true));
    }

    @Test
    void testClientRegistrationCreatesUnverifiedUser() throws Exception {
        String email = "reg@st.knust.edu.gh";
        cleanupEmail(email);

        String regJson = "{\n" +
                "  \"fullName\": \"Reg Test User\",\n" +
                "  \"email\": \"" + email + "\",\n" +
                "  \"password\": \"" + rawPassword + "\",\n" +
                "  \"role\": \"STUDENT\"\n" +
                "}";

        mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(regJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.emailVerified").value(false));

        Optional<User> savedUserOpt = userRepository.findByEmail(email);
        assertTrue(savedUserOpt.isPresent());
        User savedUser = savedUserOpt.get();
        assertFalse(savedUser.getEmailVerified());

        Optional<EmailVerificationCode> codeOpt = emailVerificationCodeRepository.findTopByUserIdOrderByCreatedAtDesc(savedUser.getId());
        assertTrue(codeOpt.isPresent());
        assertEquals(0, codeOpt.get().getAttempts());
    }

    @Test
    void testPurgeLegacyUnverifiedRegistration() throws Exception {
        String email = "purge@st.knust.edu.gh";
        cleanupEmail(email);

        // Create unverified user
        User user = new User();
        user.setId("usr-test-unverified-123");
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setFullName("Unverified User");
        user.setRole("STUDENT");
        user.setEmailVerified(false);
        userRepository.saveAndFlush(user);

        // Re-register unverified user should succeed (purges old)
        String regJson = "{\n" +
                "  \"fullName\": \"New Name User\",\n" +
                "  \"email\": \"" + email + "\",\n" +
                "  \"password\": \"" + rawPassword + "\",\n" +
                "  \"role\": \"STUDENT\"\n" +
                "}";

        mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(regJson))
                .andExpect(status().isCreated());

        Optional<User> savedUserOpt = userRepository.findByEmail(email);
        assertTrue(savedUserOpt.isPresent());
        assertEquals("New Name User", savedUserOpt.get().getFullName());
    }

    @Test
    void testCodeVerificationSuccessAndInvalidation() throws Exception {
        String email = "verify@st.knust.edu.gh";
        cleanupEmail(email);

        // Register user
        User user = new User();
        user.setId("usr-verify-success");
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setFullName("Verify User");
        user.setRole("STUDENT");
        user.setEmailVerified(false);
        userRepository.saveAndFlush(user);

        // Create code
        EmailVerificationCode codeEntity = new EmailVerificationCode();
        codeEntity.setId("evc-verify-success");
        codeEntity.setUserId(user.getId());
        codeEntity.setCodeHash(hashCodeSHA256("123456"));
        codeEntity.setExpiresAt(LocalDateTime.now().plusMinutes(15));
        codeEntity.setAttempts(0);
        emailVerificationCodeRepository.saveAndFlush(codeEntity);

        // Verify correct code
        String verifyJson = "{\n" +
                "  \"email\": \"" + email + "\",\n" +
                "  \"code\": \"123456\"\n" +
                "}";

        mockMvc.perform(post("/auth/verify-email")
                .contentType(MediaType.APPLICATION_JSON)
                .content(verifyJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.emailVerified").value(true));

        // Code should be deleted
        assertFalse(emailVerificationCodeRepository.findById("evc-verify-success").isPresent());

        // Re-verifying should fail / return already verified
        mockMvc.perform(post("/auth/verify-email")
                .contentType(MediaType.APPLICATION_JSON)
                .content(verifyJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Email is already verified"));
    }

    @Test
    void testExpiredCodeRejection() throws Exception {
        String email = "expired@st.knust.edu.gh";
        cleanupEmail(email);

        User user = new User();
        user.setId("usr-expired");
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setFullName("Expired User");
        user.setRole("STUDENT");
        user.setEmailVerified(false);
        userRepository.saveAndFlush(user);

        EmailVerificationCode codeEntity = new EmailVerificationCode();
        codeEntity.setId("evc-expired");
        codeEntity.setUserId(user.getId());
        codeEntity.setCodeHash(hashCodeSHA256("123456"));
        codeEntity.setExpiresAt(LocalDateTime.now().minusMinutes(1)); // Expired
        codeEntity.setAttempts(0);
        emailVerificationCodeRepository.saveAndFlush(codeEntity);

        String verifyJson = "{\n" +
                "  \"email\": \"" + email + "\",\n" +
                "  \"code\": \"123456\"\n" +
                "}";

        mockMvc.perform(post("/auth/verify-email")
                .contentType(MediaType.APPLICATION_JSON)
                .content(verifyJson))
                .andExpect(status().isGone());
    }

    @Test
    void testBruteForceDefense() throws Exception {
        String email = "brute@st.knust.edu.gh";
        cleanupEmail(email);

        User user = new User();
        user.setId("usr-brute");
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setFullName("Brute User");
        user.setRole("STUDENT");
        user.setEmailVerified(false);
        userRepository.saveAndFlush(user);

        EmailVerificationCode codeEntity = new EmailVerificationCode();
        codeEntity.setId("evc-brute");
        codeEntity.setUserId(user.getId());
        codeEntity.setCodeHash(hashCodeSHA256("123456"));
        codeEntity.setExpiresAt(LocalDateTime.now().plusMinutes(15));
        codeEntity.setAttempts(4); // 4 failed attempts already
        emailVerificationCodeRepository.saveAndFlush(codeEntity);

        String verifyJson = "{\n" +
                "  \"email\": \"" + email + "\",\n" +
                "  \"code\": \"999999\"\n" + // Wrong code
                "}";

        // 5th attempt should lock
        mockMvc.perform(post("/auth/verify-email")
                .contentType(MediaType.APPLICATION_JSON)
                .content(verifyJson))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void testResendRateLimiting() throws Exception {
        String email = "resend@st.knust.edu.gh";
        cleanupEmail(email);

        User user = new User();
        user.setId("usr-resend-rl");
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setFullName("Resend User");
        user.setRole("STUDENT");
        user.setEmailVerified(false);
        userRepository.saveAndFlush(user);

        EmailVerificationCode codeEntity = new EmailVerificationCode();
        codeEntity.setId("evc-resend-rl");
        codeEntity.setUserId(user.getId());
        codeEntity.setCodeHash(hashCodeSHA256("123456"));
        codeEntity.setExpiresAt(LocalDateTime.now().plusMinutes(15));
        codeEntity.setAttempts(0);
        codeEntity.setLastSentAt(LocalDateTime.now().minusSeconds(10)); // Sent 10s ago
        emailVerificationCodeRepository.saveAndFlush(codeEntity);

        String resendJson = "{\n" +
                "  \"email\": \"" + email + "\"\n" +
                "}";

        // Should return too many requests due to 60s cooldown limit
        mockMvc.perform(post("/auth/resend-verification")
                .contentType(MediaType.APPLICATION_JSON)
                .content(resendJson))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void testNormalLoginTriggersCodeIfUnverified() throws Exception {
        String email = "login@st.knust.edu.gh";
        cleanupEmail(email);

        User user = new User();
        user.setId("usr-unverified-login");
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setFullName("Unverified Login User");
        user.setRole("STUDENT");
        user.setEmailVerified(false);
        userRepository.saveAndFlush(user);

        String loginJson = "{\n" +
                "  \"email\": \"" + email + "\",\n" +
                "  \"password\": \"" + rawPassword + "\"\n" +
                "}";

        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.emailVerified").value(false));

        Optional<EmailVerificationCode> codeOpt = emailVerificationCodeRepository.findTopByUserIdOrderByCreatedAtDesc(user.getId());
        assertTrue(codeOpt.isPresent());
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
}
