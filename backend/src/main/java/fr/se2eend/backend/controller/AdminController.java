package fr.se2eend.backend.controller;

import fr.se2eend.backend.dto.SendResponseDto;
import fr.se2eend.backend.service.AdminService;
import fr.se2eend.backend.service.StorageMetricsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Tag(name = "Admin", description = "Admin operations (requires ADMIN role)")
@SecurityRequirement(name = "Bearer Authentication")
public class AdminController {

    private final AdminService adminService;
    private final StorageMetricsService storageMetricsService;

    @GetMapping("/sends")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Get all sends (admin only)")
    public ResponseEntity<List<SendResponseDto>> getAllSends() {
        return ResponseEntity.ok(adminService.getAllSends());
    }

    @GetMapping("/stats")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Get application statistics")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(adminService.getStats());
    }

    @DeleteMapping("/sends/{id}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Delete any send (admin only)")
    public ResponseEntity<Void> deleteSend(@PathVariable UUID id) {
        adminService.deleteSend(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/sends/{id}/revoke")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Revoke a send (admin only)")
    public ResponseEntity<Void> revokeSend(@PathVariable UUID id) {
        adminService.revokeSend(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/storage/metrics")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Get storage usage metrics")
    public ResponseEntity<Map<String, Object>> getStorageMetrics() {
        return ResponseEntity.ok(storageMetricsService.getStorageMetrics());
    }

    @PostMapping("/cleanup")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Run cleanup of expired/revoked sends")
    public ResponseEntity<Map<String, Object>> runCleanup() {
        return ResponseEntity.ok(adminService.runCleanup());
    }
}
