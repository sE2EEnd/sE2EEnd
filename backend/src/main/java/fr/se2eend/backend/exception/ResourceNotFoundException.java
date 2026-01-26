package fr.se2eend.backend.exception;

import fr.se2eend.backend.exception.enums.ErrorCode;

public class ResourceNotFoundException extends RuntimeException {
    private final ErrorCode code;

    public ResourceNotFoundException(ErrorCode code, String technicalMessage) {
        super(technicalMessage);
        this.code = code;
    }

    public ErrorCode code() { return code; }

    public static ResourceNotFoundException sendNotFound() {
        return new ResourceNotFoundException(ErrorCode.SEND_NOT_FOUND, "Send not found");
    }
}
