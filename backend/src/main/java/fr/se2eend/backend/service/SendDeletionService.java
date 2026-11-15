package fr.se2eend.backend.service;

import fr.se2eend.backend.model.DeletedSend;
import fr.se2eend.backend.model.FileMetadata;
import fr.se2eend.backend.model.Send;
import fr.se2eend.backend.model.UploadChunk;
import fr.se2eend.backend.model.UploadSession;
import fr.se2eend.backend.model.enums.DeleteReason;
import fr.se2eend.backend.repository.DeletedSendRepository;
import fr.se2eend.backend.repository.SendRepository;
import fr.se2eend.backend.repository.UploadChunkRepository;
import fr.se2eend.backend.repository.UploadSessionRepository;
import fr.se2eend.backend.storage.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Single deletion path for sends: removes stored blobs, writes the audit / history record, then deletes the send.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SendDeletionService {

    private final SendRepository sendRepository;
    private final DeletedSendRepository deletedSendRepository;
    private final UploadSessionRepository uploadSessionRepository;
    private final UploadChunkRepository uploadChunkRepository;
    private final StorageService storageService;

    /**
     * Save an audit record then hard-delete the send, its file and any unfinished chunked upload from storage.
     * Returns [deletedFileCount, freedBytes].
     */
    @Transactional
    public long[] auditAndDelete(Send send, DeleteReason reason) {
        int deletedFiles = 0;
        long freedSpace = 0L;

        FileMetadata file = send.getFile();
        if (file != null) {
            try {
                storageService.delete(file.getStoragePath());
                deletedFiles++;
                freedSpace += file.getSizeBytes();
            } catch (Exception e) {
                log.error("Failed to delete file {} from storage: {}", file.getStoragePath(), e.getMessage());
            }
        }

        // A chunked upload still in progress has its chunks stored outside of the send's file.
        for (UploadSession session : uploadSessionRepository.findAllBySend(send)) {
            for (UploadChunk chunk : uploadChunkRepository.findAllBySessionOrderByChunkIndex(session)) {
                try {
                    storageService.delete(chunk.getStoragePath());
                } catch (Exception e) {
                    log.warn("Failed to delete chunk {}: {}", chunk.getStoragePath(), e.getMessage());
                }
                uploadChunkRepository.delete(chunk);
            }
            uploadSessionRepository.delete(session);
        }

        DeletedSend audit = DeletedSend.builder()
                .originalSendId(send.getId())
                .accessId(send.getAccessId())
                .ownerId(send.getOwnerId())
                .ownerName(send.getOwnerName())
                .ownerEmail(send.getOwnerEmail())
                .name(send.getName())
                .expiresAt(send.getExpiresAt())
                .maxDownloads(send.getMaxDownloads())
                .downloadCount(send.getDownloadCount())
                .sendCreatedAt(send.getCreatedAt())
                .deletedAt(LocalDateTime.now())
                .deleteReason(reason)
                .totalSizeBytes(freedSpace)
                .build();

        deletedSendRepository.save(audit);
        sendRepository.delete(send);

        return new long[]{deletedFiles, freedSpace};
    }
}
