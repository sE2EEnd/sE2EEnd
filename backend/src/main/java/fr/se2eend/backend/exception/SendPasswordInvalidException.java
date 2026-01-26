package fr.se2eend.backend.exception;

import fr.se2eend.backend.exception.enums.ErrorCode;

public class SendPasswordInvalidException extends RuntimeException {
    private final ErrorCode code;

    public SendPasswordInvalidException() {
        super("Invalid password for this send");
        this.code = ErrorCode.SEND_PASSWORD_INVALID;
    }

    public ErrorCode code() {
        return code;
    }
}