---
sidebar_position: 2
---

# Storage

sE2EEnd supports two storage backends for encrypted files: local filesystem and S3-compatible object storage.

:::note
Only **ciphertext** is stored. The encryption key never leaves the browser and is never sent to the server.
:::

## Local filesystem (default)

Files are written to a directory inside the backend container, backed by a Docker volume.

```dotenv
STORAGE_PROVIDER=local
```

The path inside the container is fixed to `/app/uploads` and is mounted as the `se2eend_uploads` Docker volume.

**Backup:** To back up uploaded files, snapshot the Docker volume or mount an external path:

```yaml
# docker-compose.yml override
volumes:
  uploads_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /mnt/your-nfs-share/se2eend-uploads
```

## S3-compatible storage

Any S3-compatible provider is supported (AWS S3, MinIO, Scaleway, OVHcloud, etc.).

```dotenv
STORAGE_PROVIDER=s3
STORAGE_S3_BUCKET=my-bucket
STORAGE_S3_REGION=us-east-1
STORAGE_S3_ACCESS_KEY=...
STORAGE_S3_SECRET_KEY=...
```

**AWS S3** works out of the box with just the above — leave `STORAGE_S3_ENDPOINT` empty.

For other providers, set `STORAGE_S3_ENDPOINT` to your provider's S3-compatible endpoint URL. For self-hosted solutions like MinIO that use path-style access, also set `STORAGE_S3_PATH_STYLE=true`.

See [Environment Variables](../deployment/environment-variables#s3-compatible-storage) for the full variable reference.

## Cleanup

Expired, revoked, and exhausted sends can be cleaned up from the admin dashboard (**Run Cleanup** button), or automatically via the configurable cron schedule in **Admin → Settings**.

Cleanup deletes both the database records and the corresponding files from storage.
