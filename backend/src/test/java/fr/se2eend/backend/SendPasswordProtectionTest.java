package fr.se2eend.backend;

import fr.se2eend.backend.dto.SendRequestDto;
import fr.se2eend.backend.dto.SendResponseDto;
import fr.se2eend.backend.exception.SendPasswordInvalidException;
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

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration test for password protection enforcement.
 * Tests scenarios where a Send requires a password to be downloaded.
 */
@SpringBootTest
class SendPasswordProtectionTest {

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
    void testPasswordProtectedSend_correctPassword() throws IOException {
        // Given: A password-protected Send
        String password = "my-secure-password-123";
        SendRequestDto request = new SendRequestDto(null, 
                SendType.FILE,
                "encrypted-metadata",
                null,
                5,
                true,
                password
        );
        SendResponseDto response = sendService.createSend(request);

        // Verify password was hashed and stored
        Send send = sendRepository.findById(response.id()).orElseThrow();
        assertTrue(send.isPasswordProtected());
        assertNotNull(send.getPasswordHash());
        assertNotEquals(password, send.getPasswordHash()); // Should be hashed, not plain

        // Add a file
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

        // When: Download with correct password
        var stream = sendDownloadService.downloadByAccessId(response.accessId(), password);

        // Then: Should succeed
        assertNotNull(stream);
        assertEquals("test-file.enc", stream.filename());
    }

    @Test
    void testPasswordProtectedSend_wrongPassword() throws IOException {
        // Given: A password-protected Send
        String correctPassword = "correct-password";
        SendRequestDto request = new SendRequestDto(null, 
                SendType.FILE,
                "encrypted-metadata",
                null,
                5,
                true,
                correctPassword
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

        // When/Then: Download with wrong password should fail
        assertThrows(SendPasswordInvalidException.class, () -> {
            sendDownloadService.downloadByAccessId(response.accessId(), "wrong-password");
        });
    }

    @Test
    void testPasswordProtectedSend_noPasswordProvided() throws IOException {
        // Given: A password-protected Send
        SendRequestDto request = new SendRequestDto(null, 
                SendType.FILE,
                "encrypted-metadata",
                null,
                5,
                true,
                "my-password"
        );
        SendResponseDto response = sendService.createSend(request);

        // Add a file
        Send send = sendRepository.findById(response.id()).orElseThrow();
        String storagePath = storageService.save(
                new ByteArrayInputStream("data".getBytes()),
                "data".length(),
                "file.enc"
        );
        FileMetadata file = FileMetadata.builder()
                .send(send)
                .filename("file.enc")
                .storagePath(storagePath)
                .sizeBytes("data".length())
                .build();
        fileRepository.save(file);

        // When/Then: Download without password should fail
        assertThrows(SendPasswordInvalidException.class, () -> {
            sendDownloadService.downloadByAccessId(response.accessId(), null);
        });

        // When/Then: Download with blank password should fail
        assertThrows(SendPasswordInvalidException.class, () -> {
            sendDownloadService.downloadByAccessId(response.accessId(), "");
        });

        assertThrows(SendPasswordInvalidException.class, () -> {
            sendDownloadService.downloadByAccessId(response.accessId(), "   ");
        });
    }

    @Test
    void testNonPasswordProtectedSend_noPasswordRequired() throws IOException {
        // Given: A Send WITHOUT password protection
        SendRequestDto request = new SendRequestDto(null, 
                SendType.FILE,
                "encrypted-metadata",
                null,
                5,
                false,
                null
        );
        SendResponseDto response = sendService.createSend(request);

        // Verify no password hash
        Send send = sendRepository.findById(response.id()).orElseThrow();
        assertFalse(send.isPasswordProtected());
        assertNull(send.getPasswordHash());

        // Add a file
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

        // When: Download without password
        var stream = sendDownloadService.downloadByAccessId(response.accessId(), null);

        // Then: Should succeed
        assertNotNull(stream);
        assertEquals("file.enc", stream.filename());
    }

    @Test
    void testPasswordProtectedSend_passwordNotSetButFlagTrue() {
        // Given: passwordProtected=true but no password provided
        SendRequestDto request = new SendRequestDto(null, 
                SendType.FILE,
                "encrypted-metadata",
                null,
                5,
                true,
                null
        );

        // When: Create the Send
        SendResponseDto response = sendService.createSend(request);

        // Then: Should not be password protected if no password was provided
        Send send = sendRepository.findById(response.id()).orElseThrow();
        assertFalse(send.isPasswordProtected());
        assertNull(send.getPasswordHash());
    }
}