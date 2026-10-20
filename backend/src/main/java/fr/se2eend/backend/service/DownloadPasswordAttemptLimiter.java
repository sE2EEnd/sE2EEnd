package fr.se2eend.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory limiter of failed password attempts, tracked per access id and per client address.
 */
@Component
public class DownloadPasswordAttemptLimiter {

    private static final int PURGE_THRESHOLD = 10_000;

    private record Window(int failures, long startedAtMs) {}

    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
    private final int maxAttemptsPerSend;
    private final int maxAttemptsPerClient;
    private final long windowMs;
    private final Clock clock;

    @Autowired
    public DownloadPasswordAttemptLimiter(
            @Value("${security.download.password-max-attempts:10}") int maxAttemptsPerSend,
            @Value("${security.download.password-max-attempts-per-client:30}") int maxAttemptsPerClient,
            @Value("${security.download.password-window-seconds:900}") long windowSeconds) {
        this(maxAttemptsPerSend, maxAttemptsPerClient, windowSeconds, Clock.systemUTC());
    }

    DownloadPasswordAttemptLimiter(int maxAttemptsPerSend, int maxAttemptsPerClient, long windowSeconds, Clock clock) {
        this.maxAttemptsPerSend = maxAttemptsPerSend;
        this.maxAttemptsPerClient = maxAttemptsPerClient;
        this.windowMs = windowSeconds * 1000;
        this.clock = clock;
    }

    /** Returns 0 if attempts are allowed, otherwise the number of seconds to wait. */
    public long retryAfterSeconds(String accessId, String clientKey) {
        return Math.max(
                remaining("s:" + accessId, maxAttemptsPerSend),
                clientKey == null ? 0 : remaining("c:" + clientKey, maxAttemptsPerClient));
    }

    public void recordFailure(String accessId, String clientKey) {
        increment("s:" + accessId);
        if (clientKey != null) increment("c:" + clientKey);
    }

    public void reset(String accessId) {
        windows.remove("s:" + accessId);
    }

    private long remaining(String key, int max) {
        Window w = windows.get(key);
        if (w == null) return 0;
        long now = clock.millis();
        if (now - w.startedAtMs >= windowMs) return 0;
        if (w.failures < max) return 0;
        return Math.max(1, (w.startedAtMs + windowMs - now + 999) / 1000);
    }

    private void increment(String key) {
        long now = clock.millis();
        if (windows.size() > PURGE_THRESHOLD) {
            windows.values().removeIf(w -> now - w.startedAtMs >= windowMs);
        }
        windows.compute(key, (k, w) ->
                (w == null || now - w.startedAtMs >= windowMs) ? new Window(1, now) : new Window(w.failures + 1, w.startedAtMs));
    }
}
