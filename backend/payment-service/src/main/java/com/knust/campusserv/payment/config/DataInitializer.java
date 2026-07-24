package com.knust.campusserv.payment.config;

import com.knust.campusserv.payment.model.StudentWallet;
import com.knust.campusserv.payment.model.ProviderWallet;
import com.knust.campusserv.payment.repository.StudentWalletRepository;
import com.knust.campusserv.payment.repository.ProviderWalletRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("local-dev")
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final org.springframework.core.env.Environment env;

    @Autowired
    private StudentWalletRepository studentWalletRepository;

    @Autowired
    private ProviderWalletRepository providerWalletRepository;

    public DataInitializer(org.springframework.core.env.Environment env) {
        this.env = env;
        for (String profile : env.getActiveProfiles()) {
            if ("prod".equalsIgnoreCase(profile) || "production".equalsIgnoreCase(profile) || "staging".equalsIgnoreCase(profile)) {
                throw new IllegalStateException("FATAL: DataInitializer (seed wallet bypass) is active in a production/staging profile!");
            }
        }
    }

    @Override
    public void run(String... args) throws Exception {
        seedStudentWallet("usr-admin");
        seedStudentWallet("usr-test-student");
        seedProviderWallet("usr-test-provider");
    }

    private void seedStudentWallet(String userId) {
        if (studentWalletRepository.findByUserId(userId).isEmpty()) {
            log.info("Seeding student wallet for user {}", userId);
            StudentWallet wallet = new StudentWallet(userId);
            studentWalletRepository.save(wallet);
        }
    }

    private void seedProviderWallet(String userId) {
        if (providerWalletRepository.findByUserId(userId).isEmpty()) {
            log.info("Seeding provider wallet for user {}", userId);
            ProviderWallet wallet = new ProviderWallet(userId);
            providerWalletRepository.save(wallet);
        }
    }
}
