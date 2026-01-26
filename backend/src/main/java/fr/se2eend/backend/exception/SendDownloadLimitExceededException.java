package fr.se2eend.backend.exception;

import fr.se2eend.backend.exception.enums.ErrorCode;

public class SendDownloadLimitExceededException extends RuntimeException {
    private final ErrorCode code;

    public SendDownloadLimitExceededException() {
        super("Download limit exceeded for this send");
        this.code = ErrorCode.SEND_DOWNLOAD_LIMIT_EXCEEDED;
    }

    public ErrorCode code() {
        return code;
    }
}