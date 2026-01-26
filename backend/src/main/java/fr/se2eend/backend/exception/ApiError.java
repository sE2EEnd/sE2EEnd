package fr.se2eend.backend.exception;

import java.time.LocalDateTime;
import java.util.List;

public record ApiError(
        LocalDateTime timestamp,
        int status,
        String error,
        String code,
        String message,
        String correlationId,
        List<String> details
) {
    public static ApiError of(int status, String error, String code, String message,
                              String correlationId, List<String> details) {
        return new ApiError(LocalDateTime.now(), status, error, code, message, correlationId, details);
    }
}
