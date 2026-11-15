package fr.se2eend.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import fr.se2eend.backend.dto.SendRequestDto;
import fr.se2eend.backend.model.DeletedSend;
import fr.se2eend.backend.model.FileMetadata;
import fr.se2eend.backend.model.Send;
import fr.se2eend.backend.model.UploadChunk;
import fr.se2eend.backend.model.UploadSession;
import fr.se2eend.backend.model.enums.DeleteReason;
import fr.se2eend.backend.model.enums.SendType;
import fr.se2eend.backend.repository.DeletedSendRepository;
import fr.se2eend.backend.repository.FileRepository;
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
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Recipients holding the link can destroy a send when its sender allowed it (issue #94).
 */
@SpringBootTest
@ActiveProfiles("test")
class SendRecipientDestroyTest {

    private static final String OWNER_SUB = "11111111-1111-1111-1111-111111111111";
    private static final SecureRandom RANDOM = new SecureRandom();
    /** Each test calls from its own address so the shared per-client attempt budget never leaks between tests. */
    private static final AtomicInteger CLIENT_SEQ = new AtomicInteger();

    @Autowired private WebApplicationContext context;
    @Autowired private SendRepository sendRepository;
    @Autowired private FileRepository fileRepository;
    @Autowired private DeletedSendRepository deletedSendRepository;
    @Autowired private UploadSessionRepository uploadSessionRepository;
    @Autowired private UploadChunkRepository uploadChunkRepository;
    @Autowired private StorageService storageService;
    @Autowired private InstanceSettingsService instanceSettingsService;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private RequestPostProcessor client;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        instanceSettingsService.set("require_auth_for_download", "false");
        String address = "10.94.0." + CLIENT_SEQ.incrementAndGet();
        client = request -> {
            request.setRemoteAddr(address);
            return request;
        };
    }

    @AfterEach
    void tearDown() {
        uploadChunkRepository.deleteAll();
        uploadSessionRepository.deleteAll();
        fileRepository.deleteAll();
        deletedSendRepository.deleteAll();
        sendRepository.deleteAll();
        instanceSettingsService.set("require_auth_for_download", "true");
        instanceSettingsService.set(InstanceSettingsService.ALLOW_RECIPIENT_DESTROY, "true");
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private static String newToken() {
        byte[] raw = new byte[32];
        RANDOM.nextBytes(raw);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
    }

    private static String hashOf(String token) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(Base64.getUrlDecoder().decode(token));
        return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
    }

    private Send send(String tokenHash, boolean passwordProtected) {
        return sendRepository.save(Send.builder()
                .accessId(UUID.randomUUID().toString().replace("-", "").substring(0, 22))
                .ownerId(UUID.fromString(OWNER_SUB))
                .name("report")
                .type(SendType.FILE)
                .maxDownloads(3)
                .passwordProtected(passwordProtected)
                .passwordHash(passwordProtected ? "$2a$10$abcdefghijklmnopqrstuuJ5b3wC0b3wC0b3wC0b3wC0b3wC0b3w" : null)
                .recipientDestroyTokenHash(tokenHash)
                .createdAt(LocalDateTime.now())
                .build());
    }

    private String attachFile(Send send) throws IOException {
        String path = storageService.save(new ByteArrayInputStream("ciphertext".getBytes()), 10, UUID.randomUUID().toString());
        fileRepository.save(FileMetadata.builder()
                .send(send).filename("file.enc").storagePath(path).sizeBytes(10).build());
        return path;
    }

    private ResultActions destroy(String accessId, String token) throws Exception {
        return mockMvc.perform(post("/api/v1/sends/{accessId}/destroy", accessId)
                .with(client)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("token", token))));
    }

    private static void assertNotFound(ResultActions result) throws Exception {
        result.andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("SEND_NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("Resource not found"));
    }

    // -------------------------------------------------------------------------
    // Destroy
    // -------------------------------------------------------------------------

    @Test
    void validToken_deletesFilesImmediately_andWritesRecipientAudit() throws Exception {
        String token = newToken();
        Send send = send(hashOf(token), false);
        String path = attachFile(send);

        destroy(send.getAccessId(), token).andExpect(status().isNoContent());

        assertThat(sendRepository.findByAccessId(send.getAccessId())).isEmpty();
        assertThrows(IOException.class, () -> storageService.read(path));
        List<DeletedSend> audit = deletedSendRepository.findAll();
        assertThat(audit).hasSize(1);
        assertThat(audit.getFirst().getDeleteReason()).isEqualTo(DeleteReason.RECIPIENT);
        assertThat(audit.getFirst().getOriginalSendId()).isEqualTo(send.getId());
        assertThat(audit.getFirst().getDeletedAt()).isNotNull();
        assertThat(audit.getFirst().getTotalSizeBytes()).isEqualTo(10);

        mockMvc.perform(get("/api/v1/sends/{id}", send.getAccessId()).with(client)).andExpect(status().isNotFound());
    }

    @Test
    void validToken_alsoDeletesUnfinishedChunkedUpload() throws Exception {
        String token = newToken();
        Send send = send(hashOf(token), false);
        UploadSession session = uploadSessionRepository.save(UploadSession.builder()
                .send(send).filename("big.enc").createdAt(LocalDateTime.now()).build());
        String chunkPath = storageService.save(
                new ByteArrayInputStream("chunk".getBytes()), 5, "chunks/" + session.getId() + "/0");
        uploadChunkRepository.save(UploadChunk.builder()
                .session(session).chunkIndex(0).storagePath(chunkPath).sizeBytes(5).build());

        destroy(send.getAccessId(), token).andExpect(status().isNoContent());

        assertThat(uploadSessionRepository.count()).isZero();
        assertThat(uploadChunkRepository.count()).isZero();
        assertThrows(IOException.class, () -> storageService.read(chunkPath));
        assertThat(deletedSendRepository.findAll()).extracting(DeletedSend::getDeleteReason)
                .containsExactly(DeleteReason.RECIPIENT);
    }

    @Test
    void passwordProtectedSend_canBeDestroyedWithoutThePassword() throws Exception {
        String token = newToken();
        Send send = send(hashOf(token), true);

        destroy(send.getAccessId(), token).andExpect(status().isNoContent());

        assertThat(sendRepository.count()).isZero();
    }

    @Test
    void invalidToken_isRejected_andKeepsTheSend() throws Exception {
        Send send = send(hashOf(newToken()), false);
        String path = attachFile(send);

        assertNotFound(destroy(send.getAccessId(), newToken()));

        assertThat(sendRepository.findByAccessId(send.getAccessId())).isPresent();
        try (var stored = storageService.read(path)) {
            assertThat(stored.readAllBytes()).isEqualTo("ciphertext".getBytes());
        }
        assertThat(deletedSendRepository.count()).isZero();
    }

    @Test
    void optionDisabled_isRejectedLikeAnInvalidToken() throws Exception {
        Send send = send(null, false);

        assertNotFound(destroy(send.getAccessId(), newToken()));

        assertThat(sendRepository.findByAccessId(send.getAccessId())).isPresent();
    }

    @Test
    void alreadyDestroyedSend_isRejectedLikeAnInvalidToken() throws Exception {
        String token = newToken();
        Send send = send(hashOf(token), false);
        destroy(send.getAccessId(), token).andExpect(status().isNoContent());

        assertNotFound(destroy(send.getAccessId(), token));

        assertThat(deletedSendRepository.count()).isEqualTo(1);
    }

    @Test
    void unknownSend_isRejectedLikeAnInvalidToken() throws Exception {
        assertNotFound(destroy("doesNotExist0000000000", newToken()));
    }

    @Test
    void malformedOrMissingToken_isRejectedLikeAnInvalidToken() throws Exception {
        Send send = send(hashOf(newToken()), false);

        assertNotFound(destroy(send.getAccessId(), "not a token"));
        // The stored hash itself is not a valid token.
        assertNotFound(destroy(send.getAccessId(), send.getRecipientDestroyTokenHash() + "A"));
        assertNotFound(mockMvc.perform(post("/api/v1/sends/{accessId}/destroy", send.getAccessId())
                .with(client).contentType(MediaType.APPLICATION_JSON).content("{}")));
        assertNotFound(mockMvc.perform(post("/api/v1/sends/{accessId}/destroy", send.getAccessId()).with(client)));

        assertThat(sendRepository.count()).isEqualTo(1);
    }

    @Test
    void repeatedFailures_areRateLimited_evenForTheValidToken() throws Exception {
        String token = newToken();
        Send send = send(hashOf(token), false);

        for (int i = 0; i < 10; i++) {
            assertNotFound(destroy(send.getAccessId(), newToken()));
        }

        destroy(send.getAccessId(), token)
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("TOO_MANY_REQUESTS"));
        assertThat(sendRepository.count()).isEqualTo(1);
    }

    @Test
    void anonymous_canDestroy_evenWhenInstanceRequiresAuthForDownload() throws Exception {
        instanceSettingsService.set("require_auth_for_download", "true");
        String token = newToken();
        Send send = send(hashOf(token), false);

        destroy(send.getAccessId(), token).andExpect(status().isNoContent());

        assertThat(sendRepository.count()).isZero();
    }

    @Test
    void destroyRoute_isTheOnlyPublicPost() throws Exception {
        mockMvc.perform(post("/api/v1/sends").with(client).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/v1/sends/{accessId}/revoke", "doesNotExist0000000000").with(client))
                .andExpect(status().isUnauthorized());
    }

    // -------------------------------------------------------------------------
    // Instance setting
    // -------------------------------------------------------------------------

    @Test
    @WithMockJwtUser(sub = OWNER_SUB)
    void creation_withOption_isRejected_whenInstanceSettingIsOff() throws Exception {
        instanceSettingsService.set(InstanceSettingsService.ALLOW_RECIPIENT_DESTROY, "false");
        SendRequestDto request = new SendRequestDto("n", SendType.FILE, null, 2, false, null, hashOf(newToken()));

        mockMvc.perform(post("/api/v1/sends")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        assertThat(sendRepository.count()).isZero();
    }

    @Test
    @WithMockJwtUser(sub = OWNER_SUB)
    void creation_withoutOption_stillWorks_whenInstanceSettingIsOff() throws Exception {
        instanceSettingsService.set(InstanceSettingsService.ALLOW_RECIPIENT_DESTROY, "false");
        SendRequestDto request = new SendRequestDto("n", SendType.FILE, null, 2, false, null);

        mockMvc.perform(post("/api/v1/sends")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    void sendCreatedBeforeSettingWasTurnedOff_canStillBeDestroyed() throws Exception {
        String token = newToken();
        Send send = send(hashOf(token), false);
        instanceSettingsService.set(InstanceSettingsService.ALLOW_RECIPIENT_DESTROY, "false");

        mockMvc.perform(get("/api/v1/sends/{id}", send.getAccessId()).with(client))
                .andExpect(jsonPath("$.recipientCanDestroy").value(true));
        destroy(send.getAccessId(), token).andExpect(status().isNoContent());

        assertThat(deletedSendRepository.findAll()).extracting(DeletedSend::getDeleteReason)
                .containsExactly(DeleteReason.RECIPIENT);
    }

    @Test
    @WithMockJwtUser(sub = OWNER_SUB)
    void sendPolicy_exposesTheInstanceSetting() throws Exception {
        mockMvc.perform(get("/api/v1/config/send-policy"))
                .andExpect(jsonPath("$.allowRecipientDestroy").value(true));

        instanceSettingsService.set(InstanceSettingsService.ALLOW_RECIPIENT_DESTROY, "false");

        mockMvc.perform(get("/api/v1/config/send-policy"))
                .andExpect(jsonPath("$.allowRecipientDestroy").value(false));
    }

    @Test
    @WithMockJwtUser(sub = OWNER_SUB)
    void instanceSetting_cannotBeChangedByARegularUser() throws Exception {
        mockMvc.perform(patch("/api/v1/admin/settings/{key}", InstanceSettingsService.ALLOW_RECIPIENT_DESTROY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"value\":\"false\"}"))
                .andExpect(status().isForbidden());

        assertThat(instanceSettingsService.getBoolean(InstanceSettingsService.ALLOW_RECIPIENT_DESTROY, true)).isTrue();
    }

    @Test
    void instanceSetting_cannotBeChangedAnonymously() throws Exception {
        mockMvc.perform(patch("/api/v1/admin/settings/{key}", InstanceSettingsService.ALLOW_RECIPIENT_DESTROY)
                        .with(client)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"value\":\"false\"}"))
                .andExpect(status().isUnauthorized());

        assertThat(instanceSettingsService.getBoolean(InstanceSettingsService.ALLOW_RECIPIENT_DESTROY, true)).isTrue();
    }

    @Test
    @WithMockUser(roles = "admin")
    void instanceSetting_canBeChangedByAnAdmin() throws Exception {
        mockMvc.perform(patch("/api/v1/admin/settings/{key}", InstanceSettingsService.ALLOW_RECIPIENT_DESTROY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"value\":\"false\"}"))
                .andExpect(status().isOk());

        assertThat(instanceSettingsService.getBoolean(InstanceSettingsService.ALLOW_RECIPIENT_DESTROY, true)).isFalse();
    }

    // -------------------------------------------------------------------------
    // Creation, metadata and history
    // -------------------------------------------------------------------------

    @Test
    void publicMetadata_exposesFlag_butNeverTheHash() throws Exception {
        Send withOption = send(hashOf(newToken()), false);
        Send withoutOption = send(null, false);

        mockMvc.perform(get("/api/v1/sends/{id}", withOption.getAccessId()).with(client))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recipientCanDestroy").value(true))
                .andExpect(content().string(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString(withOption.getRecipientDestroyTokenHash()))))
                .andExpect(jsonPath("$.recipientDestroyTokenHash").doesNotExist());

        mockMvc.perform(get("/api/v1/sends/{id}", withoutOption.getAccessId()).with(client))
                .andExpect(jsonPath("$.recipientCanDestroy").value(false));
    }

    @Test
    @WithMockJwtUser(sub = OWNER_SUB)
    void creation_storesOnlyTheHash_andOwnerApiNeverReturnsIt() throws Exception {
        String hash = hashOf(newToken());
        SendRequestDto request = new SendRequestDto("n", SendType.FILE, null, 2, false, null, hash);

        mockMvc.perform(post("/api/v1/sends")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recipientCanDestroy").value(true))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString(hash))));

        assertThat(sendRepository.findAll()).extracting(Send::getRecipientDestroyTokenHash).containsExactly(hash);

        mockMvc.perform(get("/api/v1/sends"))
                .andExpect(jsonPath("$[0].recipientCanDestroy").value(true))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString(hash))));
    }

    @Test
    @WithMockJwtUser(sub = OWNER_SUB)
    void creation_withoutOption_storesNothing() throws Exception {
        SendRequestDto request = new SendRequestDto("n", SendType.FILE, null, 2, false, null);

        mockMvc.perform(post("/api/v1/sends")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recipientCanDestroy").value(false));

        assertThat(sendRepository.findAll()).extracting(Send::getRecipientDestroyTokenHash).containsOnlyNulls();
    }

    @Test
    @WithMockJwtUser(sub = OWNER_SUB)
    void creation_rejectsMalformedHash() throws Exception {
        SendRequestDto request = new SendRequestDto("n", SendType.FILE, null, 2, false, null, "too-short");

        mockMvc.perform(post("/api/v1/sends")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockJwtUser(sub = OWNER_SUB)
    void recipientDestruction_appearsInOwnerHistory_withDate() throws Exception {
        String token = newToken();
        Send send = send(hashOf(token), false);
        destroy(send.getAccessId(), token).andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/sends/history"))
                .andExpect(jsonPath("$.content[0].name").value("report"))
                .andExpect(jsonPath("$.content[0].status").value("RECIPIENT"))
                .andExpect(jsonPath("$.content[0].endedAt").exists());

        mockMvc.perform(get("/api/v1/sends/history").param("status", "RECIPIENT"))
                .andExpect(jsonPath("$.totalElements").value(1));
        mockMvc.perform(get("/api/v1/sends/history").param("status", "USER"))
                .andExpect(jsonPath("$.totalElements").value(0));
    }
}
