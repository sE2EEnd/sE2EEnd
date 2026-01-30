package fr.se2eend.backend;

import fr.se2eend.backend.dto.SendRequestDto;
import fr.se2eend.backend.dto.SendResponseDto;
import fr.se2eend.backend.exception.SendDownloadLimitExceededException;
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
import org.springframework.test.context.ActiveProfiles;

import java.io.ByteArrayInputStream;
import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration test for download limit enforcement.
 * Tests the scenario where a Send has a maxDownloads limit that should be enforced.
 */
@SpringBootTest
@ActiveProfiles("test")
class SendDownloadLimitTest {

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
        // Clean up before each test
        fileRepository.deleteAll();
        sendRepository.deleteAll();
    }

    @AfterEach
    void tearDown() {
        // Clean up after each test
        fileRepository.deleteAll();
        sendRepository.deleteAll();
    }

    @Test
    void testDownloadLimitEnforcement_singleDownload() throws IOException {
        // Given: A Send with maxDownloads = 1
        SendRequestDto request = new SendRequestDto(null, 
                SendType.FILE,
                "encrypted-metadata",
                null,
                1,
                false,
                null
        );
        SendResponseDto response = sendService.createSend(request);

        // Add a file to the Send
        Send send = sendRepository.findById(response.id()).orElseThrow();
        String storagePath = storageService.save(
                new ByteArrayInputStream("encrypted-content".getBytes()),
                "encrypted-content".length(),
                "test-file.enc"
        );
        FileMetadata file = FileMetadata.builder()
                .send(send)
                .filename("test-file.enc")
                .storagePath(storagePath)
                .sizeBytes("encrypted-content".length())
                .build();
        fileRepository.save(file);

        // When: Download the file once (should succeed)
        var stream1 = sendDownloadService.downloadByAccessId(response.accessId(), null);
        assertNotNull(stream1);
        assertEquals("test-file.enc", stream1.filename());

        // Verify downloadCount was incremented
        Send updatedSend = sendRepository.findById(response.id()).orElseThrow();
        assertEquals(1, updatedSend.getDownloadCount());

        // Then: Second download should fail with SendDownloadLimitExceededException
        assertThrows(SendDownloadLimitExceededException.class, () -> {
            sendDownloadService.downloadByAccessId(response.accessId(), null);
        });
    }

    @Test
    void testDownloadLimitEnforcement_multipleDownloads() throws IOException {
        // Given: A Send with maxDownloads = 3
        SendRequestDto request = new SendRequestDto(null, 
                SendType.FILE,
                "encrypted-metadata",
                null,
                3,
                false,
                null
        );
        SendResponseDto response = sendService.createSend(request);

        // Add a file
        Send send = sendRepository.findById(response.id()).orElseThrow();
        String storagePath = storageService.save(
                new ByteArrayInputStream("encrypted-content".getBytes()),
                "encrypted-content".length(),
                "test-file.enc"
        );
        FileMetadata file = FileMetadata.builder()
                .send(send)
                .filename("test-file.enc")
                .storagePath(storagePath)
                .sizeBytes("encrypted-content".length())
                .build();
        fileRepository.save(file);

        // When: Download 3 times (should all succeed)
        for (int i = 0; i < 3; i++) {
            var stream = sendDownloadService.downloadByAccessId(response.accessId(), null);
            assertNotNull(stream);
        }

        // Verify downloadCount
        Send updatedSend = sendRepository.findById(response.id()).orElseThrow();
        assertEquals(3, updatedSend.getDownloadCount());

        // Then: Fourth download should fail
        assertThrows(SendDownloadLimitExceededException.class, () -> {
            sendDownloadService.downloadByAccessId(response.accessId(), null);
        });
    }

    @Test
    void testDownloadCountIncrementsCorrectly() throws IOException {
        // Given: A Send with maxDownloads = 5
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
                new ByteArrayInputStream("test-data".getBytes()),
                "test-data".length(),
                "file.enc"
        );
        FileMetadata file = FileMetadata.builder()
                .send(send)
                .filename("file.enc")
                .storagePath(storagePath)
                .sizeBytes("test-data".length())
                .build();
        fileRepository.save(file);

        // When: Download multiple times
        for (int i = 1; i <= 5; i++) {
            sendDownloadService.downloadByAccessId(response.accessId(), null);
            Send updated = sendRepository.findById(response.id()).orElseThrow();
            assertEquals(i, updated.getDownloadCount(), "Download count should be " + i);
        }
    }
}