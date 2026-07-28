package com.knust.campusserv.user;

import com.knust.campusserv.user.model.User;
import com.knust.campusserv.user.model.ProviderProfile;
import com.knust.campusserv.user.repository.UserRepository;
import com.knust.campusserv.user.repository.ProviderProfileRepository;
import com.knust.campusserv.user.repository.SavedListingRepository;
import com.knust.campusserv.user.repository.ListingReportRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-dev")
public class ProviderFeedIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProviderProfileRepository providerProfileRepository;

    @Autowired
    private SavedListingRepository savedListingRepository;

    @Autowired
    private ListingReportRepository listingReportRepository;

    @Autowired
    private com.knust.campusserv.user.repository.ProviderServiceRepository providerServiceRepository;

    @Autowired
    private com.knust.campusserv.user.repository.ServiceCategoryRepository serviceCategoryRepository;

    private String testProviderId;
    private String testStudentId = "test-student-id-" + UUID.randomUUID().toString();

    @BeforeEach
    public void setup() {
        testProviderId = "test-prov-" + UUID.randomUUID().toString();
        User provUser = new User();
        provUser.setId(testProviderId);
        provUser.setEmail(testProviderId + "@test.com");
        provUser.setPasswordHash("dummy_hash");
        provUser.setFullName("Test Provider");
        provUser.setRole("PROVIDER");
        provUser.setPrimaryRole("PROVIDER");
        provUser.setIsVerified(true);
        provUser.setPrimaryRoleVerified(true);
        provUser.setAccountStatus("ACTIVE");
        provUser.setRating(4.5);
        userRepository.save(provUser);

        ProviderProfile profile = new ProviderProfile();
        profile.setId(testProviderId);
        profile.setApprovalStatus("APPROVED");
        profile.setViewCount(0L);
        profile.setBio("Great service provider");
        profile.setWhatsappNumber("233200000000");
        providerProfileRepository.save(profile);
    }

    @Test
    public void testViewCountIncrement() throws Exception {
        mockMvc.perform(get("/users/providers/" + testProviderId)
                .header("X-User-Id", testStudentId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(testProviderId))
                .andExpect(jsonPath("$.viewCount").value(1));

        ProviderProfile updated = providerProfileRepository.findById(testProviderId).orElseThrow();
        assertEquals(1L, updated.getViewCount());
    }

    @Test
    public void testSaveListingToggle() throws Exception {
        // First toggle -> saved = true
        mockMvc.perform(post("/users/providers/" + testProviderId + "/save")
                .header("X-User-Id", testStudentId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.saved").value(true));

        assertTrue(savedListingRepository.existsByStudentIdAndProviderId(testStudentId, testProviderId));

        // Second toggle -> saved = false
        mockMvc.perform(post("/users/providers/" + testProviderId + "/save")
                .header("X-User-Id", testStudentId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.saved").value(false));

        assertFalse(savedListingRepository.existsByStudentIdAndProviderId(testStudentId, testProviderId));
    }

    @Test
    public void testReportRateLimiting() throws Exception {
        String payload = "{\"reason\":\"Spam\",\"details\":\"Duplicate service listing\"}";
        
        // First report succeeds
        mockMvc.perform(post("/users/providers/" + testProviderId + "/report")
                .header("X-User-Id", testStudentId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists());

        // Second report fails with 400 Bad Request
        mockMvc.perform(post("/users/providers/" + testProviderId + "/report")
                .header("X-User-Id", testStudentId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("You already have a pending report against this provider."));
    }

    @Test
    public void testStrictApprovedFeedGating() throws Exception {
        String pendingId = "pending-prov-" + UUID.randomUUID().toString();
        User pendingUser = new User();
        pendingUser.setId(pendingId);
        pendingUser.setEmail(pendingId + "@test.com");
        pendingUser.setPasswordHash("dummy_hash");
        pendingUser.setFullName("Pending Provider");
        pendingUser.setRole("PROVIDER");
        pendingUser.setPrimaryRole("PROVIDER");
        pendingUser.setIsVerified(true);
        pendingUser.setPrimaryRoleVerified(true);
        pendingUser.setAccountStatus("ACTIVE");
        userRepository.save(pendingUser);

        ProviderProfile pendingProfile = new ProviderProfile();
        pendingProfile.setId(pendingId);
        pendingProfile.setApprovalStatus("PENDING_VERIFICATION"); // NOT APPROVED!
        providerProfileRepository.save(pendingProfile);

        // Search providers should NOT return pendingId
        mockMvc.perform(get("/users/providers")
                .param("name", "Pending Provider"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.id == '" + pendingId + "')]").isEmpty());
    }

    @Test
    public void testSearchFeedComplexFilteringAndSorting() throws Exception {
        String tutoringName = "TutoringTest-" + UUID.randomUUID().toString();
        String laundryName = "LaundryTest-" + UUID.randomUUID().toString();

        // Create mock categories
        com.knust.campusserv.user.model.ServiceCategory tutoringCat = new com.knust.campusserv.user.model.ServiceCategory();
        tutoringCat.setId("tutoring-id-" + UUID.randomUUID().toString());
        tutoringCat.setName(tutoringName);
        tutoringCat.setDescription("Academic tutoring");
        serviceCategoryRepository.save(tutoringCat);

        com.knust.campusserv.user.model.ServiceCategory laundryCat = new com.knust.campusserv.user.model.ServiceCategory();
        laundryCat.setId("laundry-id-" + UUID.randomUUID().toString());
        laundryCat.setName(laundryName);
        laundryCat.setDescription("Washing and folding");
        serviceCategoryRepository.save(laundryCat);

        // Provider A: Tutoring, rating 4.8, base price GHS 50.00, bio "Academic helper", verified = true, name "Alice Tutoring"
        String idA = "prov-a-" + UUID.randomUUID().toString();
        User userA = new User();
        userA.setId(idA);
        userA.setEmail(idA + "@test.com");
        userA.setPasswordHash("dummy_hash");
        userA.setFullName("Alice Tutoring");
        userA.setRole("PROVIDER");
        userA.setPrimaryRole("PROVIDER");
        userA.setIsVerified(true);
        userA.setPrimaryRoleVerified(true);
        userA.setAccountStatus("ACTIVE");
        userA.setRating(4.8);
        userA.setCompletedJobsCount(15);
        userRepository.save(userA);

        ProviderProfile profileA = new ProviderProfile();
        profileA.setId(idA);
        profileA.setApprovalStatus("APPROVED");
        profileA.setBio("Academic helper");
        providerProfileRepository.save(profileA);

        com.knust.campusserv.user.model.ProviderService serviceA = new com.knust.campusserv.user.model.ProviderService();
        serviceA.setId("svc-a-" + UUID.randomUUID().toString());
        serviceA.setProviderId(idA);
        serviceA.setCategory(tutoringCat);
        serviceA.setBasePrice(new java.math.BigDecimal("50.00"));
        providerServiceRepository.save(serviceA);

        // Provider B: Laundry, rating 3.5, base price GHS 10.00, bio "Clean clothes fast", verified = false, name "Bob Laundry"
        String idB = "prov-b-" + UUID.randomUUID().toString();
        User userB = new User();
        userB.setId(idB);
        userB.setEmail(idB + "@test.com");
        userB.setPasswordHash("dummy_hash");
        userB.setFullName("Bob Laundry");
        userB.setRole("PROVIDER");
        userB.setPrimaryRole("PROVIDER");
        userB.setIsVerified(false);
        userB.setPrimaryRoleVerified(false);
        userB.setAccountStatus("ACTIVE");
        userB.setRating(3.5);
        userB.setCompletedJobsCount(5);
        userRepository.save(userB);

        ProviderProfile profileB = new ProviderProfile();
        profileB.setId(idB);
        profileB.setApprovalStatus("APPROVED");
        profileB.setBio("Clean clothes fast");
        providerProfileRepository.save(profileB);

        com.knust.campusserv.user.model.ProviderService serviceB = new com.knust.campusserv.user.model.ProviderService();
        serviceB.setId("svc-b-" + UUID.randomUUID().toString());
        serviceB.setProviderId(idB);
        serviceB.setCategory(laundryCat);
        serviceB.setBasePrice(new java.math.BigDecimal("10.00"));
        providerServiceRepository.save(serviceB);

        // Provider C: Tutoring, rating 4.2, base price GHS 120.00, bio "Math expert helper", verified = true, name "Charlie Math"
        String idC = "prov-c-" + UUID.randomUUID().toString();
        User userC = new User();
        userC.setId(idC);
        userC.setEmail(idC + "@test.com");
        userC.setPasswordHash("dummy_hash");
        userC.setFullName("Charlie Math");
        userC.setRole("PROVIDER");
        userC.setPrimaryRole("PROVIDER");
        userC.setIsVerified(true);
        userC.setPrimaryRoleVerified(true);
        userC.setAccountStatus("ACTIVE");
        userC.setRating(4.2);
        userC.setCompletedJobsCount(20);
        userRepository.save(userC);

        ProviderProfile profileC = new ProviderProfile();
        profileC.setId(idC);
        profileC.setApprovalStatus("APPROVED");
        profileC.setBio("Math expert helper");
        providerProfileRepository.save(profileC);

        com.knust.campusserv.user.model.ProviderService serviceC = new com.knust.campusserv.user.model.ProviderService();
        serviceC.setId("svc-c-" + UUID.randomUUID().toString());
        serviceC.setProviderId(idC);
        serviceC.setCategory(tutoringCat);
        serviceC.setBasePrice(new java.math.BigDecimal("120.00"));
        providerServiceRepository.save(serviceC);

        // 1. Filter by categories = tutoringName -> returns A and C
        mockMvc.perform(get("/users/providers")
                .param("categories", tutoringName))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.id == '" + idA + "')]").exists())
                .andExpect(jsonPath("$.content[?(@.id == '" + idC + "')]").exists())
                .andExpect(jsonPath("$.content[?(@.id == '" + idB + "')]").isEmpty());

        // 2. Filter by categories = tutoringName + "," + laundryName -> returns A, B, and C
        mockMvc.perform(get("/users/providers")
                .param("categories", tutoringName + "," + laundryName))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.id == '" + idA + "')]").exists())
                .andExpect(jsonPath("$.content[?(@.id == '" + idB + "')]").exists())
                .andExpect(jsonPath("$.content[?(@.id == '" + idC + "')]").exists());

        // 3. Filter by minRating = 4.0 -> returns A and C
        mockMvc.perform(get("/users/providers")
                .param("minRating", "4.0")
                .param("categories", tutoringName + "," + laundryName)) // scope to our newly created test providers
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.id == '" + idA + "')]").exists())
                .andExpect(jsonPath("$.content[?(@.id == '" + idC + "')]").exists())
                .andExpect(jsonPath("$.content[?(@.id == '" + idB + "')]").isEmpty());

        // 4. Filter by verified = true -> returns A and C (B is not verified)
        mockMvc.perform(get("/users/providers")
                .param("verified", "true")
                .param("categories", tutoringName + "," + laundryName))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.id == '" + idA + "')]").exists())
                .andExpect(jsonPath("$.content[?(@.id == '" + idC + "')]").exists())
                .andExpect(jsonPath("$.content[?(@.id == '" + idB + "')]").isEmpty());

        // 5. Filter by price range: minPrice = 30.00, maxPrice = 80.00 -> returns A (price 50.00)
        mockMvc.perform(get("/users/providers")
                .param("minPrice", "30.00")
                .param("maxPrice", "80.00")
                .param("categories", tutoringName + "," + laundryName))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.id == '" + idA + "')]").exists())
                .andExpect(jsonPath("$.content[?(@.id == '" + idB + "')]").isEmpty())
                .andExpect(jsonPath("$.content[?(@.id == '" + idC + "')]").isEmpty());

        // 6. Search term = "math" -> returns Charlie
        mockMvc.perform(get("/users/providers")
                .param("name", "math")
                .param("categories", tutoringName + "," + laundryName))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.id == '" + idC + "')]").exists())
                .andExpect(jsonPath("$.content[?(@.id == '" + idA + "')]").isEmpty());

        // 7. Sort by rating -> Alice (4.8), Charlie (4.2), Bob (3.5)
        mockMvc.perform(get("/users/providers")
                .param("categories", tutoringName + "," + laundryName)
                .param("sort", "rating"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(idA))
                .andExpect(jsonPath("$.content[1].id").value(idC))
                .andExpect(jsonPath("$.content[2].id").value(idB));

        // 8. Sort by price_asc -> Bob (10), Alice (50), Charlie (120)
        mockMvc.perform(get("/users/providers")
                .param("categories", tutoringName + "," + laundryName)
                .param("sort", "price-low"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(idB))
                .andExpect(jsonPath("$.content[1].id").value(idA))
                .andExpect(jsonPath("$.content[2].id").value(idC));
    }
}
