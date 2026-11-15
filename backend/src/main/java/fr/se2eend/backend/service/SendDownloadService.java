package fr.se2eend.backend.service;

import fr.se2eend.backend.exception.ResourceNotFoundException;
import fr.se2eend.backend.exception.SendDownloadLimitExceededException;
import fr.se2eend.backend.exception.SendExpiredException;
import fr.se2eend.backend.exception.SendPasswordInvalidException;
import fr.se2eend.backend.exception.SendRateLimitedException;
import fr.se2eend.backend.exception.SendRevokedException;
import fr.se2eend.backend.model.FileMetadata;
import fr.se2eend.backend.model.Send;
import fr.se2eend.backend.model.enums.DeleteReason;
import fr.se2eend.backend.repository.SendRepository;
import fr.se2eend.backend.storage.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class SendDownloadService {

    private final SendRepository sendRepository;
    private final StorageService storageService;
    private final PasswordEncoder passwordEncoder;
    private final DownloadPasswordAttemptLimiter attemptLimiter;
    private final SendDeletionService sendDeletionService;

    private static final int MAX_PASSWORD_LENGTH = 256;
    private static final int DESTROY_TOKEN_BYTES = 32;
    private static final int MAX_DESTROY_TOKEN_LENGTH = 64;
    private static final String DESTROY_LIMITER_PREFIX = "destroy:";

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

    /**
     * Destroy a send on behalf of its recipient, who proves they hold the link by presenting the token
     * derived from the send key. Unknown send, option off and wrong token all fail the same way, so the
     * endpoint never reveals whether a send exists. The password is deliberately not required.
     */
    @Transactional
    public void destroyByRecipient(String accessId, String token, String clientKey) {
        String limiterKey = DESTROY_LIMITER_PREFIX + accessId;
        long retryAfter = attemptLimiter.retryAfterSeconds(limiterKey, clientKey);
        if (retryAfter > 0) throw new SendRateLimitedException(retryAfter);

        byte[] presentedHash = hashDestroyToken(token);
        Send send = sendRepository.findByAccessIdForUpdate(accessId).orElse(null);
        byte[] storedHash = send != null ? decodeBase64Url(send.getRecipientDestroyTokenHash()) : null;

        if (presentedHash == null || storedHash == null || !MessageDigest.isEqual(presentedHash, storedHash)) {
            attemptLimiter.recordFailure(limiterKey, clientKey);
            throw ResourceNotFoundException.sendNotFound();
        }

        attemptLimiter.reset(limiterKey);
        sendDeletionService.auditAndDelete(send, DeleteReason.RECIPIENT);
    }

    /** SHA-256 of the decoded token, or null when the token is malformed. */
    private static byte[] hashDestroyToken(String token) {
        if (token == null || token.length() > MAX_DESTROY_TOKEN_LENGTH) return null;
        byte[] raw = decodeBase64Url(token);
        if (raw == null || raw.length != DESTROY_TOKEN_BYTES) return null;
        try {
            return MessageDigest.getInstance("SHA-256").digest(raw);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    private static byte[] decodeBase64Url(String value) {
        if (value == null) return null;
        try {
            return Base64.getUrlDecoder().decode(value.getBytes(StandardCharsets.US_ASCII));
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    public record DownloadStream(InputStream stream, String filename, Long sizeBytes) {}
}