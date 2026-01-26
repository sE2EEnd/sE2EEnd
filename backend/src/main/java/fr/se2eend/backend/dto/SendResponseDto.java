package fr.se2eend.backend.dto;

import fr.se2eend.backend.model.enums.SendType;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record SendResponseDto(
        UUID id,
        String accessId,
        String ownerId,
        String ownerName,
        String ownerEmail,
        String name,
        SendType type,
        String encryptedMetadata,
        LocalDateTime expiresAt,
        Integer maxDownloads,
        Integer downloadCount,
        Boolean passwordProtected,
        Boolean revoked,
        LocalDateTime createdAt,
        List<FileMetadataDto> files
) {}
