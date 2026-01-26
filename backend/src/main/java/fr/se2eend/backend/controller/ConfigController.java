package fr.se2eend.backend.controller;

import fr.se2eend.backend.dto.ThemeConfigDto;
import fr.se2eend.backend.service.ThemeConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/config")
@RequiredArgsConstructor
@Tag(name = "Configuration", description = "Application configuration endpoints")
public class ConfigController {

    private final ThemeConfigService themeConfigService;

    @GetMapping("/theme")
    @Operation(summary = "Get theme configuration", description = "Returns the current theme configuration (colors, branding, etc.)")
    public ResponseEntity<ThemeConfigDto> getThemeConfig() {
        return ResponseEntity.ok(themeConfigService.getThemeConfig());
    }
}
