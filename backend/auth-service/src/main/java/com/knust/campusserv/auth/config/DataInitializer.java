package com.knust.campusserv.auth.config;

import com.knust.campusserv.auth.model.User;
import com.knust.campusserv.auth.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@Profile("local-dev")
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final org.springframework.core.env.Environment env;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public DataInitializer(org.springframework.core.env.Environment env) {
        this.env = env;
        for (String profile : env.getActiveProfiles()) {
            if ("prod".equalsIgnoreCase(profile) || "production".equalsIgnoreCase(profile) || "staging".equalsIgnoreCase(profile)) {
                throw new IllegalStateException("FATAL: DataInitializer (seed account bypass) is active in a production/staging profile!");
            }
        }
    }

    @Override
    public void run(String... args) throws Exception {
        seedAdminAccount();
        seedTestAccounts();
    }

    private void seedAdminAccount() {
        String adminEmail = env.getProperty("ADMIN_SEED_EMAIL", "admin@campusserv.com");
        String adminPassword = env.getProperty("ADMIN_SEED_PASSWORD");
        if (adminPassword == null || adminPassword.trim().isEmpty()) {
            throw new IllegalStateException("ADMIN_SEED_PASSWORD environment variable must be set in local-dev profile!");
        }

        if (userRepository.findByEmail(adminEmail).isEmpty()) {
            log.info("Seeding default admin account ({})", adminEmail);
            User admin = new User();
            admin.setId("usr-admin");
            admin.setEmail(adminEmail);
            admin.setPasswordHash(passwordEncoder.encode(adminPassword.trim()));
            admin.setFullName("CampusServ Administrator");
            admin.setRole("ADMIN");
            admin.setPrimaryRole("ADMIN");
            admin.setPrimaryRoleVerified(true);
            admin.setActiveRoleView("ADMIN");
            admin.setIsVerified(true);
            admin.setVerificationStatus("APPROVED");
            admin.setAccountStatus("ACTIVE");
            admin.setIsProvider(false);
            userRepository.save(admin);

            log.info("Admin account seeded successfully.");
        }
    }

    private void seedTestAccounts() {
        String testProviderEmail = "testprovider@st.knust.edu.gh";
        if (userRepository.findByEmail(testProviderEmail).isEmpty()) {
            log.info("Seeding test provider account ({})", testProviderEmail);
            User prov = new User();
            prov.setId("usr-test-provider");
            prov.setEmail(testProviderEmail);
            prov.setPasswordHash(passwordEncoder.encode("password123"));
            prov.setFullName("Test Provider");
            prov.setRole("STUDENT");
            prov.setPrimaryRole("STUDENT");
            prov.setPrimaryRoleVerified(true);
            prov.setSecondaryRole("PROVIDER");
            prov.setSecondaryRoleStatus("APPROVED");
            prov.setSecondaryRoleAcquiredAt(LocalDateTime.now());
            prov.setActiveRoleView("PROVIDER");
            prov.setIsVerified(true);
            prov.setVerificationStatus("APPROVED");
            prov.setAccountStatus("ACTIVE");
            prov.setIsProvider(true);
            userRepository.save(prov);

        }

        String testStudentEmail = "teststudent@st.knust.edu.gh";
        if (userRepository.findByEmail(testStudentEmail).isEmpty()) {
            log.info("Seeding test student account ({})", testStudentEmail);
            User stud = new User();
            stud.setId("usr-test-student");
            stud.setEmail(testStudentEmail);
            stud.setPasswordHash(passwordEncoder.encode("password123"));
            stud.setFullName("Test Student");
            stud.setRole("STUDENT");
            stud.setPrimaryRole("STUDENT");
            stud.setPrimaryRoleVerified(true);
            stud.setActiveRoleView("STUDENT");
            stud.setIsVerified(true);
            stud.setVerificationStatus("APPROVED");
            stud.setAccountStatus("ACTIVE");
            stud.setIsProvider(false);
            userRepository.save(stud);

        }
    }
}
