package fr.se2eend.backend;

import fr.se2eend.backend.dto.SendRequestDto;
import fr.se2eend.backend.dto.SendResponseDto;
import fr.se2eend.backend.exception.SendDownloadLimitExceededException;
import fr.se2eend.backend.exception.SendPasswordInvalidException;
import fr.se2eend.backend.exception.SendRateLimitedException;
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
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class DownloadConcurrencyAndThrottleTest {

    @Autowired private SendService sendService;
    @Autowired private SendDownloadService downloadService;
    @Autowired private SendRepository sendRepository;
    @Autowired private FileRepository fileRepository;
    @Autowired private StorageService storageService;

    @BeforeEach
    @AfterEach
    void clean() {
        fileRepository.deleteAll();
        sendRepository.deleteAll();
    }

    private SendResponseDto newSend(int max, String password) throws Exception {
        SendResponseDto r = sendService.createSend(new SendRequestDto(null, SendType.FILE, null, max, password != null, password));
        Send send = sendRepository.findById(r.id()).orElseThrow();
        String path = storageService.save(new ByteArrayInputStream("x".getBytes()), 1, "f.enc");
        fileRepository.save(FileMetadata.builder().send(send).filename("f.enc").storagePath(path).sizeBytes(1).build());
        return r;
    }

    @Test
    void parallelDownloads_neverExceedLimit() throws Exception {
        SendResponseDto r = newSend(1, null);
        int threads = 12;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger ok = new AtomicInteger();
        AtomicInteger limited = new AtomicInteger();
        for (int i = 0; i < threads; i++) {
            pool.submit(() -> {
                start.await();
                try {
                    downloadService.downloadByAccessId(r.accessId(), null);
                    ok.incrementAndGet();
                } catch (SendDownloadLimitExceededException e) {
                    limited.incrementAndGet();
                }
                return null;
            });
        }
        start.countDown();
        pool.shutdown();
        assertTrue(pool.awaitTermination(30, TimeUnit.SECONDS));
        assertEquals(1, ok.get());
        assertEquals(threads - 1, limited.get());
        assertEquals(1, sendRepository.findById(r.id()).orElseThrow().getDownloadCount());
    }

    @Test
    void repeatedWrongPasswords_areThrottled_andCorrectOneIsAlsoBlocked() throws Exception {
        SendResponseDto r = newSend(5, "Correct-pass-1");
        for (int i = 0; i < 10; i++) {
            assertThrows(SendPasswordInvalidException.class,
                    () -> downloadService.downloadByAccessId(r.accessId(), "wrong", "10.0.0.1"));
        }
        SendRateLimitedException ex = assertThrows(SendRateLimitedException.class,
                () -> downloadService.downloadByAccessId(r.accessId(), "Correct-pass-1", "10.0.0.2"));
        assertTrue(ex.retryAfterSeconds() > 0);
    }

    @Test
    void oversizedPassword_isRejectedAsInvalid() throws Exception {
        SendResponseDto r = newSend(5, "Correct-pass-1");
        assertThrows(SendPasswordInvalidException.class,
                () -> downloadService.downloadByAccessId(r.accessId(), "a".repeat(5000)));
    }
}
