package fr.se2eend.backend;

import fr.se2eend.backend.model.Send;
import fr.se2eend.backend.model.UploadSession;
import fr.se2eend.backend.model.enums.SendType;
import fr.se2eend.backend.repository.FileRepository;
import fr.se2eend.backend.repository.SendRepository;
import fr.se2eend.backend.repository.UploadChunkRepository;
import fr.se2eend.backend.repository.UploadSessionRepository;
import fr.se2eend.backend.support.WithMockJwtUser;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Only a Send's owner may attach a file to it.
 * <p>
 * A non-owner must be rejected (we return 404, not 403, so the existence of a Send isn't
 * leaked to a non-owner). Covers both upload paths: chunked (init/complete) and the regular
 * multipart upload.
 */
@SpringBootTest
@ActiveProfiles("test")
class FileAttachOwnershipTest {

    private static final String OWNER_SUB = "11111111-1111-1111-1111-111111111111";
    private static final String INTRUDER_SUB = "22222222-2222-2222-2222-222222222222";

    @Autowired private WebApplicationContext context;
    @Autowired private SendRepository sendRepository;
    @Autowired private UploadSessionRepository uploadSessionRepository;
    @Autowired private UploadChunkRepository uploadChunkRepository;
    @Autowired private FileRepository fileRepository;

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
        fileRepository.deleteAll();
        sendRepository.deleteAll();
    }

    private Send createSendOwnedByOwner() {
        // accessId column is VARCHAR(22); keep it short and unique.
        Send send = Send.builder()
                .accessId(UUID.randomUUID().toString().replace("-", "").substring(0, 22))
                .ownerId(UUID.fromString(OWNER_SUB))
                .type(SendType.FILE)
                .maxDownloads(5)
                .createdAt(LocalDateTime.now())
                .build();
        return sendRepository.save(send);
    }

    private UploadSession createSessionFor(Send send) {
        UploadSession session = UploadSession.builder()
                .send(send)
                .filename("enc-filename")
                .createdAt(LocalDateTime.now())
                .build();
        return uploadSessionRepository.save(session);
    }

    // -------------------------------------------------------------------------
    // Chunked upload — init
    // -------------------------------------------------------------------------

    @Test
    @WithMockJwtUser(sub = OWNER_SUB)
    void chunkedInit_owner_returnsCreated() throws Exception {
        Send send = createSendOwnedByOwner();

        mockMvc.perform(post("/api/v1/files/chunked/init")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sendId\":\"" + send.getId() + "\",\"filename\":\"enc\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sessionId", notNullValue()));
    }

    @Test
    @WithMockJwtUser(sub = INTRUDER_SUB)
    void chunkedInit_nonOwner_returnsNotFound() throws Exception {
        Send send = createSendOwnedByOwner();

        mockMvc.perform(post("/api/v1/files/chunked/init")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sendId\":\"" + send.getId() + "\",\"filename\":\"enc\"}"))
                .andExpect(status().isNotFound());
    }

    // -------------------------------------------------------------------------
    // Chunked upload — complete (defense in depth, on a session owned by someone else)
    // -------------------------------------------------------------------------

    @Test
    @WithMockJwtUser(sub = INTRUDER_SUB)
    void chunkedComplete_nonOwner_returnsNotFound() throws Exception {
        Send send = createSendOwnedByOwner();
        UploadSession session = createSessionFor(send);

        mockMvc.perform(post("/api/v1/files/chunked/{sessionId}/complete", session.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"totalChunks\":0,\"chunkSize\":26214400}"))
                .andExpect(status().isNotFound());
    }

    // -------------------------------------------------------------------------
    // Regular multipart upload
    // -------------------------------------------------------------------------

    @Test
    @WithMockJwtUser(sub = INTRUDER_SUB)
    void regularUpload_nonOwner_returnsNotFound() throws Exception {
        Send send = createSendOwnedByOwner();
        MockMultipartFile file = new MockMultipartFile(
                "file", "enc.bin", "application/octet-stream", new byte[] {1, 2, 3});

        mockMvc.perform(multipart("/api/v1/files")
                        .file(file)
                        .param("sendId", send.getId().toString()))
                .andExpect(status().isNotFound());
    }
}
