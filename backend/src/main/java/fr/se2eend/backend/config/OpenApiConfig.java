package fr.se2eend.backend.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Value("${spring.application.version}")
    private String appVersion;

    @Value("${spring.application.name}")
    private String appName;

    @Bean
    public OpenAPI se2eendOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title(appName +  " - API")
                        .description("""
                            Secure End-to-End Encrypted File Transfer backend.

                            This API provides endpoints to create file containers (Sends),
                            upload encrypted files, and download them via direct or shared links.
                            """)
                        .version(appVersion)
                );
    }
}