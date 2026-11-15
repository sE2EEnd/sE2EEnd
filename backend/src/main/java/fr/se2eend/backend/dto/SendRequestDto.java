package fr.se2eend.backend.dto;

import fr.se2eend.backend.model.enums.SendType;
import jakarta.validation.constraints.*;

import java.time.LocalDateTime;

public record SendRequestDto(
        String name,

        @NotNull
        SendType type,

        LocalDateTime expiresAt,

        @Min(1)
        @Max(50)
        Integer maxDownloads,

        Boolean passwordProtected,

        @Size(max = 72)
        String password,

        // base64url SHA-256 of the recipient destroy token (derived client-side). Absent = option off.
        @Pattern(regexp = "^[A-Za-z0-9_-]{43}$")
        String recipientDestroyTokenHash
) {
    public SendRequestDto(String name, SendType type, LocalDateTime expiresAt, Integer maxDownloads,
                          Boolean passwordProtected, String password) {
        this(name, type, expiresAt, maxDownloads, passwordProtected, password, null);
    }
}
