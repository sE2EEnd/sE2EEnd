---
sidebar_position: 3
---

# Configuration

Before starting the stack, configure your environment.

```bash
cp .env.example .env
```

## Minimum required changes

For a local test, the defaults work as-is. For production, set at least:

```dotenv
# Strong passwords
POSTGRES_PASSWORD='<random 32+ chars>'
KEYCLOAK_ADMIN_PASSWORD='<random 32+ chars>'

# Public URLs (as seen by browsers)
KEYCLOAK_EXTERNAL_URL=https://auth.your-domain.com
FRONTEND_URL=https://your-domain.com
```

:::warning
`KEYCLOAK_EXTERNAL_URL` must be the exact URL browsers use to reach Keycloak — it is embedded in JWT tokens as the issuer and validated by the backend. An `http://` vs `https://` mismatch will break authentication.
:::

## All options

See [Environment Variables](../deployment/environment-variables) for the full reference, including storage (local vs S3) and theming options.
