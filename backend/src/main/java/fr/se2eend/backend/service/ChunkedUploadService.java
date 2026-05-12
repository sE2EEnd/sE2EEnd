package fr.se2eend.backend.service;

import fr.se2eend.backend.exception.ResourceNotFoundException;
import fr.se2eend.backend.exception.UploadSizeLimitExceededException;
import fr.se2eend.backend.exception.enums.ErrorCode;
import fr.se2eend.backend.model.*;
import fr.se2eend.backend.repository.*;
import fr.se2eend.backend.storage.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.io.SequenceInputStream;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChunkedUploadService {

    private final UploadSessionRepository sessionRepository;
    private final UploadChunkRepository chunkRepository;
    private final FileRepository fileRepository;
    private final SendRepository sendRepository;
    private final StorageService storageService;
    private final InstanceSettingsService instanceSettingsService;

    @Transactional
    public UploadSession initUpload(UUID sendId, String filename) {
        Send send = sendRepository.findById(sendId)
                .orElseThrow(ResourceNotFoundException::sendNotFound);

        UploadSession session = UploadSession.builder()
                .send(send)
                .filename(filename)
                .createdAt(LocalDateTime.now())
                .build();

        return sessionRepository.save(session);
    }

    @Transactional
    public void saveChunk(UUID sessionId, int chunkIndex, InputStream data, long sizeBytes) throws IOException {
        UploadSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.UPLOAD_SESSION_NOT_FOUND, "Upload session not found"));

        String storagePath = "chunks/" + sessionId + "/" + chunkIndex;
        storageService.save(data, sizeBytes, storagePath);

        UploadChunk chunk = UploadChunk.builder()
                .session(session)
                .chunkIndex(chunkIndex)
                .storagePath(storagePath)
                .sizeBytes(sizeBytes)
                .build();

        chunkRepository.save(chunk);
    }

    @Transactional
    public FileMetadata completeUpload(UUID sessionId, int totalChunks, int chunkSize) throws IOException {
        UploadSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.UPLOAD_SESSION_NOT_FOUND, "Upload session not found"));

        List<UploadChunk> chunks = chunkRepository.findAllBySessionOrderByChunkIndex(session);

        if (chunks.size() != totalChunks) {
            throw new ResourceNotFoundException(ErrorCode.UPLOAD_INCOMPLETE,
                    "Expected " + totalChunks + " chunks but got " + chunks.size());
        }

        long totalSize = chunks.stream().mapToLong(UploadChunk::getSizeBytes).sum();

        long maxUploadBytes = instanceSettingsService.getLong("max_upload_size_bytes", 2L * 1024 * 1024 * 1024);
        if (maxUploadBytes > 0) {
            // Each chunk carries 12-byte IV + 16-byte GCM auth tag overhead; subtract to get plaintext size
            long plaintextSize = totalSize - (long) totalChunks * 28;
            if (plaintextSize > maxUploadBytes) {
                throw new UploadSizeLimitExceededException(maxUploadBytes);
            }
        }

        String finalPath = UUID.randomUUID().toString();

        List<InputStream> streams = new ArrayList<>();
        for (UploadChunk chunk : chunks) {
            streams.add(storageService.read(chunk.getStoragePath()));
        }

        Enumeration<InputStream> enumeration = Collections.enumeration(streams);
        try (InputStream combined = new SequenceInputStream(enumeration)) {
            storageService.save(combined, totalSize, finalPath);
        }

        for (UploadChunk chunk : chunks) {
            storageService.delete(chunk.getStoragePath());
        }

        FileMetadata meta = FileMetadata.builder()
                .send(session.getSend())
                .filename(session.getFilename())
                .storagePath(finalPath)
                .sizeBytes(totalSize)
                .chunkSize(chunkSize)
                .build();

        chunkRepository.deleteAll(chunks);
        sessionRepository.delete(session);

        return fileRepository.save(meta);
    }

    @Transactional
    public void cleanupStaleSessions(LocalDateTime cutoff) {
        List<UploadSession> stale = sessionRepository.findAllByCreatedAtBefore(cutoff);
        for (UploadSession session : stale) {
            List<UploadChunk> chunks = chunkRepository.findAllBySessionOrderByChunkIndex(session);
            for (UploadChunk chunk : chunks) {
                try {
                    storageService.delete(chunk.getStoragePath());
                } catch (IOException e) {
                    log.warn("Failed to delete stale chunk {}: {}", chunk.getStoragePath(), e.getMessage());
                }
            }
            chunkRepository.deleteAll(chunks);
            sessionRepository.delete(session);
        }
        if (!stale.isEmpty()) {
            log.info("Cleaned up {} stale upload sessions", stale.size());
        }
    }
}