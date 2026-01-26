package fr.se2eend.backend.dto;

import java.util.UUID;

public record FileMetadataDto(
        UUID id,
        String filename,
        long sizeBytes
) {}

