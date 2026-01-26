package fr.se2eend.backend.service;

import fr.se2eend.backend.exception.ResourceNotFoundException;
import fr.se2eend.backend.exception.SendDownloadLimitExceededException;
import fr.se2eend.backend.exception.SendExpiredException;
import fr.se2eend.backend.exception.SendPasswordInvalidException;
import fr.se2eend.backend.exception.SendRevokedException;
import fr.se2eend.backend.model.FileMetadata;
import fr.se2eend.backend.model.Send;
import fr.se2eend.backend.repository.SendRepository;
import fr.se2eend.backend.storage.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
@RequiredArgsConstructor
public class SendDownloadService {

    private final SendRepository sendRepository;
    private final StorageService storageService;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public DownloadStream downloadByAccessId(String accessId, String password) throws IOException {
        Send send = sendRepository.findByAccessId(accessId)
                .orElseThrow(ResourceNotFoundException::sendNotFound);

        if (send.isRevoked()) throw new SendRevokedException();
        if (send.getExpiresAt() != null && send.getExpiresAt().isBefore(LocalDateTime.now()))
            throw new SendExpiredException();

        if (send.isPasswordProtected()) {
            if (password == null || password.isBlank()) {
                throw new SendPasswordInvalidException();
            }
            if (!passwordEncoder.matches(password, send.getPasswordHash())) {
                throw new SendPasswordInvalidException();
            }
        }

        if (send.getDownloadCount() >= send.getMaxDownloads()) {
            throw new SendDownloadLimitExceededException();
        }

        send.setDownloadCount(send.getDownloadCount() + 1);
        sendRepository.save(send);

        List<FileMetadata> files = send.getFiles();
        if (files == null || files.isEmpty()) {
            throw new ResourceNotFoundException(
                    fr.se2eend.backend.exception.enums.ErrorCode.FILE_NOT_FOUND,
                    "No files attached to this send"
            );
        }

        if (files.size() == 1) {
            FileMetadata file = files.getFirst();
            InputStream inputStream = storageService.read(file.getStoragePath());
            return new DownloadStream(inputStream, file.getFilename(), file.getSizeBytes());
        }

        PipedOutputStream pos = new PipedOutputStream();
        PipedInputStream pis = new PipedInputStream(pos);

        new Thread(() -> {
            try (ZipOutputStream zos = new ZipOutputStream(pos)) {
                for (FileMetadata file : files) {
                    try (InputStream fis = storageService.read(file.getStoragePath())) {
                        zos.putNextEntry(new ZipEntry(file.getFilename()));
                        fis.transferTo(zos);
                        zos.closeEntry();
                    }
                }
            } catch (IOException e) {
                // stream is cut => ZIP generation stops
            }
        }).start();

        return new DownloadStream(pis, "send-" + send.getAccessId() + ".zip", null);
    }

    public record DownloadStream(InputStream stream, String filename, Long sizeBytes) {}
}