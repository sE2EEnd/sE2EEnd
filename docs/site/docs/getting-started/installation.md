---
sidebar_position: 2
---

# Installation

## 1. Get the deployment files

You don't need the source code — Docker images are published to GHCR. Fetch only the files needed to run the stack:

```bash
git clone --depth=1 --filter=blob:none --sparse https://github.com/sE2EEnd/sE2EEnd.git
cd sE2EEnd
git sparse-checkout set --no-cone /docker-compose.yml /.env.example /init-databases.sql keycloak/
```

:::info
`--filter=blob:none --sparse` ensures only the files you need are downloaded — no source code, no build artifacts.
:::

This gives you the Compose file, environment template, database init script, and Keycloak realm/theme — nothing else.

## 2. Start the stack

```bash
docker compose up -d
```

Docker Compose will pull the images and start PostgreSQL, then Keycloak (which imports the realm on first boot), then the backend and frontend.

:::tip
Wait ~30 seconds on first boot for Keycloak to complete the realm import before opening your browser.
:::

## 3. Verify

```bash
docker compose ps
```

All four services (`postgres`, `keycloak`, `backend`, `frontend`) should be `Up`.

Open `http://localhost` — you should see the sE2EEnd login page.

## Updating

```bash
docker compose pull
docker compose up -d
```
