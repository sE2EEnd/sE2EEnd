---
sidebar_position: 1
---

# Docker Compose

The canonical way to run sE2EEnd is with Docker Compose. The repository ships a `docker-compose.yml` that starts all four services.

## Services

| Service    | Image                                     | Default port |
|------------|-------------------------------------------|--------------|
| `postgres` | `postgres:18.3`                           | 5432         |
| `keycloak` | `quay.io/keycloak/keycloak:26.5`          | 8090 → 8080  |
| `backend`  | `ghcr.io/se2eend/se2eend-backend:latest`  | 8081         |
| `frontend` | `ghcr.io/se2eend/se2eend-frontend:latest` | 80           |

## Startup order

```
postgres (healthy)
    └─▶ keycloak (started)  ─┐
    └─▶ backend (started)   ─┤
                              └─▶ frontend
```

PostgreSQL exposes a healthcheck (`pg_isready`) that Keycloak and the backend wait for before starting.

## Volumes

| Volume | Purpose |
|---|---|
| `se2eend_data` | PostgreSQL data |
| `se2eend_uploads` | Uploaded ciphertext files (local storage only) |

## Quick start

See [Installation](../getting-started/installation) for how to fetch the deployment files and start the stack.

## Production checklist

### 1. Strong secrets

```dotenv
POSTGRES_PASSWORD='<random 32+ chars>'
KEYCLOAK_ADMIN_PASSWORD='<random 32+ chars>'
```

### 2. Correct public URLs

```dotenv
KEYCLOAK_EXTERNAL_URL=https://auth.your-domain.com
FRONTEND_URL=https://your-domain.com
```

`KEYCLOAK_EXTERNAL_URL` must be the URL **as browsers see it** — it is embedded in JWT tokens as the issuer and validated by the backend.

### 3. Reverse proxy in front

Expose only port 80 (or 443) publicly. See [Reverse Proxy](./reverse-proxy) for nginx and Traefik examples.

### 4. Pin image versions

Replace `:latest` tags with specific versions for reproducible deployments:

```yaml
backend:
  image: ghcr.io/se2eend/se2eend-backend:1.2.3
frontend:
  image: ghcr.io/se2eend/se2eend-frontend:1.2.3
```

### 5. Persist uploads volume (local storage)

The `se2eend_uploads` volume contains all encrypted files. Back it up regularly, or switch to [S3 storage](../configuration/storage) for managed durability.

## Updating

```bash
docker compose pull
docker compose up -d
```

## Useful commands

```bash
# View logs
docker compose logs -f backend

# Restart a single service
docker compose restart frontend

# Stop everything (volumes preserved)
docker compose down

# Stop and delete volumes (⚠ destructive)
docker compose down -v
```
