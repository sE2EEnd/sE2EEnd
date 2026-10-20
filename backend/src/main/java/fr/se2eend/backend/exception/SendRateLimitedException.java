package fr.se2eend.backend.exception;

public class SendRateLimitedException extends RuntimeException {
    private final long retryAfterSeconds;

    public SendRateLimitedException(long retryAfterSeconds) {
        super("Too many attempts, try again later");
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long retryAfterSeconds() {
        return retryAfterSeconds;
    }
}
