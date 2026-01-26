package fr.se2eend.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ThemeConfigDto {
    private String appName;
    private String logoUrl;
    private ThemeColors colors;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ThemeColors {
        private String primaryFrom;
        private String primaryTo;
        private String primaryAccent;
        private String primaryHex;
        private String primaryDarkHex;
        private String primaryLightHex;
    }
}
