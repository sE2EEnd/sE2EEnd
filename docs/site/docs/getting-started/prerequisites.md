---
sidebar_position: 1
---

# Prerequisites

Before installing sE2EEnd, make sure you have the following.

## Required

- **Docker** ≥ 24
- **Docker Compose** ≥ 2.20

```bash
docker --version
docker compose version
```

## For production

- A **domain name** with DNS pointing to your server
- An **SSL certificate** (Let's Encrypt via Certbot or your reverse proxy)
- Ports **80/443** open for the frontend, and optionally a subdomain for Keycloak

## Not required

- Java, Node.js, Maven — you don't build anything locally. All images are pulled from GHCR.
