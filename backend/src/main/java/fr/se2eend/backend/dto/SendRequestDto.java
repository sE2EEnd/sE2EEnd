package fr.se2eend.backend.dto;

import fr.se2eend.backend.model.enums.SendType;
import jakarta.validation.constraints.*;

import java.time.LocalDateTime;

public record SendRequestDto(
        String name,

        @NotNull
        SendType type,

        String encryptedMetadata,

        LocalDateTime expiresAt,

        @Min(1)
        @Max(50)
        Integer maxDownloads,

        Boolean passwordProtected,

        String password
) {}
