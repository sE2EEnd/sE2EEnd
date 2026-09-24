package fr.se2eend.backend.service;

import fr.se2eend.backend.config.SecurityUtils;
import fr.se2eend.backend.exception.ResourceNotFoundException;
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

    public FileMetadata addFileToSend(UUID sendId, MultipartFile file) throws IOException {
        Send send = sendRepository.findById(sendId)
                .orElseThrow(ResourceNotFoundException::sendNotFound);

        // Only the Send's owner may attach a file (treats "not yours" as "not found").
        SecurityUtils.requireOwner(send.getOwnerId());

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

