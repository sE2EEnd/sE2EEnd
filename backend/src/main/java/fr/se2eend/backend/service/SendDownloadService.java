package fr.se2eend.backend.service;

import fr.se2eend.backend.exception.ResourceNotFoundException;
import fr.se2eend.backend.exception.SendDownloadLimitExceededException;
import fr.se2eend.backend.exception.SendExpiredException;
import fr.se2eend.backend.exception.SendPasswordInvalidException;
import fr.se2eend.backend.exception.SendRateLimitedException;
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
    private final DownloadPasswordAttemptLimiter attemptLimiter;

    private static final int MAX_PASSWORD_LENGTH = 256;

    @Transactional(rollbackFor = Exception.class)
    public DownloadStream downloadByAccessId(String accessId, String password) throws IOException {
        return downloadByAccessId(accessId, password, null);
    }

    @Transactional(rollbackFor = Exception.class)
    public DownloadStream downloadByAccessId(String accessId, String password, String clientKey) throws IOException {
        Send send = sendRepository.findByAccessId(accessId)
                .orElseThrow(ResourceNotFoundException::sendNotFound);

        if (send.isRevoked()) throw new SendRevokedException();
        if (send.getExpiresAt() != null && send.getExpiresAt().isBefore(LocalDateTime.now()))
            throw new SendExpiredException();

        if (send.isPasswordProtected()) {
            long retryAfter = attemptLimiter.retryAfterSeconds(accessId, clientKey);
            if (retryAfter > 0) throw new SendRateLimitedException(retryAfter);
            if (password == null || password.isBlank()
                    || password.length() > MAX_PASSWORD_LENGTH
                    || !passwordEncoder.matches(password, send.getPasswordHash())) {
                attemptLimiter.recordFailure(accessId, clientKey);
                throw new SendPasswordInvalidException();
            }
            attemptLimiter.reset(accessId);
        }

        FileMetadata file = send.getFile();
        if (file == null) {
            throw new ResourceNotFoundException(
                    fr.se2eend.backend.exception.enums.ErrorCode.FILE_NOT_FOUND,
                    "No file attached to this send"
            );
        }

        if (sendRepository.incrementDownloadCountIfBelowLimit(send.getId()) == 0) {
            throw new SendDownloadLimitExceededException();
        }

        InputStream inputStream = storageService.read(file.getStoragePath());

        return new DownloadStream(inputStream, file.getFilename(), file.getSizeBytes());
    }

    public record DownloadStream(InputStream stream, String filename, Long sizeBytes) {}
}