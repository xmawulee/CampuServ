package com.knust.campusserv.auth.model;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class LegacyFieldsTest {

    @Test
    public void testSyncLegacyFieldsStudentOnly() {
        User user = new User();
        user.setPrimaryRole("STUDENT");
        user.setSecondaryRole(null);
        user.setActiveRoleView(null);
        
        user.syncLegacyFields();
        
        assertEquals("STUDENT", user.getRole());
        assertFalse(user.getIsProvider());
        assertEquals("UNVERIFIED", user.getVerificationStatus());
        assertTrue(user.getIsVerified());
        assertEquals("ACTIVE", user.getAccountStatus());
    }

    @Test
    public void testSyncLegacyFieldsProviderOnly() {
        User user = new User();
        user.setPrimaryRole("PROVIDER");
        user.setSecondaryRole(null);
        user.setActiveRoleView("PROVIDER");
        user.setPrimaryRoleVerified(true);
        
        user.syncLegacyFields();
        
        assertEquals("PROVIDER", user.getRole());
        assertTrue(user.getIsProvider());
        assertEquals("APPROVED", user.getVerificationStatus());
        assertTrue(user.getIsVerified());
        assertEquals("ACTIVE", user.getAccountStatus());
    }

    @Test
    public void testSyncLegacyFieldsDualRolePending() {
        User user = new User();
        user.setPrimaryRole("STUDENT");
        user.setSecondaryRole("PROVIDER");
        user.setSecondaryRoleStatus("PENDING_VERIFICATION");
        user.setActiveRoleView("STUDENT");
        
        user.syncLegacyFields();
        
        // role matches activeRoleView
        assertEquals("STUDENT", user.getRole());
        // isProvider is true since secondaryRole is PROVIDER
        assertTrue(user.getIsProvider());
        // verificationStatus reflects secondary role status
        assertEquals("PENDING_VERIFICATION", user.getVerificationStatus());
        // isVerified is false because secondaryRoleStatus is not APPROVED
        assertFalse(user.getIsVerified());
        assertEquals("PENDING_VERIFICATION", user.getAccountStatus());
    }

    @Test
    public void testSyncLegacyFieldsDualRoleApproved() {
        User user = new User();
        user.setPrimaryRole("STUDENT");
        user.setSecondaryRole("PROVIDER");
        user.setSecondaryRoleStatus("APPROVED");
        user.setActiveRoleView("PROVIDER");
        
        user.syncLegacyFields();
        
        assertEquals("PROVIDER", user.getRole());
        assertTrue(user.getIsProvider());
        assertEquals("APPROVED", user.getVerificationStatus());
        assertTrue(user.getIsVerified());
        assertEquals("ACTIVE", user.getAccountStatus());
    }

    @Test
    public void testSyncLegacyFieldsPreservesAdministrativeStatuses() {
        User user = new User();
        user.setPrimaryRole("STUDENT");
        user.setIsVerified(true);
        
        user.setAccountStatus("SUSPENDED");
        user.syncLegacyFields();
        assertEquals("SUSPENDED", user.getAccountStatus());

        user.setAccountStatus("BANNED");
        user.syncLegacyFields();
        assertEquals("BANNED", user.getAccountStatus());

        user.setAccountStatus("DELETED");
        user.syncLegacyFields();
        assertEquals("DELETED", user.getAccountStatus());
    }
}
