package fr.se2eend.backend;

import fr.se2eend.backend.model.Send;
import fr.se2eend.backend.model.enums.SendType;
import fr.se2eend.backend.repository.FileRepository;
import fr.se2eend.backend.repository.SendRepository;
import fr.se2eend.backend.service.FileService;
import fr.se2eend.backend.storage.StorageService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class FileUploadStorageKeyTest {

    private static final UUID OWNER_A = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID OWNER_B = UUID.fromString("22222222-2222-2222-2222-222222222222");

    @Autowired private FileService fileService;
    @Autowired private SendRepository sendRepository;
    @Autowired private FileRepository fileRepository;
    @Autowired private StorageService storageService;

    @AfterEach
    void tearDown() {
        fileRepository.deleteAll();
        sendRepository.deleteAll();
    }

    private Send createSendOwnedBy(UUID ownerId) {
        // accessId column is VARCHAR(22); keep it short and unique.
        Send send = Send.builder()
                .accessId(UUID.randomUUID().toString().replace("-", "").substring(0, 22))
                .ownerId(ownerId)
                .type(SendType.FILE)
                .maxDownloads(5)
                .createdAt(LocalDateTime.now())
                .build();
        return sendRepository.save(send);
    }

    private void authenticateAs(UUID userId) {
        Jwt jwt = Jwt.withTokenValue("mock-token")
                .header("alg", "none")
                .claim("sub", userId.toString())
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt, List.of()));
    }

    @Test
    void sameOriginalFilename_twoUnrelatedSends_doNotCollideOnStorage() throws Exception {
        Send sendA = createSendOwnedBy(OWNER_A);
        Send sendB = createSendOwnedBy(OWNER_B);

        authenticateAs(OWNER_A);
        var fileA = fileService.addFileToSend(sendA.getId(), new MockMultipartFile(
                "file", "invoice.pdf", "application/octet-stream", "ciphertext-A".getBytes()));

        authenticateAs(OWNER_B);
        var fileB = fileService.addFileToSend(sendB.getId(), new MockMultipartFile(
                "file", "invoice.pdf", "application/octet-stream", "ciphertext-B".getBytes()));

        assertThat(fileA.getStoragePath()).isNotEqualTo(fileB.getStoragePath());

        byte[] contentA = storageService.read(fileA.getStoragePath()).readAllBytes();
        byte[] contentB = storageService.read(fileB.getStoragePath()).readAllBytes();

        assertThat(new String(contentA)).isEqualTo("ciphertext-A");
        assertThat(new String(contentB)).isEqualTo("ciphertext-B");
    }
}
