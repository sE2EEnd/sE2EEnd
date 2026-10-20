package fr.se2eend.backend.dto;

import fr.se2eend.backend.model.enums.SendType;

import java.time.LocalDateTime;

public record SendPublicResponseDto(
        String accessId,
        String name,
        SendType type,
        LocalDateTime expiresAt,
        Integer maxDownloads,
        Integer downloadCount,
        Boolean passwordProtected,
        LocalDateTime createdAt,
        PublicFileMetadataDto file
) {}
