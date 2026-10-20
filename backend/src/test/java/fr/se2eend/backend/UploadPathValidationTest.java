package fr.se2eend.backend;

import fr.se2eend.backend.model.FileMetadata;
import fr.se2eend.backend.model.Send;
import fr.se2eend.backend.model.UploadSession;
import fr.se2eend.backend.model.enums.SendType;
import fr.se2eend.backend.repository.*;
import fr.se2eend.backend.service.InstanceSettingsService;
import fr.se2eend.backend.storage.StorageService;
import fr.se2eend.backend.support.WithMockJwtUser;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Input validation and ownership checks on the upload endpoints (chunked and multipart). */
@SpringBootTest
@ActiveProfiles("test")
class UploadPathValidationTest {

    private static final String OWNER_SUB = "11111111-1111-1111-1111-111111111111";
    private static final String INTRUDER_SUB = "22222222-2222-2222-2222-222222222222";
    private static final String MAX_UPLOAD_KEY = "max_upload_size_bytes";

    @Autowired private WebApplicationContext context;
    @Autowired private SendRepository sendRepository;
    @Autowired private UploadSessionRepository uploadSessionRepository;
    @Autowired private UploadChunkRepository uploadChunkRepository;
    @Autowired private FileRepository fileRepository;
    @Autowired private InstanceSettingRepository instanceSettingRepository;
    @Autowired private InstanceSettingsService instanceSettingsService;

    @MockitoBean private StorageService storageService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @AfterEach
    void tearDown() {
        uploadChunkRepository.deleteAll();
        uploadSessionRepository.deleteAll();
        fileRepository.deleteAll();
        sendRepository.deleteAll();
        instanceSettingRepository.deleteById(MAX_UPLOAD_KEY);
    }

    private Send newSend() {
        return sendRepository.save(Send.builder()
                .accessId(UUID.randomUUID().toString().replace("-", "").substring(0, 22))
                .ownerId(UUID.fromString(OWNER_SUB))
                .type(SendType.FILE)
                .maxDownloads(5)
                .createdAt(LocalDateTime.now())
                .build());
    }

    private UploadSession newSession() {
        return uploadSessionRepository.save(UploadSession.builder()
                .send(newSend()).filename("enc").createdAt(LocalDateTime.now()).build());
    }

    private ResultActions putChunk(UUID sessionId, int index, int size) throws Exception {
        return mockMvc.perform(put("/api/v1/files/chunked/{s}/chunk/{i}", sessionId, index)
                .contentType(MediaType.APPLICATION_OCTET_STREAM).content(new byte[size]));
    }

    @Test
    @WithMockJwtUser(sub = INTRUDER_SUB)
    void chunk_nonOwner_returnsNotFound() throws Exception {
        UploadSession session = newSession();
        putChunk(session.getId(), 0, 100).andExpect(status().isNotFound());
        assertThat(uploadChunkRepository.countBySession(session)).isZero();
    }

    @Test
    @WithMockJwtUser(sub = OWNER_SUB)
    void chunk_negativeIndex_isRejected() throws Exception {
        UploadSession session = newSession();
        putChunk(session.getId(), -1, 100).andExpect(status().isBadRequest());
        assertThat(uploadChunkRepository.countBySession(session)).isZero();
    }

    @Test
    @WithMockJwtUser(sub = OWNER_SUB)
    void chunk_hugeIndex_isRejected() throws Exception {
        UploadSession session = newSession();
        putChunk(session.getId(), 1_000_000, 100).andExpect(status().isBadRequest());
    }

    @Test
    @WithMockJwtUser(sub = OWNER_SUB)
    void chunk_duplicateIndex_isRejectedBeforeWriting() throws Exception {
        UploadSession session = newSession();
        putChunk(session.getId(), 0, 100).andExpect(status().isNoContent());
        putChunk(session.getId(), 0, 100).andExpect(status().isBadRequest());
        assertThat(uploadChunkRepository.countBySession(session)).isEqualTo(1);
        org.mockito.Mockito.verify(storageService, org.mockito.Mockito.times(1))
                .save(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyLong(),
                        org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    @WithMockJwtUser(sub = OWNER_SUB)
    void chunk_withoutContentLength_isRejected_evenWhenLimitDisabled() throws Exception {
        instanceSettingsService.set(MAX_UPLOAD_KEY, "0");
        UploadSession session = newSession();
        mockMvc.perform(put("/api/v1/files/chunked/{s}/chunk/{i}", session.getId(), 0)
                        .contentType(MediaType.APPLICATION_OCTET_STREAM)
                        .with(req -> { req.setContent(null); return req; }))
                .andExpect(status().isBadRequest());
        assertThat(uploadChunkRepository.countBySession(session)).isZero();
    }

    @Test
    @WithMockJwtUser(sub = OWNER_SUB)
    void complete_nonContiguousIndices_isRejected() throws Exception {
        UploadSession session = newSession();
        putChunk(session.getId(), 0, 100).andExpect(status().isNoContent());
        putChunk(session.getId(), 2, 100).andExpect(status().isNoContent());
        mockMvc.perform(post("/api/v1/files/chunked/{s}/complete", session.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"totalChunks\":2,\"chunkSize\":1000}"))
                .andExpect(status().isNotFound());
        assertThat(fileRepository.count()).isZero();
    }

    @Test
    @WithMockJwtUser(sub = OWNER_SUB)
    void complete_invalidParameters_areRejected() throws Exception {
        UploadSession session = newSession();
        for (String body : new String[] {
                "{\"totalChunks\":0,\"chunkSize\":1000}",
                "{\"totalChunks\":-1,\"chunkSize\":1000}",
                "{\"totalChunks\":1,\"chunkSize\":0}"}) {
            mockMvc.perform(post("/api/v1/files/chunked/{s}/complete", session.getId())
                            .contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    @WithMockJwtUser(sub = OWNER_SUB)
    void init_sendAlreadyHasFile_isRejected() throws Exception {
        Send send = newSend();
        fileRepository.save(FileMetadata.builder().send(send).filename("f")
                .storagePath("p").sizeBytes(1).build());
        mockMvc.perform(post("/api/v1/files/chunked/init")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sendId\":\"" + send.getId() + "\",\"filename\":\"enc\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockJwtUser(sub = OWNER_SUB)
    void multipart_overLimit_isRejected() throws Exception {
        instanceSettingsService.set(MAX_UPLOAD_KEY, "50");
        Send send = newSend();
        mockMvc.perform(multipart("/api/v1/files")
                        .file(new MockMultipartFile("file", "enc.bin", "application/octet-stream", new byte[200]))
                        .param("sendId", send.getId().toString()))
                .andExpect(status().is(413));
        assertThat(fileRepository.count()).isZero();
    }

    @Test
    @WithMockJwtUser(sub = OWNER_SUB)
    void multipart_withinLimit_isAccepted() throws Exception {
        instanceSettingsService.set(MAX_UPLOAD_KEY, "1000");
        org.mockito.Mockito.when(storageService.save(org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyString()))
                .thenReturn("stored-path");
        Send send = newSend();
        mockMvc.perform(multipart("/api/v1/files")
                        .file(new MockMultipartFile("file", "enc.bin", "application/octet-stream", new byte[200]))
                        .param("sendId", send.getId().toString()))
                .andExpect(status().isCreated());
    }
}
