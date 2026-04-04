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

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class SendDownloadService {

    private final SendRepository sendRepository;
    private final StorageService storageService;
    private final PasswordEncoder passwordEncoder;

    @Transactional(rollbackFor = Exception.class)
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

        FileMetadata file = send.getFile();
        if (file == null) {
            throw new ResourceNotFoundException(
                    fr.se2eend.backend.exception.enums.ErrorCode.FILE_NOT_FOUND,
                    "No file attached to this send"
            );
        }

        InputStream inputStream = storageService.read(file.getStoragePath());

        send.setDownloadCount(send.getDownloadCount() + 1);
        sendRepository.save(send);

        return new DownloadStream(inputStream, file.getFilename(), file.getSizeBytes());
    }

    public record DownloadStream(InputStream stream, String filename, Long sizeBytes) {}
}