package com.knust.campusserv.auth;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-dev")
public class RoleSwitcherSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    public void testProviderOnlyCannotSwitchToStudent() throws Exception {
        // usr-provider-cleaning is a provider-only account seeded in V28:
        // - primary_role = 'PROVIDER'
        // - secondary_role = NULL
        // - active_role_view = 'PROVIDER'
        
        mockMvc.perform(patch("/auth/users/me/active-role-view")
                .header("X-User-Id", "usr-provider-cleaning")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"activeRoleView\":\"STUDENT\"}"))
                .andExpect(status().isBadRequest());
    }
}
