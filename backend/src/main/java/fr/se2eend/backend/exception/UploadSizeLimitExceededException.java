package fr.se2eend.backend.exception;

import fr.se2eend.backend.exception.enums.ErrorCode;

public class UploadSizeLimitExceededException extends RuntimeException {
    private final ErrorCode code;

    public UploadSizeLimitExceededException(long limitBytes) {
        super("Upload size exceeds the configured limit of " + limitBytes + " bytes");
        this.code = ErrorCode.UPLOAD_SIZE_EXCEEDED;
    }

    public ErrorCode code() {
        return code;
    }
}