package fr.se2eend.backend.storage;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3ClientBuilder;
import software.amazon.awssdk.services.s3.model.*;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.util.OptionalLong;

/**
 * S3-compatible implementation of StorageService.
 * Works with AWS S3 and any S3-compatible storage (e.g. MinIO, Scaleway, OVHcloud).
 */
public class S3FileStorage implements StorageService {

    private final S3Client s3Client;
    private final String bucket;

    public S3FileStorage(StorageProperties props) {
        StorageProperties.S3Properties s3Props = props.getS3();

        S3ClientBuilder builder = S3Client.builder()
                .region(Region.of(s3Props.getRegion()))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(s3Props.getAccessKey(), s3Props.getSecretKey())
                ));

        if (s3Props.getEndpoint() != null && !s3Props.getEndpoint().isBlank()) {
            builder.endpointOverride(URI.create(s3Props.getEndpoint()));
        }

        if (s3Props.isPathStyleAccess()) {
            builder.forcePathStyle(true);
        }

        this.s3Client = builder.build();
        this.bucket = s3Props.getBucket();
    }

    @Override
    public String save(InputStream data, long contentLength, String suggestedName) throws IOException {
        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(bucket)
                .key(suggestedName)
                .contentLength(contentLength)
                .build();

        s3Client.putObject(request, RequestBody.fromInputStream(data, contentLength));
        return suggestedName;
    }

    @Override
    public InputStream read(String storagePath) {
        GetObjectRequest request = GetObjectRequest.builder()
                .bucket(bucket)
                .key(storagePath)
                .build();

        return s3Client.getObject(request);
    }

    @Override
    public boolean delete(String storagePath) throws IOException {
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucket)
                    .key(storagePath)
                    .build());
            return true;
        } catch (S3Exception e) {
            return false;
        }
    }

    @Override
    public OptionalLong size(String storagePath) {
        try {
            HeadObjectResponse response = s3Client.headObject(HeadObjectRequest.builder()
                    .bucket(bucket)
                    .key(storagePath)
                    .build());
            return response.contentLength() != null
                    ? OptionalLong.of(response.contentLength())
                    : OptionalLong.empty();
        } catch (S3Exception e) {
            return OptionalLong.empty();
        }
    }
}
