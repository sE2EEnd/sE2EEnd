package fr.se2eend.backend.exception;

import fr.se2eend.backend.exception.enums.ErrorCode;
import fr.se2eend.backend.logging.CorrelationIdFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private String cid() {
        return org.slf4j.MDC.get(CorrelationIdFilter.CORRELATION_ID);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
        List<String> details = ex.getBindingResult().getFieldErrors()
                .stream()
                .map(fe -> fe.getField() + " " + humanize(fe))
                .distinct()
                .toList();

        log.warn("Validation failed (cid={}): {}", cid(), summarizeFieldErrors(ex));

        ApiError body = ApiError.of(
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                ErrorCode.VALIDATION_ERROR.name(),
                "Request validation failed",
                cid(),
                details
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        log.warn("Type mismatch (cid={}): param={}, requiredType={}, msg={}",
                cid(), ex.getName(), ex.getRequiredType(), ex.getMessage());

        ApiError body = ApiError.of(
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                ErrorCode.TYPE_MISMATCH.name(),
                "Invalid parameter type",
                cid(),
                List.of("Parameter '" + ex.getName() + "' has invalid type")
        );
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(ResourceNotFoundException ex) {
        log.info("Not found (cid={}): code={}, msg={}", cid(), ex.code(), ex.getMessage());

        ApiError body = ApiError.of(
                HttpStatus.NOT_FOUND.value(),
                HttpStatus.NOT_FOUND.getReasonPhrase(),
                ex.code().name(),
                "Resource not found",
                cid(),
                List.of()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleGeneric(Exception ex) {
        log.error("Unhandled exception (cid={})", cid(), ex);

        ApiError body = ApiError.of(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase(),
                ErrorCode.INTERNAL_ERROR.name(),
                "An unexpected error occurred",
                cid(),
                List.of()
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }

    @ExceptionHandler(SendExpiredException.class)
    public ResponseEntity<ApiError> handleSendExpired(SendExpiredException ex) {
        log.info("Send expired (cid={}): code={}, msg={}", cid(), ex.code(), ex.getMessage());
        ApiError body = ApiError.of(
                HttpStatus.GONE.value(),
                HttpStatus.GONE.getReasonPhrase(),
                ex.code().name(),
                ex.getMessage(),
                cid(),
                List.of()
        );
        return ResponseEntity.status(HttpStatus.GONE).body(body);
    }

    @ExceptionHandler(SendRevokedException.class)
    public ResponseEntity<ApiError> handleSendRevoked(SendRevokedException ex) {
        log.info("Send revoked (cid={}): code={}, msg={}", cid(), ex.code(), ex.getMessage());
        ApiError body = ApiError.of(
                HttpStatus.NOT_FOUND.value(),
                HttpStatus.NOT_FOUND.getReasonPhrase(),
                ex.code().name(),
                ex.getMessage(),
                cid(),
                List.of()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
    }

    @ExceptionHandler(SendDownloadLimitExceededException.class)
    public ResponseEntity<ApiError> handleDownloadLimitExceeded(SendDownloadLimitExceededException ex) {
        log.info("Download limit exceeded (cid={}): code={}, msg={}", cid(), ex.code(), ex.getMessage());
        ApiError body = ApiError.of(
                HttpStatus.GONE.value(),
                HttpStatus.GONE.getReasonPhrase(),
                ex.code().name(),
                ex.getMessage(),
                cid(),
                List.of()
        );
        return ResponseEntity.status(HttpStatus.GONE).body(body);
    }

    @ExceptionHandler(SendPasswordInvalidException.class)
    public ResponseEntity<ApiError> handlePasswordInvalid(SendPasswordInvalidException ex) {
        log.info("Invalid password (cid={}): code={}, msg={}", cid(), ex.code(), ex.getMessage());
        ApiError body = ApiError.of(
                HttpStatus.FORBIDDEN.value(),
                HttpStatus.FORBIDDEN.getReasonPhrase(),
                ex.code().name(),
                ex.getMessage(),
                cid(),
                List.of()
        );
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
    }

    private static String humanize(FieldError fe) {
        String defaultMsg = fe.getDefaultMessage();
        return defaultMsg != null ? defaultMsg : "is invalid";
    }

    private static String summarizeFieldErrors(MethodArgumentNotValidException ex) {
        return ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .distinct()
                .toList()
                .toString();
    }
}
