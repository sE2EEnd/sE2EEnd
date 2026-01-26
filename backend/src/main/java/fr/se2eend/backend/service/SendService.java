package fr.se2eend.backend.service;

import fr.se2eend.backend.dto.SendRequestDto;
import fr.se2eend.backend.dto.SendResponseDto;
import fr.se2eend.backend.exception.ResourceNotFoundException;
import fr.se2eend.backend.model.Send;
import fr.se2eend.backend.repository.SendRepository;
import fr.se2eend.backend.service.mapper.SendMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.nio.ByteBuffer;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SendService {

    private final SendRepository sendRepository;
    private final SendMapper sendMapper;
    private final PasswordEncoder passwordEncoder;

    public List<SendResponseDto> findAll() {
        UUID ownerId = extractUserIdFromToken();
        if (ownerId == null) {
            return List.of();
        }
        return sendRepository.findByOwnerId(ownerId)
                .stream()
                .map(sendMapper::toDto)
                .toList();
    }

    public SendResponseDto findById(UUID id) {
        return sendRepository.findById(id)
                .map(sendMapper::toDto)
                .orElseThrow(ResourceNotFoundException::sendNotFound);
    }

    public SendResponseDto findByAccessId(String accessId) {
        return sendRepository.findByAccessId(accessId)
                .map(sendMapper::toDto)
                .orElseThrow(ResourceNotFoundException::sendNotFound);
    }

    public SendResponseDto createSend(SendRequestDto dto) {
        Send entity = sendMapper.toEntity(dto);

        entity.setCreatedAt(LocalDateTime.now());
        entity.setDownloadCount(0);
        entity.setRevoked(false);
        entity.setFiles(List.of());

        entity.setAccessId(generateAccessId());

        UUID ownerId = extractUserIdFromToken();
        entity.setOwnerId(ownerId);
        entity.setOwnerName(extractOwnerNameFromToken());
        entity.setOwnerEmail(extractOwnerEmailFromToken());

        if (Boolean.TRUE.equals(dto.passwordProtected()) && dto.password() != null && !dto.password().isBlank()) {
            entity.setPasswordHash(passwordEncoder.encode(dto.password()));
            entity.setPasswordProtected(true);
        } else {
            entity.setPasswordProtected(false);
            entity.setPasswordHash(null);
        }

        return sendMapper.toDto(sendRepository.save(entity));
    }

    private UUID extractUserIdFromToken() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication != null && authentication.getPrincipal() instanceof Jwt) {
            Jwt jwt = (Jwt) authentication.getPrincipal();
            String subject = jwt.getSubject();

            try {
                return UUID.fromString(subject);
            } catch (IllegalArgumentException e) {
                return null;
            }
        }

        return null;
    }

    private String extractOwnerNameFromToken() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication != null && authentication.getPrincipal() instanceof Jwt) {
            Jwt jwt = (Jwt) authentication.getPrincipal();
            String name = jwt.getClaimAsString("name");
            if (name != null && !name.isBlank()) {
                return name;
            }
            String username = jwt.getClaimAsString("preferred_username");
            return username != null ? username : null;
        }

        return null;
    }

    private String extractOwnerEmailFromToken() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication != null && authentication.getPrincipal() instanceof Jwt) {
            Jwt jwt = (Jwt) authentication.getPrincipal();
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
     * Delete a send by ID (cascade will remove linked files automatically).
     */
    public void delete(UUID id) {
        if (!sendRepository.existsById(id)) {
            throw ResourceNotFoundException.sendNotFound();
        }
        sendRepository.deleteById(id);
    }
}
