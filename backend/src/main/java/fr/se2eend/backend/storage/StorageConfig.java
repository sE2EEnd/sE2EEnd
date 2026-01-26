package fr.se2eend.backend.storage;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Storage configuration selector.
 * Chooses which StorageService implementation to instantiate
 * based on the configured provider in application.yml.
 */
@Configuration
public class StorageConfig {

    @Bean
    public StorageService storageService(StorageProperties properties) {
        return switch (properties.getProvider().toLowerCase()) {
            case "local" -> new LocalFileSystemStorage(properties);
            // TODO add "s3" or an other storage here later
            default -> throw new IllegalArgumentException(
                    "Unsupported storage provider: " + properties.getProvider()
            );
        };
    }
}
