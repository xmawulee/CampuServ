package com.knust.campusserv.auth;

import com.knust.campusserv.auth.model.AccountDeletionTracker;
import com.knust.campusserv.auth.model.User;
import com.knust.campusserv.auth.repository.AccountDeletionTrackerRepository;
import com.knust.campusserv.auth.repository.UserRepository;
import com.knust.campusserv.auth.messaging.AccountDeletionListener;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-dev")
public class AccountDeletionIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AccountDeletionTrackerRepository trackerRepository;

    @Autowired
    private AccountDeletionListener deletionListener;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @MockBean
    private RestTemplate restTemplate;

    @MockBean
    private RabbitTemplate rabbitTemplate;

    private final String testUserId = "usr-delete-test-123";
    private final String testEmail = "delete.test@st.knust.edu.gh";
    private final String rawPassword = "Password123";

    @BeforeEach
    void setUp() {
        // Clean up any stale data
        trackerRepository.deleteById(testUserId);
        userRepository.deleteById(testUserId);

        // Create and save test user
        User user = new User();
        user.setId(testUserId);
        user.setEmail(testEmail);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setFullName("Delete Test User");
        user.setRole("STUDENT");
        user.setIsVerified(true);
        user.setAccountStatus("ACTIVE");
        userRepository.save(user);
    }

    @Test
    void testCheckDeletionEligibilityAndBlockers() throws Exception {
        // Mock payment check: non-zero balance
        Map<String, Object> paymentMock = new HashMap<>();
        paymentMock.put("studentBalance", 15.50);
        paymentMock.put("studentHeld", 0.0);
        paymentMock.put("providerBalance", 0.0);
        paymentMock.put("pendingWithdrawals", 0);

        when(restTemplate.getForObject(contains("/check-deletion-eligibility/"), eq(Map.class)))
                .thenReturn(paymentMock);
        when(restTemplate.getForObject(contains("/active-count/"), eq(Long.class)))
                .thenReturn(0L);

        mockMvc.perform(get("/auth/account/delete/check")
                .header("X-User-Id", testUserId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eligible").value(false))
                .andExpect(jsonPath("$.blockers[0]").value("Remaining student wallet balance: GHS 15.50"));
    }

    @Test
    void testCheckDeletionEligibilityBlockedByActiveJobs() throws Exception {
        // Mock payment check: zero balance
        Map<String, Object> paymentMock = new HashMap<>();
        paymentMock.put("studentBalance", 0.0);
        paymentMock.put("studentHeld", 0.0);
        paymentMock.put("providerBalance", 0.0);
        paymentMock.put("pendingWithdrawals", 0);

        when(restTemplate.getForObject(contains("/check-deletion-eligibility/"), eq(Map.class)))
                .thenReturn(paymentMock);
        // Mock active jobs check: 1 active job
        when(restTemplate.getForObject(contains("/internal/jobs/active-count/"), eq(Long.class)))
                .thenReturn(1L);
        when(restTemplate.getForObject(contains("/internal/disputes/active-count/"), eq(Long.class)))
                .thenReturn(0L);

        mockMvc.perform(get("/auth/account/delete/check")
                .header("X-User-Id", testUserId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eligible").value(false))
                .andExpect(jsonPath("$.blockers[0]").value("You have 1 active or in-progress job(s)."));
    }

    @Test
    void testDeleteAccountIncorrectPassword() throws Exception {
        // Mock eligibility checks: eligible
        Map<String, Object> paymentMock = new HashMap<>();
        paymentMock.put("studentBalance", 0.0);
        paymentMock.put("studentHeld", 0.0);
        paymentMock.put("providerBalance", 0.0);
        paymentMock.put("pendingWithdrawals", 0);

        when(restTemplate.getForObject(contains("/check-deletion-eligibility/"), eq(Map.class)))
                .thenReturn(paymentMock);
        when(restTemplate.getForObject(contains("/active-count/"), eq(Long.class)))
                .thenReturn(0L);

        mockMvc.perform(post("/auth/account/delete")
                .header("X-User-Id", testUserId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"password\":\"WrongPassword\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Incorrect password."));

        // User should still be active
        String dbStatus = jdbcTemplate.queryForObject("SELECT account_status FROM users WHERE id = ?", String.class, testUserId);
        assertEquals("ACTIVE", dbStatus);
    }

    @Test
    void testSuccessfulDeletionFlowOrchestration() throws Exception {
        // Mock eligibility checks: eligible
        Map<String, Object> paymentMock = new HashMap<>();
        paymentMock.put("studentBalance", 0.0);
        paymentMock.put("studentHeld", 0.0);
        paymentMock.put("providerBalance", 0.0);
        paymentMock.put("pendingWithdrawals", 0);

        when(restTemplate.getForObject(contains("/check-deletion-eligibility/"), eq(Map.class)))
                .thenReturn(paymentMock);
        when(restTemplate.getForObject(contains("/active-count/"), eq(Long.class)))
                .thenReturn(0L);

        mockMvc.perform(post("/auth/account/delete")
                .header("X-User-Id", testUserId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"password\":\"" + rawPassword + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // 1. User accountStatus should be set to "DELETING"
        String dbStatus = jdbcTemplate.queryForObject("SELECT account_status FROM users WHERE id = ?", String.class, testUserId);
        assertEquals("DELETING", dbStatus);

        // 2. Tracker record should be created
        Boolean trackerExists = jdbcTemplate.queryForObject("SELECT COUNT(*) > 0 FROM account_deletion_trackers WHERE user_id = ?", Boolean.class, testUserId);
        assertTrue(trackerExists);

        // 3. Deletion event should be published
        verify(rabbitTemplate).convertAndSend(eq("account.deletion.exchange"), eq(""), any(Map.class));

        // 4. Simulate callbacks (acknowledgments) arriving
        deletionListener.handleAcknowledgment(Map.of("userId", testUserId, "serviceName", "user-service"));
        deletionListener.handleAcknowledgment(Map.of("userId", testUserId, "serviceName", "request-service"));
        deletionListener.handleAcknowledgment(Map.of("userId", testUserId, "serviceName", "job-service"));
        deletionListener.handleAcknowledgment(Map.of("userId", testUserId, "serviceName", "payment-service"));
        deletionListener.handleAcknowledgment(Map.of("userId", testUserId, "serviceName", "supporting-service"));

        // 5. User should be completely removed, and tracker deleted
        Boolean userExists = jdbcTemplate.queryForObject("SELECT COUNT(*) > 0 FROM users WHERE id = ?", Boolean.class, testUserId);
        Boolean trackerStillExists = jdbcTemplate.queryForObject("SELECT COUNT(*) > 0 FROM account_deletion_trackers WHERE user_id = ?", Boolean.class, testUserId);
        assertFalse(userExists, "User should be deleted from DB");
        assertFalse(trackerStillExists, "Tracker should be deleted from DB");
    }
}
