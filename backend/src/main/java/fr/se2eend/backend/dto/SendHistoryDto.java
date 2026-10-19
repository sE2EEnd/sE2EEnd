package fr.se2eend.backend.dto;

import fr.se2eend.backend.model.enums.DeleteReason;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Non-sensitive record of a send whose payload is gone. Never carries keys, password hashes or access IDs.
 */
public record SendHistoryDto(
        UUID id,
        String name,
        DeleteReason status,
        LocalDateTime createdAt,
        LocalDateTime endedAt,
        LocalDateTime expiresAt,
        Integer maxDownloads,
        Integer downloadCount,
        long totalSizeBytes
) {}
