package fr.se2eend.backend.service;

import fr.se2eend.backend.config.SecurityUtils;
import fr.se2eend.backend.dto.PagedResponse;
import fr.se2eend.backend.dto.SendHistoryDto;
import fr.se2eend.backend.dto.SendRequestDto;
import fr.se2eend.backend.dto.SendPublicResponseDto;
import fr.se2eend.backend.dto.SendResponseDto;
import fr.se2eend.backend.exception.ResourceNotFoundException;
import fr.se2eend.backend.model.DeletedSend;
import fr.se2eend.backend.model.FileMetadata;
import fr.se2eend.backend.model.Send;
import fr.se2eend.backend.model.enums.DeleteReason;
import fr.se2eend.backend.repository.DeletedSendRepository;
import fr.se2eend.backend.repository.SendRepository;
import fr.se2eend.backend.service.mapper.SendMapper;
import fr.se2eend.backend.storage.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.nio.charset.StandardCharsets;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.ByteBuffer;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SendService {

    private final SendRepository sendRepository;
    private final DeletedSendRepository deletedSendRepository;
    private final SendMapper sendMapper;
    private final PasswordEncoder passwordEncoder;
    private final StorageService storageService;
    private final InstanceSettingsService instanceSettingsService;

    public List<SendResponseDto> findAll() {
        UUID ownerId = extractUserIdFromToken();
        if (ownerId == null) {
            return List.of();
        }
        return sendRepository.findByOwnerIdOrderByCreatedAtDesc(ownerId)
                .stream()
                .map(sendMapper::toDto)
                .toList();
    }

    /**
     * Past sends of the current user (expired, revoked, exhausted, deleted), most recent first.
     * Only metadata survives the cleanup: no keys, no payload, no access ID.
     */
    @Transactional(readOnly = true)
    public PagedResponse<SendHistoryDto> findHistory(DeleteReason status, int page, int size) {
        UUID ownerId = extractUserIdFromToken();
        if (ownerId == null) {
            return new PagedResponse<>(List.of(), 0, 0, page, size);
        }
        PageRequest pageable = PageRequest.of(page, size, Sort.by("deletedAt").descending());
        Page<DeletedSend> result;
        if (status == null) {
            result = deletedSendRepository.findByOwnerId(ownerId, pageable);
        } else if (status == DeleteReason.USER || status == DeleteReason.MANUAL) {
            // Admin deletions and user deletions are both "deleted" from the owner's point of view.
            result = deletedSendRepository.findByOwnerIdAndDeleteReasonIn(
                    ownerId, List.of(DeleteReason.USER, DeleteReason.MANUAL), pageable);
        } else {
            result = deletedSendRepository.findByOwnerIdAndDeleteReasonIn(ownerId, List.of(status), pageable);
        }
        return new PagedResponse<>(
                result.getContent().stream().map(d -> new SendHistoryDto(
                        d.getId(),
                        d.getName(),
                        d.getDeleteReason() == DeleteReason.MANUAL ? DeleteReason.USER : d.getDeleteReason(),
                        d.getSendCreatedAt(),
                        d.getDeletedAt(),
                        d.getExpiresAt(),
                        d.getMaxDownloads(),
                        d.getDownloadCount(),
                        d.getTotalSizeBytes()
                )).toList(),
                result.getTotalElements(),
                result.getTotalPages(),
                result.getNumber(),
                result.getSize()
        );
    }

    public SendPublicResponseDto findByAccessId(String accessId) {
        return sendRepository.findByAccessId(accessId)
                .map(sendMapper::toPublicDto)
                .orElseThrow(ResourceNotFoundException::sendNotFound);
    }

    public SendResponseDto createSend(SendRequestDto dto) {
        boolean requireSendPassword = instanceSettingsService.getBoolean("require_send_password", false);
        boolean hasPassword = dto.password() != null && !dto.password().isBlank();
        boolean protectedRequested = Boolean.TRUE.equals(dto.passwordProtected());

        if (requireSendPassword && !(protectedRequested && hasPassword)) {
            throw new IllegalArgumentException("A password is required by this instance's policy");
        }
        if (protectedRequested != hasPassword) {
            throw new IllegalArgumentException("Password settings are inconsistent");
        }
        if (hasPassword && dto.password().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new IllegalArgumentException("Password must be at most 72 bytes");
        }

        Send entity = sendMapper.toEntity(dto);

        entity.setCreatedAt(LocalDateTime.now());
        entity.setDownloadCount(0);
        entity.setRevoked(false);

        entity.setAccessId(generateAccessId());

        UUID ownerId = extractUserIdFromToken();
        entity.setOwnerId(ownerId);
        entity.setOwnerName(extractOwnerNameFromToken());
        entity.setOwnerEmail(extractOwnerEmailFromToken());

        if (hasPassword) {
            entity.setPasswordHash(passwordEncoder.encode(dto.password()));
            entity.setPasswordProtected(true);
        } else {
            entity.setPasswordProtected(false);
            entity.setPasswordHash(null);
        }

        return sendMapper.toDto(sendRepository.save(entity));
    }

    private UUID extractUserIdFromToken() {
        return SecurityUtils.currentUserId();
    }

    private String extractOwnerNameFromToken() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            String name = jwt.getClaimAsString("name");
            if (name != null && !name.isBlank()) {
                return name;
            }
            return jwt.getClaimAsString("preferred_username");
        }

        return null;
    }

    private String extractOwnerEmailFromToken() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            return jwt.getClaimAsString("email");
        }

        return null;
    }

    /**
     * Generate a URL-safe base64 encoded access ID from a UUID.
     */
    private String generateAccessId() {
        UUID uuid = UUID.randomUUID();
        ByteBuffer bb = ByteBuffer.wrap(new byte[16]);
        bb.putLong(uuid.getMostSignificantBits());
        bb.putLong(uuid.getLeastSignificantBits());
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bb.array());
    }

    /**
     * Delete a send by ID — audits the deletion and removes files from storage.
     */
    @Transactional
    public void delete(UUID id) {
        Send send = sendRepository.findById(id)
                .orElseThrow(ResourceNotFoundException::sendNotFound);
        SecurityUtils.requireOwner(send.getOwnerId());

        long totalSize = 0L;
        FileMetadata file = send.getFile();
        if (file != null) {
            try {
                storageService.delete(file.getStoragePath());
                totalSize += file.getSizeBytes();
            } catch (Exception e) {
                log.error("Failed to delete file {} from storage: {}", file.getStoragePath(), e.getMessage());
            }
        }

        DeletedSend audit = DeletedSend.builder()
                .originalSendId(send.getId())
                .accessId(send.getAccessId())
                .ownerId(send.getOwnerId())
                .ownerName(send.getOwnerName())
                .ownerEmail(send.getOwnerEmail())
                .name(send.getName())
                .expiresAt(send.getExpiresAt())
                .maxDownloads(send.getMaxDownloads())
                .downloadCount(send.getDownloadCount())
                .sendCreatedAt(send.getCreatedAt())
                .deletedAt(LocalDateTime.now())
                .deleteReason(DeleteReason.USER)
                .totalSizeBytes(totalSize)
                .build();

        deletedSendRepository.save(audit);
        sendRepository.delete(send);
    }
}
