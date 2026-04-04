package fr.se2eend.backend.dto;

import fr.se2eend.backend.model.enums.DeleteReason;

import java.time.LocalDateTime;
import java.util.UUID;

public record DeletedSendDto(
        UUID id,
        UUID originalSendId,
        String accessId,
        UUID ownerId,
        String ownerName,
        String ownerEmail,
        LocalDateTime sendCreatedAt,
        LocalDateTime deletedAt,
        DeleteReason deleteReason,
        long totalSizeBytes
) {}
