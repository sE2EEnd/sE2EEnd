package fr.se2eend.backend.service;

import fr.se2eend.backend.dto.DeletedSendDto;
import fr.se2eend.backend.dto.PagedResponse;
import fr.se2eend.backend.dto.SendResponseDto;
import fr.se2eend.backend.exception.ResourceNotFoundException;
import fr.se2eend.backend.model.DeletedSend;
import fr.se2eend.backend.model.FileMetadata;
import fr.se2eend.backend.model.Send;
import fr.se2eend.backend.model.enums.DeleteReason;
import fr.se2eend.backend.repository.DeletedSendRepository;
import fr.se2eend.backend.repository.FileRepository;
import fr.se2eend.backend.repository.SendRepository;
import fr.se2eend.backend.service.mapper.SendMapper;
import fr.se2eend.backend.storage.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.se2eend.backend.repository.SendSpecifications;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

    private final SendRepository sendRepository;
    private final FileRepository fileRepository;
    private final DeletedSendRepository deletedSendRepository;
    private final SendMapper sendMapper;
    private final StorageService storageService;

    /**
     * Get paginated sends with optional filters
     */
    public PagedResponse<SendResponseDto> getAllSends(int page, int size, String ownerSearch, String status) {
        Specification<Send> spec = Specification.unrestricted();

        if (ownerSearch != null && !ownerSearch.isBlank()) {
            spec = spec.and(SendSpecifications.ownerContains(ownerSearch));
        }
        if (status != null && !status.equals("all")) {
            spec = spec.and(SendSpecifications.withStatus(status, LocalDateTime.now()));
        }

        Page<Send> pageResult = sendRepository.findAll(
                spec,
                PageRequest.of(page, size, Sort.by("createdAt").descending())
        );

        return new PagedResponse<>(
                pageResult.getContent().stream().map(sendMapper::toDto).toList(),
                pageResult.getTotalElements(),
                pageResult.getTotalPages(),
                pageResult.getNumber(),
                pageResult.getSize()
        );
    }

    /**
     * Get application statistics
     */
    public Map<String, Object> getStats() {
        Map<String, Object> stats = new HashMap<>();

        long totalSends = sendRepository.count();
        long activeSends = sendRepository.findAll().stream()
                .filter(send -> !send.isRevoked() && send.getDownloadCount() < send.getMaxDownloads())
                .count();
        long totalFiles = fileRepository.count();

        stats.put("totalSends", totalSends);
        stats.put("activeSends", activeSends);
        stats.put("revokedSends", sendRepository.findAll().stream().filter(Send::isRevoked).count());
        stats.put("totalFiles", totalFiles);

        return stats;
    }

    /**
     * Get deleted sends audit log
     */
    public List<DeletedSendDto> getDeletedSends() {
        return deletedSendRepository.findAllByOrderByDeletedAtDesc()
                .stream()
                .map(d -> new DeletedSendDto(
                        d.getId(),
                        d.getOriginalSendId(),
                        d.getAccessId(),
                        d.getOwnerId(),
                        d.getOwnerName(),
                        d.getOwnerEmail(),
                        d.getSendCreatedAt(),
                        d.getDeletedAt(),
                        d.getDeleteReason(),
                        d.getTotalSizeBytes()
                ))
                .toList();
    }

    /**
     * Delete a send
     */
    @Transactional
    public void deleteSend(UUID id) {
        Send send = sendRepository.findById(id)
                .orElseThrow(ResourceNotFoundException::sendNotFound);

        // Delete associated files first
        fileRepository.deleteAll(send.getFiles());

        // Delete the send
        sendRepository.delete(send);
    }

    /**
     * Revoke a send
     */
    @Transactional
    public void revokeSend(UUID id) {
        Send send = sendRepository.findById(id)
                .orElseThrow(ResourceNotFoundException::sendNotFound);

        send.setRevoked(true);
        sendRepository.save(send);
    }

    @Transactional
    public Map<String, Object> runCleanup() {
        log.info("Starting cleanup of expired/revoked/exhausted sends");

        List<Send> allSends = sendRepository.findAll();
        LocalDateTime now = LocalDateTime.now();

        int deletedSends = 0;
        int deletedFiles = 0;
        long freedSpace = 0L;

        for (Send send : allSends) {
            DeleteReason reason = null;

            if (send.getExpiresAt() != null && send.getExpiresAt().isBefore(now)) {
                reason = DeleteReason.EXPIRED;
            } else if (send.isRevoked()) {
                reason = DeleteReason.REVOKED;
            } else if (send.getDownloadCount() >= send.getMaxDownloads()) {
                reason = DeleteReason.EXHAUSTED;
            }

            if (reason != null) {
                log.info("Deleting send {} (reason: {})", send.getAccessId(), reason);
                long[] stats = auditAndDelete(send, reason);
                deletedFiles += (int) stats[0];
                freedSpace += stats[1];
                deletedSends++;
            }
        }

        log.info("Cleanup completed: deleted {} sends, {} files, freed {} bytes",
                deletedSends, deletedFiles, freedSpace);

        Map<String, Object> result = new HashMap<>();
        result.put("deletedSends", deletedSends);
        result.put("deletedFiles", deletedFiles);
        result.put("freedSpace", freedSpace);
        result.put("timestamp", LocalDateTime.now());

        return result;
    }

    /**
     * Save an audit record then hard-delete the send and its files from storage.
     * Returns [deletedFileCount, freedBytes].
     */
    private long[] auditAndDelete(Send send, DeleteReason reason) {
        int deletedFiles = 0;
        long freedSpace = 0L;

        for (FileMetadata file : send.getFiles()) {
            try {
                storageService.delete(file.getStoragePath());
                deletedFiles++;
                freedSpace += file.getSizeBytes();
            } catch (Exception e) {
                log.error("Failed to delete file {} from storage: {}", file.getStoragePath(), e.getMessage());
            }
        }

        DeletedSend audit = DeletedSend.builder()
                .originalSendId(send.getId())
                .accessId(send.getAccessId())
                .ownerId(send.getOwnerId())
                .ownerName(send.getOwnerName())
                .ownerEmail(send.getOwnerEmail())
                .sendCreatedAt(send.getCreatedAt())
                .deletedAt(LocalDateTime.now())
                .deleteReason(reason)
                .fileCount(send.getFiles().size())
                .totalSizeBytes(freedSpace)
                .build();

        deletedSendRepository.save(audit);
        sendRepository.delete(send);

        return new long[]{deletedFiles, freedSpace};
    }
}
