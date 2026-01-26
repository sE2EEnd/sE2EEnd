package fr.se2eend.backend.scheduler;

import fr.se2eend.backend.service.AdminService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "cleanup.scheduler.enabled", havingValue = "true")
public class CleanupScheduler {

    private final AdminService adminService;

    @Scheduled(cron = "${cleanup.scheduler.cron:0 0 2 * * *}")
    public void scheduledCleanup() {
        log.info("Starting scheduled cleanup task");

        try {
            Map<String, Object> result = adminService.runCleanup();
            log.info("Scheduled cleanup completed successfully: {}", result);
        } catch (Exception e) {
            log.error("Scheduled cleanup failed", e);
        }
    }
}
