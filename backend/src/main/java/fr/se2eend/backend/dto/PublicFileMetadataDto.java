package fr.se2eend.backend.dto;

public record PublicFileMetadataDto(
        String filename,
        long sizeBytes,
        Integer chunkSize
) {}
