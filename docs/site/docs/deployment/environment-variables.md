---
sidebar_position: 2
---

# Environment Variables

All configuration is done through environment variables, typically via a `.env` file at the root of the repository.

```bash
cp .env.example .env
```

## Database

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_USER` | `se2eend` | PostgreSQL username (used by all services) |
| `POSTGRES_PASSWORD` | `se2eend` | PostgreSQL password — **change in production** |

The database name is fixed to `se2eend`. Keycloak uses its own database (`keycloak`) created by `init-databases.sql` on first boot.

## Keycloak

| Variable | Default | Description |
|---|---|---|
| `KEYCLOAK_ADMIN` | `admin` | Keycloak admin console username |
| `KEYCLOAK_ADMIN_PASSWORD` | `admin` | Keycloak admin console password — **change in production** |
| `KEYCLOAK_REALM` | `se2eend` | Realm name — must match the imported realm config |
| `KEYCLOAK_EXTERNAL_URL` | `http://localhost:8090` | Public URL of Keycloak **as seen by browsers** — used for JWT issuer validation |

:::warning
`KEYCLOAK_EXTERNAL_URL` must exactly match the URL browsers use to reach Keycloak. A mismatch causes JWT validation failures (`issuer mismatch`). Include the scheme and any path prefix, e.g. `https://auth.your-domain.com`.
:::

## Application

| Variable | Default | Description |
|---|---|---|
| `FRONTEND_URL` | `http://localhost` | Public URL of the frontend — used for CORS configuration in the backend |
| `SWAGGER_ENABLED` | `false` | Expose Swagger UI at `/swagger-ui.html` — enable only in development |
| `BACKEND_URL` | `http://backend:8081` | Internal URL the frontend nginx uses to reach the backend — change only if the default Docker network name resolution doesn't work (e.g. Podman) |

## Storage

| Variable | Default | Description |
|---|---|---|
| `STORAGE_PROVIDER` | `local` | Storage backend: `local` or `s3` |

### Local storage

Used when `STORAGE_PROVIDER=local`.

| Variable | Default | Description |
|---|---|---|
| `STORAGE_LOCAL_BASE_DIR` | `/app/uploads` | Directory where encrypted files are written inside the container — backed by the `se2eend_uploads` Docker volume |

### S3-compatible storage

Used when `STORAGE_PROVIDER=s3`. Compatible with AWS S3, MinIO, Scaleway Object Storage, OVHcloud Object Storage, etc.

| Variable | Default | Description |
|---|---|---|
| `STORAGE_S3_BUCKET` | _(required)_ | Bucket name |
| `STORAGE_S3_REGION` | `us-east-1` | AWS region or provider region |
| `STORAGE_S3_ACCESS_KEY` | _(required)_ | Access key ID |
| `STORAGE_S3_SECRET_KEY` | _(required)_ | Secret access key |
| `STORAGE_S3_ENDPOINT` | _(empty)_ | Custom endpoint URL for non-AWS providers, e.g. `https://s3.fr-par.scw.cloud` |
| `STORAGE_S3_PATH_STYLE` | `false` | Set to `true` for MinIO and providers that require path-style access |

See [Storage Configuration](../configuration/storage) for provider-specific examples.

## Theming

| Variable | Default | Description |
|---|---|---|
| `THEME_COLOR_PRIMARY` | `#2563eb` | Primary brand colour (used in Keycloak login theme and app UI) |
| `THEME_COLOR_PRIMARY_DARK` | `#1d4ed8` | Darker variant — hover states, active elements |
| `THEME_COLOR_PRIMARY_LIGHT` | `#3b82f6` | Lighter variant — highlights |

See [Theming](../configuration/theming) for full details including logo and app name customisation.
