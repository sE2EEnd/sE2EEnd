package fr.se2eend.backend.service;

import fr.se2eend.backend.dto.SendResponseDto;
import fr.se2eend.backend.exception.ResourceNotFoundException;
import fr.se2eend.backend.model.FileMetadata;
import fr.se2eend.backend.model.Send;
import fr.se2eend.backend.repository.FileRepository;
import fr.se2eend.backend.repository.SendRepository;
import fr.se2eend.backend.service.mapper.SendMapper;
import fr.se2eend.backend.storage.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final SendMapper sendMapper;
    private final StorageService storageService;

    /**
     * Get all sends in the system
     */
    public List<SendResponseDto> getAllSends() {
        return sendRepository.findAll()
                .stream()
                .map(sendMapper::toDto)
                .toList();
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
            boolean shouldDelete = false;
            String reason = "";

            if (send.getExpiresAt() != null && send.getExpiresAt().isBefore(now)) {
                shouldDelete = true;
                reason = "expired";
            }
            else if (send.isRevoked()) {
                shouldDelete = true;
                reason = "revoked";
            }
            else if (send.getDownloadCount() >= send.getMaxDownloads()) {
                shouldDelete = true;
                reason = "exhausted";
            }

            if (shouldDelete) {
                log.info("Deleting send {} (reason: {})", send.getAccessId(), reason);

                for (FileMetadata file : send.getFiles()) {
                    try {
                        storageService.delete(file.getStoragePath());
                        deletedFiles++;
                        freedSpace += file.getSizeBytes();
                    } catch (Exception e) {
                        log.error("Failed to delete file {} from storage: {}", file.getStoragePath(), e.getMessage());
                    }
                }

                sendRepository.delete(send);
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
}
