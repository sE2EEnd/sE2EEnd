package fr.se2eend.backend.exception;

import fr.se2eend.backend.exception.enums.ErrorCode;

public class StorageException extends RuntimeException {
    private final ErrorCode code;

    public StorageException() {
        super("Failed to delete file from storage");
        this.code = ErrorCode.FILE_NOT_FOUND;
    }

    public ErrorCode code() {
        return code;
    }
}