package fr.se2eend.backend.service.mapper;

import fr.se2eend.backend.dto.FileMetadataDto;
import fr.se2eend.backend.dto.SendRequestDto;
import fr.se2eend.backend.dto.SendResponseDto;
import fr.se2eend.backend.model.FileMetadata;
import fr.se2eend.backend.model.Send;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class SendMapper {

    /**
     * Convert a SendRequestDto to a Send entity.
     * Used when creating a new Send from client request.
     */
    public Send toEntity(SendRequestDto dto) {
        if (dto == null) return null;

        return Send.builder()
                .name(dto.name())
                .type(dto.type())
                .encryptedMetadata(dto.encryptedMetadata())
                .expiresAt(dto.expiresAt())
                .maxDownloads(dto.maxDownloads() != null ? dto.maxDownloads() : 1)
                .passwordProtected(Boolean.TRUE.equals(dto.passwordProtected()))
                .build();
    }

    /**
     * Convert a Send entity to SendResponseDto.
     * Includes mapped list of attached FileMetadata (if any).
     */
    public SendResponseDto toDto(Send entity) {
        if (entity == null) return null;

        List<FileMetadataDto> fileDtos = entity.getFiles() == null
                ? Collections.emptyList()
                : entity.getFiles().stream()
                .map(this::toFileDto)
                .collect(Collectors.toList());

        return new SendResponseDto(
                entity.getId(),
                entity.getAccessId(),
                entity.getOwnerId() != null ? entity.getOwnerId().toString() : null,
                entity.getOwnerName(),
                entity.getOwnerEmail(),
                entity.getName(),
                entity.getType(),
                entity.getEncryptedMetadata(),
                entity.getExpiresAt(),
                entity.getMaxDownloads(),
                entity.getDownloadCount(),
                entity.isPasswordProtected(),
                entity.isRevoked(),
                entity.getCreatedAt(),
                fileDtos
        );
    }

    /**
     * Convert a FileMetadata entity to its lightweight DTO.
     */
    private FileMetadataDto toFileDto(FileMetadata file) {
        return new FileMetadataDto(
                file.getId(),
                file.getFilename(),
                file.getSizeBytes()
        );
    }
}