package fr.se2eend.backend.service;

import fr.se2eend.backend.dto.ThemeConfigDto;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ThemeConfigService {

    @Value("${app.name:sE2EEnd}")
    private String appName;

    @Value("${app.logo-url:}")
    private String logoUrl;

    public ThemeConfigDto getThemeConfig() {
        return ThemeConfigDto.builder()
                .appName(appName)
                .logoUrl(logoUrl)
                .colors(ThemeConfigDto.ThemeColors.builder()
                        .primaryFrom(null)
                        .primaryTo(null)
                        .primaryAccent(null)
                        .primaryHex(null)
                        .primaryDarkHex(null)
                        .primaryLightHex(null)
                        .build())
                .build();
    }
}
