package fr.se2eend.backend.scheduler;

import fr.se2eend.backend.service.AdminService;
import fr.se2eend.backend.service.ChunkedUploadService;
import fr.se2eend.backend.service.InstanceSettingsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class CleanupScheduler {

    private final AdminService adminService;
    private final ChunkedUploadService chunkedUploadService;
    private final InstanceSettingsService instanceSettingsService;

    /**
     * Runs every minute and checks whether the cron expression stored in DB matches now.
     * This allows changing the schedule at runtime without restarting the application.
     */
    @Scheduled(fixedRate = 60_000)
    public void scheduledCleanup() {
        String cronExpr = instanceSettingsService.get("cleanup_cron", "").strip();

        if (cronExpr.isBlank() || "disabled".equalsIgnoreCase(cronExpr)) {
            return;
        }

        CronExpression cron;
        try {
            cron = CronExpression.parse(cronExpr);
        } catch (IllegalArgumentException e) {
            log.warn("Invalid cleanup cron expression '{}': {}", cronExpr, e.getMessage());
            return;
        }

        // Check if the cron would have fired in the last minute
        LocalDateTime now = LocalDateTime.now().withSecond(0).withNano(0);
        LocalDateTime prev = now.minusMinutes(1);
        LocalDateTime next = cron.next(prev);

        if (next == null || !next.equals(now)) {
            return;
        }

        log.info("Running scheduled cleanup (cron={})", cronExpr);
        try {
            Map<String, Object> result = adminService.runCleanup();
            log.info("Scheduled cleanup completed: {}", result);
        } catch (Exception e) {
            log.error("Scheduled cleanup failed", e);
        }

        try {
            chunkedUploadService.cleanupStaleSessions(LocalDateTime.now().minusHours(24));
        } catch (Exception e) {
            log.error("Stale upload session cleanup failed", e);
        }
    }
}
