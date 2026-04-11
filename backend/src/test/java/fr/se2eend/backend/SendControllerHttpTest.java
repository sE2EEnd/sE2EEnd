package fr.se2eend.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import fr.se2eend.backend.dto.SendRequestDto;
import fr.se2eend.backend.model.enums.SendType;
import fr.se2eend.backend.repository.DeletedSendRepository;
import fr.se2eend.backend.repository.FileRepository;
import fr.se2eend.backend.repository.SendRepository;
import fr.se2eend.backend.support.WithMockJwtUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.UUID;

import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * HTTP-layer integration tests for SendController.
 * Verifies auth enforcement, routing, and basic request/response contracts.
 */
@SpringBootTest
@ActiveProfiles("test")
class SendControllerHttpTest {

    @Autowired private WebApplicationContext context;
    @Autowired private SendRepository sendRepository;
    @Autowired private FileRepository fileRepository;
    @Autowired private DeletedSendRepository deletedSendRepository;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(springSecurity())
                .build();
    }

    @AfterEach
    void tearDown() {
        fileRepository.deleteAll();
        deletedSendRepository.deleteAll();
        sendRepository.deleteAll();
    }

    // -------------------------------------------------------------------------
    // Auth enforcement
    // -------------------------------------------------------------------------

    @Test
    void createSend_unauthenticated_returns401() throws Exception {
        SendRequestDto request = new SendRequestDto("Test", SendType.FILE, null, 5, false, null);
        mockMvc.perform(post("/api/v1/sends")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deleteSend_unauthenticated_returns401() throws Exception {
        mockMvc.perform(delete("/api/v1/sends/{id}", UUID.randomUUID()))
                .andExpect(status().isUnauthorized());
    }

    // -------------------------------------------------------------------------
    // Public access
    // -------------------------------------------------------------------------

    @Test
    void getSend_unknownUuid_returnsNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/sends/{id}", UUID.randomUUID()))
                .andExpect(status().isNotFound());
    }

    @Test
    void getSend_unknownAccessId_returnsNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/sends/unknownAccessId123"))
                .andExpect(status().isNotFound());
    }

    // -------------------------------------------------------------------------
    // Authenticated flows
    // -------------------------------------------------------------------------

    @Test
    @WithMockJwtUser
    void createSend_authenticated_returnsOkWithAccessId() throws Exception {
        SendRequestDto request = new SendRequestDto("My Send", SendType.FILE, null, 3, false, null);
        mockMvc.perform(post("/api/v1/sends")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessId", notNullValue()))
                .andExpect(jsonPath("$.name").value("My Send"));
    }

    @Test
    @WithMockJwtUser
    void getSend_afterCreate_isPubliclyAccessible() throws Exception {
        SendRequestDto request = new SendRequestDto("Public Send", SendType.FILE, null, 5, false, null);
        String body = mockMvc.perform(post("/api/v1/sends")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String accessId = objectMapper.readTree(body).get("accessId").asText();

        mockMvc.perform(get("/api/v1/sends/{id}", accessId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Public Send"));
    }

    @Test
    @WithMockJwtUser
    void deleteSend_nonExistent_returnsNotFound() throws Exception {
        mockMvc.perform(delete("/api/v1/sends/{id}", UUID.randomUUID()))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockJwtUser
    void deleteSend_ownSend_returnsNoContent() throws Exception {
        SendRequestDto request = new SendRequestDto("To Delete", SendType.FILE, null, 3, false, null);
        String body = mockMvc.perform(post("/api/v1/sends")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String id = objectMapper.readTree(body).get("id").asText();

        mockMvc.perform(delete("/api/v1/sends/{id}", id))
                .andExpect(status().isNoContent());
    }
}