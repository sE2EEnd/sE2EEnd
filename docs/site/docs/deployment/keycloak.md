---
sidebar_position: 3
---

# Keycloak

sE2EEnd uses Keycloak as its authentication provider (OAuth2 / OIDC). The repository ships a pre-configured realm that is automatically imported on first boot.

## What the realm includes

- **Realm:** `se2eend`
- **Client:** `se2eend-frontend` (public OIDC client, PKCE enabled)
- **Roles:** `admin` (realm role — grants access to the admin dashboard)
- **Custom login theme:** `se2eend` (branded with your primary colour)

## First-boot import

When the Keycloak container starts for the first time, it:

1. Runs `generate-theme.sh` to compile the login CSS from the colour variables in your `.env`
2. Runs `kc.sh build` to optimise Keycloak for the PostgreSQL adapter
3. Starts Keycloak with `--import-realm` which imports `keycloak/realm-config/se2eend-realm.json`

The realm import is idempotent — on subsequent starts, Keycloak skips it if the realm already exists.

## Admin console

The Keycloak admin console is available at:

```
http://localhost:8090   (development)
https://auth.your-domain.com   (production)
```

Log in with `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD`.

## Managing users

### Create a user

1. Admin console → **se2eend** realm → **Users** → **Add user**
2. Fill in **Username** (required), email, first/last name
3. Save, then go to **Credentials** → **Set password**

### Grant admin access

1. Open the user → **Role mapping** → **Assign role**
2. Search for `admin` and assign it

Users with the `admin` role see the **Admin** menu item in the sidebar and can access `/admin`.

## Production configuration

### Switch to production mode

The default `docker-compose.yml` starts Keycloak with `start-dev`, which is **not suitable for production** — it disables TLS checks, uses an embedded cache, and enables verbose logging.

For production, replace the command in your `docker-compose.yml`:

```yaml
keycloak:
  command:
    - start                          # was: start-dev
    - --optimized
    - --import-realm
    - --spi-login-protocol-openid-connect-legacy-logout-redirect-uri=true
    - --spi-theme-static-max-age=-1
    - --spi-theme-cache-themes=false
```

`start` mode requires a valid hostname and a reverse proxy handling TLS. See the [Keycloak production guide](https://www.keycloak.org/server/configuration-production) for the full checklist (hostname configuration, DB connection pool, cluster setup if needed).

### Expose Keycloak behind a reverse proxy

In production, Keycloak should not be exposed directly. Put it behind nginx or Traefik with HTTPS. Set `KEYCLOAK_EXTERNAL_URL` to the public HTTPS URL.

The Docker Compose configuration already sets:
- `KC_HOSTNAME_STRICT=false` — allows Keycloak to accept requests via the reverse proxy hostname
- `KC_HTTP_ENABLED=true` — allows the reverse proxy to talk to Keycloak over plain HTTP internally
- `KC_HOSTNAME_STRICT_HTTPS=false` — required when TLS is terminated at the proxy

### Example: Keycloak behind nginx

```nginx
server {
    listen 443 ssl;
    server_name auth.your-domain.com;

    ssl_certificate /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;

    location / {
        proxy_pass http://localhost:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then set:
```dotenv
KEYCLOAK_EXTERNAL_URL=https://auth.your-domain.com
```

## Identity federation (SSO / LDAP)

Keycloak supports connecting to external identity providers:

- **LDAP / Active Directory:** Admin console → **User Federation** → **Add LDAP provider**
- **SAML / OIDC SSO:** Admin console → **Identity providers** → add your IdP

After configuration, users from the external directory can log in to sE2EEnd directly. Assign the `admin` role to users/groups as needed.

## Customising the login page

The login page is branded automatically from your colour variables (`THEME_COLOR_PRIMARY`, etc.). These are applied at container startup via `generate-theme.sh`.

To change colours, update your `.env` and recreate the Keycloak container:

```bash
docker compose up -d --force-recreate keycloak
```
