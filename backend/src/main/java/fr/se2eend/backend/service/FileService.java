package fr.se2eend.backend.service;

import fr.se2eend.backend.config.SecurityUtils;
import fr.se2eend.backend.exception.ResourceNotFoundException;
import fr.se2eend.backend.exception.UploadSizeLimitExceededException;
import fr.se2eend.backend.model.FileMetadata;
import fr.se2eend.backend.model.Send;
import fr.se2eend.backend.repository.FileRepository;
import fr.se2eend.backend.repository.SendRepository;
import fr.se2eend.backend.storage.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileService {
    private final FileRepository fileRepository;
    private final SendRepository sendRepository;
    private final StorageService storageService;
    private final InstanceSettingsService instanceSettingsService;

    private static final long DEFAULT_MAX_UPLOAD_BYTES = 2L * 1024 * 1024 * 1024; // 2 GiB
    private static final long ABSOLUTE_MAX_UPLOAD_BYTES = 16L * 1024 * 1024 * 1024; // 16 GiB

    public FileMetadata addFileToSend(UUID sendId, MultipartFile file) throws IOException {
        Send send = sendRepository.findById(sendId)
                .orElseThrow(ResourceNotFoundException::sendNotFound);

        // Only the Send's owner may attach a file (treats "not yours" as "not found").
        SecurityUtils.requireOwner(send.getOwnerId());

        if (!fileRepository.findBySendId(sendId).isEmpty()) {
            throw new IllegalArgumentException("Send already has a file");
        }

        long maxUploadBytes = instanceSettingsService.getLong("max_upload_size_bytes", DEFAULT_MAX_UPLOAD_BYTES);
        long effectiveMax = maxUploadBytes > 0 ? Math.min(maxUploadBytes, ABSOLUTE_MAX_UPLOAD_BYTES) : ABSOLUTE_MAX_UPLOAD_BYTES;
        if (file.getSize() > effectiveMax) {
            throw new UploadSizeLimitExceededException(effectiveMax);
        }

        String storedPath = storageService.save(
                file.getInputStream(),
                file.getSize(),
                UUID.randomUUID().toString()
        );

        FileMetadata meta = FileMetadata.builder()
                .send(send)
                .filename(file.getOriginalFilename())
                .storagePath(storedPath)
                .sizeBytes(file.getSize())
                .build();

        return fileRepository.save(meta);
    }
}

