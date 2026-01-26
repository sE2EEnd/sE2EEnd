package fr.se2eend.backend.exception;

import fr.se2eend.backend.exception.enums.ErrorCode;

public class SendRevokedException extends RuntimeException {
    private final ErrorCode code;

    public SendRevokedException() {
        super("Send has been revoked");
        this.code = ErrorCode.SEND_REVOKED;
    }

    public ErrorCode code() {
        return code;
    }
}