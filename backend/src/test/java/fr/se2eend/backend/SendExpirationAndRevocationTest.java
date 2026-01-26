package fr.se2eend.backend;

import fr.se2eend.backend.dto.SendRequestDto;
import fr.se2eend.backend.dto.SendResponseDto;
import fr.se2eend.backend.exception.SendExpiredException;
import fr.se2eend.backend.exception.SendRevokedException;
import fr.se2eend.backend.model.FileMetadata;
import fr.se2eend.backend.model.Send;
import fr.se2eend.backend.model.enums.SendType;
import fr.se2eend.backend.repository.FileRepository;
import fr.se2eend.backend.repository.SendRepository;
import fr.se2eend.backend.service.SendDownloadService;
import fr.se2eend.backend.service.SendService;
import fr.se2eend.backend.storage.StorageService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration test for Send expiration and revocation scenarios.
 * Tests that expired or revoked Sends cannot be downloaded.
 */
@SpringBootTest
class SendExpirationAndRevocationTest {

    @Autowired
    private SendService sendService;

    @Autowired
    private SendDownloadService sendDownloadService;

    @Autowired
    private SendRepository sendRepository;

    @Autowired
    private FileRepository fileRepository;

    @Autowired
    private StorageService storageService;

    @BeforeEach
    void setUp() {
        fileRepository.deleteAll();
        sendRepository.deleteAll();
    }

    @AfterEach
    void tearDown() {
        fileRepository.deleteAll();
        sendRepository.deleteAll();
    }

    @Test
    void testExpiredSend_cannotBeDownloaded() throws IOException {
        // Given: A Send that expired 1 hour ago
        LocalDateTime pastExpiration = LocalDateTime.now().minusHours(1);
        SendRequestDto request = new SendRequestDto(null, 
                SendType.FILE,
                "encrypted-metadata",
                pastExpiration,
                5,
                false,
                null
        );
        SendResponseDto response = sendService.createSend(request);

        // Add a file
        Send send = sendRepository.findById(response.id()).orElseThrow();
        String storagePath = storageService.save(
                new ByteArrayInputStream("content".getBytes()),
                "content".length(),
                "file.enc"
        );
        FileMetadata file = FileMetadata.builder()
                .send(send)
                .filename("file.enc")
                .storagePath(storagePath)
                .sizeBytes("content".length())
                .build();
        fileRepository.save(file);

        // When/Then: Download should fail with SendExpiredException
        assertThrows(SendExpiredException.class, () -> {
            sendDownloadService.downloadByAccessId(response.accessId(), null);
        });

        // Verify downloadCount was NOT incremented
        Send updatedSend = sendRepository.findById(response.id()).orElseThrow();
        assertEquals(0, updatedSend.getDownloadCount());
    }

    @Test
    void testNonExpiredSend_canBeDownloaded() throws IOException {
        // Given: A Send that expires in the future
        LocalDateTime futureExpiration = LocalDateTime.now().plusHours(1);
        SendRequestDto request = new SendRequestDto(null, 
                SendType.FILE,
                "encrypted-metadata",
                futureExpiration,
                5,
                false,
                null
        );
        SendResponseDto response = sendService.createSend(request);

        // Add a file
        Send send = sendRepository.findById(response.id()).orElseThrow();
        String storagePath = storageService.save(
                new ByteArrayInputStream("content".getBytes()),
                "content".length(),
                "file.enc"
        );
        FileMetadata file = FileMetadata.builder()
                .send(send)
                .filename("file.enc")
                .storagePath(storagePath)
                .sizeBytes("content".length())
                .build();
        fileRepository.save(file);

        // When: Download the file
        var stream = sendDownloadService.downloadByAccessId(response.accessId(), null);

        // Then: Should succeed
        assertNotNull(stream);
        assertEquals("file.enc", stream.filename());

        // Verify downloadCount was incremented
        Send updatedSend = sendRepository.findById(response.id()).orElseThrow();
        assertEquals(1, updatedSend.getDownloadCount());
    }

    @Test
    void testNoExpirationSet_canAlwaysBeDownloaded() throws IOException {
        // Given: A Send with no expiration date
        SendRequestDto request = new SendRequestDto(null, 
                SendType.FILE,
                "encrypted-metadata",
                null,
                5,
                false,
                null
        );
        SendResponseDto response = sendService.createSend(request);

        // Add a file
        Send send = sendRepository.findById(response.id()).orElseThrow();
        String storagePath = storageService.save(
                new ByteArrayInputStream("content".getBytes()),
                "content".length(),
                "file.enc"
        );
        FileMetadata file = FileMetadata.builder()
                .send(send)
                .filename("file.enc")
                .storagePath(storagePath)
                .sizeBytes("content".length())
                .build();
        fileRepository.save(file);

        // When: Download
        var stream = sendDownloadService.downloadByAccessId(response.accessId(), null);

        // Then: Should succeed
        assertNotNull(stream);
        assertEquals("file.enc", stream.filename());
    }

    @Test
    void testRevokedSend_cannotBeDownloaded() throws IOException {
        // Given: A Send that is revoked
        SendRequestDto request = new SendRequestDto(null, 
                SendType.FILE,
                "encrypted-metadata",
                null,
                5,
                false,
                null
        );
        SendResponseDto response = sendService.createSend(request);

        // Add a file
        Send send = sendRepository.findById(response.id()).orElseThrow();
        String storagePath = storageService.save(
                new ByteArrayInputStream("content".getBytes()),
                "content".length(),
                "file.enc"
        );
        FileMetadata file = FileMetadata.builder()
                .send(send)
                .filename("file.enc")
                .storagePath(storagePath)
                .sizeBytes("content".length())
                .build();
        fileRepository.save(file);

        // Revoke the Send
        send.setRevoked(true);
        sendRepository.save(send);

        // When/Then: Download should fail with SendRevokedException
        assertThrows(SendRevokedException.class, () -> {
            sendDownloadService.downloadByAccessId(response.accessId(), null);
        });

        // Verify downloadCount was NOT incremented
        Send updatedSend = sendRepository.findById(response.id()).orElseThrow();
        assertEquals(0, updatedSend.getDownloadCount());
    }

    @Test
    void testSend_downloadBeforeRevoke_thenAfterRevoke() throws IOException {
        // Given: A normal Send
        SendRequestDto request = new SendRequestDto(null, 
                SendType.FILE,
                "encrypted-metadata",
                null,
                5,
                false,
                null
        );
        SendResponseDto response = sendService.createSend(request);

        // Add a file
        Send send = sendRepository.findById(response.id()).orElseThrow();
        String storagePath = storageService.save(
                new ByteArrayInputStream("content".getBytes()),
                "content".length(),
                "file.enc"
        );
        FileMetadata file = FileMetadata.builder()
                .send(send)
                .filename("file.enc")
                .storagePath(storagePath)
                .sizeBytes("content".length())
                .build();
        fileRepository.save(file);

        // When: First download (should succeed)
        var stream1 = sendDownloadService.downloadByAccessId(response.accessId(), null);
        assertNotNull(stream1);

        // Verify downloadCount
        Send afterFirstDownload = sendRepository.findById(response.id()).orElseThrow();
        assertEquals(1, afterFirstDownload.getDownloadCount());

        // Revoke the Send
        afterFirstDownload.setRevoked(true);
        sendRepository.save(afterFirstDownload);

        // Then: Second download should fail
        assertThrows(SendRevokedException.class, () -> {
            sendDownloadService.downloadByAccessId(response.accessId(), null);
        });

        // Verify downloadCount did not increment after revocation
        Send afterSecondAttempt = sendRepository.findById(response.id()).orElseThrow();
        assertEquals(1, afterSecondAttempt.getDownloadCount());
    }

    @Test
    void testExpiredAndRevoked_expirationCheckedFirst() throws IOException {
        // Given: A Send that is both expired AND revoked
        LocalDateTime pastExpiration = LocalDateTime.now().minusHours(1);
        SendRequestDto request = new SendRequestDto(null, 
                SendType.FILE,
                "encrypted-metadata",
                pastExpiration,
                5,
                false,
                null
        );
        SendResponseDto response = sendService.createSend(request);

        // Add a file
        Send send = sendRepository.findById(response.id()).orElseThrow();
        send.setRevoked(true);
        sendRepository.save(send);

        String storagePath = storageService.save(
                new ByteArrayInputStream("content".getBytes()),
                "content".length(),
                "file.enc"
        );
        FileMetadata file = FileMetadata.builder()
                .send(send)
                .filename("file.enc")
                .storagePath(storagePath)
                .sizeBytes("content".length())
                .build();
        fileRepository.save(file);

        // When/Then: Should throw SendRevokedException (checked before expiration)
        assertThrows(SendRevokedException.class, () -> {
            sendDownloadService.downloadByAccessId(response.accessId(), null);
        });
    }
}