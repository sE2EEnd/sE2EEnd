package fr.se2eend.backend.service;

import fr.se2eend.backend.config.SecurityUtils;
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

    /** Default upload size limit (plaintext) when the instance setting is unset. */
    private static final long DEFAULT_MAX_UPLOAD_BYTES = 2L * 1024 * 1024 * 1024; // 2 GiB
    /** Per-chunk ciphertext overhead: 12-byte IV + 16-byte GCM auth tag. */
    private static final int CHUNK_OVERHEAD_BYTES = 28;

    @Transactional
    public UploadSession initUpload(UUID sendId, String filename) {
        Send send = sendRepository.findById(sendId)
                .orElseThrow(ResourceNotFoundException::sendNotFound);

        // Only the Send's owner may attach a file (treats "not yours" as "not found").
        SecurityUtils.requireOwner(send.getOwnerId());

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

        // Enforce the upload size budget incrementally, BEFORE writing to disk, so a client can't
        // exhaust storage by streaming unlimited chunks (the limit used to be checked only at
        // completion, after everything was already written). Caps cumulative stored (ciphertext)
        // bytes per session — marginally stricter than the plaintext setting by the GCM overhead.
        long maxUploadBytes = instanceSettingsService.getLong("max_upload_size_bytes", DEFAULT_MAX_UPLOAD_BYTES);
        if (maxUploadBytes > 0) {
            // Reject chunks without a declared length: they can't be budgeted, and the servlet
            // container only bounds the request body to a declared Content-Length.
            if (sizeBytes <= 0) {
                throw new UploadSizeLimitExceededException(maxUploadBytes);
            }
            long alreadyStored = chunkRepository.sumSizeBytesBySession(session);
            if (alreadyStored + sizeBytes > maxUploadBytes) {
                throw new UploadSizeLimitExceededException(maxUploadBytes);
            }
        }

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

        // Defense in depth: re-check ownership before assembling the final file.
        SecurityUtils.requireOwner(session.getSend().getOwnerId());

        List<UploadChunk> chunks = chunkRepository.findAllBySessionOrderByChunkIndex(session);

        if (chunks.size() != totalChunks) {
            throw new ResourceNotFoundException(ErrorCode.UPLOAD_INCOMPLETE,
                    "Expected " + totalChunks + " chunks but got " + chunks.size());
        }

        long totalSize = chunks.stream().mapToLong(UploadChunk::getSizeBytes).sum();

        long maxUploadBytes = instanceSettingsService.getLong("max_upload_size_bytes", DEFAULT_MAX_UPLOAD_BYTES);
        if (maxUploadBytes > 0) {
            // Subtract the per-chunk GCM overhead to get the plaintext size; clamp at 0 so a
            // pathological many-tiny-chunks upload can't drive this negative to bypass the check.
            long plaintextSize = Math.max(0, totalSize - (long) totalChunks * CHUNK_OVERHEAD_BYTES);
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