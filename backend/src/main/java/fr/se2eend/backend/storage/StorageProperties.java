package fr.se2eend.backend.storage;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration properties for the file storage system.
 * <p>
 * These values are loaded automatically from application.yml
 * under the prefix "storage".
 * <p>
 */
@Setter
@Getter
@Configuration
@ConfigurationProperties(prefix = "storage")
public class StorageProperties {

    /**
     * Provider type (local, s3, ...).
     * Defines which StorageService implementation to use.
     */
    private String provider = "local";

    /**
     * Root directory or bucket for storing encrypted files.
     * Defaults to ./uploads for local provider.
     */
    private String baseDir = "./uploads";

    @Override
    public String toString() {
        return "StorageProperties{" +
                "provider='" + provider + '\'' +
                ", baseDir='" + baseDir + '\'' +
                '}';
    }
}
