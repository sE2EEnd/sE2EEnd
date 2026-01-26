package fr.se2eend.backend.service;

import fr.se2eend.backend.exception.ResourceNotFoundException;
import fr.se2eend.backend.exception.enums.ErrorCode;
import fr.se2eend.backend.model.FileMetadata;
import fr.se2eend.backend.model.Send;
import fr.se2eend.backend.repository.FileRepository;
import fr.se2eend.backend.repository.SendRepository;
import fr.se2eend.backend.storage.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
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

        String storedPath = storageService.save(
                file.getInputStream(),
                file.getSize(),
                file.getOriginalFilename()
        );

        FileMetadata meta = FileMetadata.builder()
                .send(send)
                .filename(file.getOriginalFilename())
                .storagePath(storedPath)
                .sizeBytes(file.getSize())
                .build();

        return fileRepository.save(meta);
    }

    public InputStream readFile(UUID fileId) throws IOException {
        FileMetadata file = fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.FILE_NOT_FOUND, "File not found"));
        return storageService.read(file.getStoragePath());
    }

    public FileMetadata findMetadata(UUID fileId) {
        return fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.FILE_NOT_FOUND, "File not found"));
    }
}

