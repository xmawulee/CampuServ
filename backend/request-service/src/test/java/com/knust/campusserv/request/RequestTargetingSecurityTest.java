package com.knust.campusserv.request;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-dev")
public class RequestTargetingSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    public void testCreateRequestRejectsRemoteServiceMode() throws Exception {
        mockMvc.perform(multipart("/requests")
                .header("X-User-Id", "usr-test-student")
                .param("categoryId", "cat-1")
                .param("title", "Clean my room today")
                .param("description", "Needs to be very clean")
                .param("budgetMin", "30.00")
                .param("budgetMax", "30.00")
                .param("locationType", "REMOTE"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("REMOTE_NOT_SUPPORTED"));
    }
}
