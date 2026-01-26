package fr.se2eend.backend.exception;

import fr.se2eend.backend.exception.enums.ErrorCode;

public class SendExpiredException extends RuntimeException {
    private final ErrorCode code;

    public SendExpiredException() {
        super("Send has expired");
        this.code = ErrorCode.SEND_EXPIRED;
    }

    public ErrorCode code() {
        return code;
    }
}