package fr.se2eend.backend;

import fr.se2eend.backend.model.DeletedSend;
import fr.se2eend.backend.model.Send;
import fr.se2eend.backend.model.enums.DeleteReason;
import fr.se2eend.backend.model.enums.SendType;
import fr.se2eend.backend.repository.DeletedSendRepository;
import fr.se2eend.backend.repository.SendRepository;
import fr.se2eend.backend.service.AdminService;
import fr.se2eend.backend.support.WithMockJwtUser;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Users can browse their own past sends (metadata only), filtered by status.
 */
@SpringBootTest
@ActiveProfiles("test")
class SendHistoryTest {

    private static final String OWNER_SUB = "11111111-1111-1111-1111-111111111111";
    private static final String OTHER_SUB = "22222222-2222-2222-2222-222222222222";

    @Autowired private WebApplicationContext context;
    @Autowired private SendRepository sendRepository;
    @Autowired private DeletedSendRepository deletedSendRepository;
    @Autowired private AdminService adminService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @AfterEach
    void tearDown() {
        deletedSendRepository.deleteAll();
        sendRepository.deleteAll();
    }

    private DeletedSend history(String ownerSub, DeleteReason reason, String name) {
        return deletedSendRepository.save(DeletedSend.builder()
                .originalSendId(UUID.randomUUID())
                .accessId("secretAccessId0000000")
                .ownerId(UUID.fromString(ownerSub))
                .name(name)
                .sendCreatedAt(LocalDateTime.now().minusDays(2))
                .deletedAt(LocalDateTime.now())
                .deleteReason(reason)
                .totalSizeBytes(10)
                .build());
    }

    @Test
    void history_anonymous_isUnauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/sends/history")).andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockJwtUser(sub = OWNER_SUB)
    void history_onlyReturnsOwnSends_withoutAccessId() throws Exception {
        history(OWNER_SUB, DeleteReason.EXPIRED, "mine");
        history(OTHER_SUB, DeleteReason.EXPIRED, "theirs");

        mockMvc.perform(get("/api/v1/sends/history"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].name").value("mine"))
                .andExpect(jsonPath("$.content[0].status").value("EXPIRED"))
                .andExpect(jsonPath("$.content[0].accessId").doesNotExist());
    }

    @Test
    @WithMockJwtUser(sub = OWNER_SUB)
    void history_filtersByStatus_andGroupsDeletions() throws Exception {
        history(OWNER_SUB, DeleteReason.EXPIRED, "a");
        history(OWNER_SUB, DeleteReason.REVOKED, "b");
        history(OWNER_SUB, DeleteReason.USER, "c");
        history(OWNER_SUB, DeleteReason.MANUAL, "d");

        mockMvc.perform(get("/api/v1/sends/history").param("status", "REVOKED"))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].name").value("b"));

        mockMvc.perform(get("/api/v1/sends/history").param("status", "USER"))
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[0].status").value("USER"));
    }

    @Test
    @WithMockJwtUser(sub = OWNER_SUB)
    void userDeletion_appearsInHistoryWithMetadata() throws Exception {
        Send send = sendRepository.save(Send.builder()
                .accessId(UUID.randomUUID().toString().replace("-", "").substring(0, 22))
                .ownerId(UUID.fromString(OWNER_SUB))
                .name("report")
                .type(SendType.FILE)
                .maxDownloads(3)
                .createdAt(LocalDateTime.now())
                .build());

        mockMvc.perform(delete("/api/v1/sends/{id}", send.getId())).andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/sends/history"))
                .andExpect(jsonPath("$.content[0].name").value("report"))
                .andExpect(jsonPath("$.content[0].status").value("USER"))
                .andExpect(jsonPath("$.content[0].maxDownloads").value(3));
    }

    @Test
    @WithMockJwtUser(sub = OWNER_SUB)
    void cleanup_keepsExpiredAndRevokedSendsInHistory() throws Exception {
        sendRepository.save(Send.builder()
                .accessId(UUID.randomUUID().toString().replace("-", "").substring(0, 22))
                .ownerId(UUID.fromString(OWNER_SUB)).name("old").type(SendType.FILE).maxDownloads(5)
                .expiresAt(LocalDateTime.now().minusHours(1)).createdAt(LocalDateTime.now().minusDays(1)).build());
        sendRepository.save(Send.builder()
                .accessId(UUID.randomUUID().toString().replace("-", "").substring(0, 22))
                .ownerId(UUID.fromString(OWNER_SUB)).name("revoked").type(SendType.FILE).maxDownloads(5)
                .revoked(true).createdAt(LocalDateTime.now().minusDays(1)).build());

        adminService.runCleanup();

        assertThat(sendRepository.count()).isZero();
        mockMvc.perform(get("/api/v1/sends/history"))
                .andExpect(jsonPath("$.totalElements").value(2));
        mockMvc.perform(get("/api/v1/sends/history").param("status", "EXPIRED"))
                .andExpect(jsonPath("$.content[0].name").value("old"))
                .andExpect(jsonPath("$.content[0].expiresAt").exists());
    }
}
