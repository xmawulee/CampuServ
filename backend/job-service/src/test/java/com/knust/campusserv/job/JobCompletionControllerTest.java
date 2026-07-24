package com.knust.campusserv.job;

import com.knust.campusserv.job.controller.JobController;
import com.knust.campusserv.job.model.Job;
import com.knust.campusserv.job.repository.JobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.web.client.RestTemplate;

import java.util.Optional;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.test.context.ActiveProfiles;

@WebMvcTest(JobController.class)
@ActiveProfiles("test")
public class JobCompletionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JobRepository jobRepository;

    @MockBean
    private RabbitTemplate rabbitTemplate;

    @MockBean
    private RestTemplate restTemplate;

    @MockBean
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    private Job job;

    @BeforeEach
    public void setup() {
        job = new Job();
        job.setId("job-123");
        job.setRequesterId("student-123");
        job.setProviderId("provider-456");
        job.setStatus("AWAITING_CODE");
        job.setCompletionCode("654321");
    }

    @Test
    public void testGetJobByIdReturnsCodeForRequester() throws Exception {
        when(jobRepository.findById("job-123")).thenReturn(Optional.of(job));

        mockMvc.perform(get("/jobs/job-123")
                .header("X-User-Id", "student-123")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("job-123"))
                .andExpect(jsonPath("$.completionCode").value("654321"));
    }

    @Test
    public void testGetJobByIdMasksCodeForProvider() throws Exception {
        when(jobRepository.findById("job-123")).thenReturn(Optional.of(job));

        mockMvc.perform(get("/jobs/job-123")
                .header("X-User-Id", "provider-456")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("job-123"))
                .andExpect(jsonPath("$.completionCode").isEmpty());
    }
}
