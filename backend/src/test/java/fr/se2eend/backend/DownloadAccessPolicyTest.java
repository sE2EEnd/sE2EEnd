package fr.se2eend.backend;

import fr.se2eend.backend.dto.SendRequestDto;
import fr.se2eend.backend.dto.SendResponseDto;
import fr.se2eend.backend.model.FileMetadata;
import fr.se2eend.backend.model.Send;
import fr.se2eend.backend.model.enums.SendType;
import fr.se2eend.backend.repository.FileRepository;
import fr.se2eend.backend.repository.SendRepository;
import fr.se2eend.backend.service.InstanceSettingsService;
import fr.se2eend.backend.service.SendService;
import fr.se2eend.backend.storage.StorageService;
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

import java.io.ByteArrayInputStream;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
class DownloadAccessPolicyTest {

    @Autowired private WebApplicationContext context;
    @Autowired private SendService sendService;
    @Autowired private SendRepository sendRepository;
    @Autowired private FileRepository fileRepository;
    @Autowired private StorageService storageService;
    @Autowired private InstanceSettingsService settings;

    private MockMvc mockMvc;
    private String accessId;

    @BeforeEach
    void setUp() throws Exception {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        fileRepository.deleteAll();
        sendRepository.deleteAll();
        SendResponseDto r = sendService.createSend(new SendRequestDto(null, SendType.FILE, null, 5, false, null));
        Send send = sendRepository.findById(r.id()).orElseThrow();
        String path = storageService.save(new ByteArrayInputStream("x".getBytes()), 1, "f.enc");
        fileRepository.save(FileMetadata.builder().send(send).filename("f.enc").storagePath(path).sizeBytes(1).build());
        accessId = r.accessId();
    }

    @AfterEach
    void tearDown() {
        settings.set("require_auth_for_download", "false");
        fileRepository.deleteAll();
        sendRepository.deleteAll();
    }

    @Test
    void anonymous_isRejected_whenAuthRequired() throws Exception {
        settings.set("require_auth_for_download", "true");
        mockMvc.perform(get("/api/v1/sends/{id}", accessId)).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/sends/{id}/download", accessId)).andExpect(status().isUnauthorized());
    }

    @Test
    void anonymous_isAllowed_whenAuthNotRequired() throws Exception {
        settings.set("require_auth_for_download", "false");
        mockMvc.perform(get("/api/v1/sends/{id}", accessId)).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/sends/{id}/download", accessId)).andExpect(status().isOk());
    }

    @Test
    @WithMockJwtUser
    void authenticated_isAllowed_whenAuthRequired() throws Exception {
        settings.set("require_auth_for_download", "true");
        mockMvc.perform(get("/api/v1/sends/{id}", accessId)).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/sends/{id}/download", accessId)).andExpect(status().isOk());
    }
}
