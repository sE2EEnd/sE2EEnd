package fr.se2eend.backend;

import fr.se2eend.backend.model.Send;
import fr.se2eend.backend.model.UploadSession;
import fr.se2eend.backend.model.enums.SendType;
import fr.se2eend.backend.repository.InstanceSettingRepository;
import fr.se2eend.backend.repository.SendRepository;
import fr.se2eend.backend.repository.UploadChunkRepository;
import fr.se2eend.backend.repository.UploadSessionRepository;
import fr.se2eend.backend.service.InstanceSettingsService;
import fr.se2eend.backend.storage.StorageService;
import fr.se2eend.backend.support.WithMockJwtUser;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * SEC-2 — the upload size limit is enforced incrementally, on every chunk, BEFORE writing to
 * disk. A client cannot exhaust storage by streaming chunks past the configured budget.
 * <p>
 * Storage is mocked so these tests stay hermetic (no real filesystem writes).
 */
@SpringBootTest
@ActiveProfiles("test")
class ChunkedUploadSizeLimitTest {

    private static final String OWNER_SUB = "11111111-1111-1111-1111-111111111111";
    private static final String MAX_UPLOAD_KEY = "max_upload_size_bytes";

    @Autowired private WebApplicationContext context;
    @Autowired private SendRepository sendRepository;
    @Autowired private UploadSessionRepository uploadSessionRepository;
    @Autowired private UploadChunkRepository uploadChunkRepository;
    @Autowired private InstanceSettingRepository instanceSettingRepository;
    @Autowired private InstanceSettingsService instanceSettingsService;

    @MockitoBean private StorageService storageService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(springSecurity())
                .build();
    }

    @AfterEach
    void tearDown() {
        uploadChunkRepository.deleteAll();
        uploadSessionRepository.deleteAll();
        sendRepository.deleteAll();
        instanceSettingRepository.deleteById(MAX_UPLOAD_KEY);
    }

    private UploadSession newSession() {
        Send send = sendRepository.save(Send.builder()
                .accessId(UUID.randomUUID().toString().replace("-", "").substring(0, 22))
                .ownerId(UUID.fromString(OWNER_SUB))
                .type(SendType.FILE)
                .maxDownloads(5)
                .createdAt(LocalDateTime.now())
                .build());
        return uploadSessionRepository.save(UploadSession.builder()
                .send(send)
                .filename("enc-filename")
                .createdAt(LocalDateTime.now())
                .build());
    }

    private org.springframework.test.web.servlet.ResultActions putChunk(UUID sessionId, int index, int sizeBytes) throws Exception {
        return mockMvc.perform(put("/api/v1/files/chunked/{sessionId}/chunk/{index}", sessionId, index)
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .content(new byte[sizeBytes]));
    }

    @Test
    @WithMockJwtUser(sub = OWNER_SUB)
    void chunkWithinLimit_isStored() throws Exception {
        instanceSettingsService.set(MAX_UPLOAD_KEY, "1000");
        UploadSession session = newSession();

        putChunk(session.getId(), 0, 500).andExpect(status().isNoContent());
        assertThat(uploadChunkRepository.countBySession(session)).isEqualTo(1);
    }

    @Test
    @WithMockJwtUser(sub = OWNER_SUB)
    void chunkExceedingLimit_isRejectedAndNotStored() throws Exception {
        instanceSettingsService.set(MAX_UPLOAD_KEY, "50");
        UploadSession session = newSession();

        putChunk(session.getId(), 0, 200).andExpect(status().is(413));
        // Rejected before writing: nothing persisted, so no disk was consumed.
        assertThat(uploadChunkRepository.countBySession(session)).isZero();
    }

    @Test
    @WithMockJwtUser(sub = OWNER_SUB)
    void cumulativeOverLimit_rejectsLaterChunk() throws Exception {
        instanceSettingsService.set(MAX_UPLOAD_KEY, "150");
        UploadSession session = newSession();

        putChunk(session.getId(), 0, 100).andExpect(status().isNoContent());   // 100 <= 150
        putChunk(session.getId(), 1, 100).andExpect(status().is(413));         // 200 > 150
        assertThat(uploadChunkRepository.countBySession(session)).isEqualTo(1);
    }
}
