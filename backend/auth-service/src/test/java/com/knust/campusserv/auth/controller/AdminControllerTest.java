package com.knust.campusserv.auth.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-dev")
public class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    public void testGetVerificationQueueSmokeTest() throws Exception {
        mockMvc.perform(get("/admin/providers/pending")
                .header("X-User-Id", "usr-admin"))
                .andExpect(status().isOk());
    }
}
