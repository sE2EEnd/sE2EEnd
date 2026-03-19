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

    private S3Properties s3 = new S3Properties();

    @Getter
    @Setter
    public static class S3Properties {

        /** S3 bucket name. */
        private String bucket;

        /** AWS region (e.g. eu-west-3). */
        private String region = "us-east-1";

        /**
         * Optional custom endpoint URL (for S3-compatible storage like MinIO).
         * Leave empty to use the standard AWS endpoint.
         */
        private String endpoint;

        /** AWS access key ID. */
        private String accessKey;

        /** AWS secret access key. */
        private String secretKey;

        /**
         * Force path-style access (required for MinIO and some S3-compatible providers).
         * Defaults to false (virtual-hosted style, recommended for AWS S3).
         */
        private boolean pathStyleAccess = false;
    }

    @Override
    public String toString() {
        return "StorageProperties{" +
                "provider='" + provider + '\'' +
                ", baseDir='" + baseDir + '\'' +
                '}';
    }
}
