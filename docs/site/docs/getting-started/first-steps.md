---
sidebar_position: 4
---

# First Steps

## Log in

Navigate to `http://localhost` (or your domain). You'll be redirected to the Keycloak login page.

The default admin credentials are:
- **Username:** `admin` (or the value of `KEYCLOAK_ADMIN`)
- **Password:** the value of `KEYCLOAK_ADMIN_PASSWORD`

:::warning
Change the admin password and create dedicated user accounts before exposing the instance publicly.
:::

## Create a user

1. Open the Keycloak admin console at `http://localhost:8090`
2. Select the **se2eend** realm
3. Go to **Users → Add user**, fill in username and email, save
4. Go to **Credentials → Set password**

To grant admin access, go to **Role mapping → Assign role** and assign the `admin` role.

## Send your first file

1. Log in to sE2EEnd with your user account
2. Click **Upload** in the sidebar
3. Drop a file or enter a text note
4. Configure expiration, download limit, and optional password
5. Click **Upload** — a share link is generated
6. Copy the link and send it to your recipient

The link contains the encryption key in the URL fragment (`#key`). The server never sees it.

## Next steps

- [Docker Compose reference](../deployment/docker-compose) — production setup
- [Reverse Proxy](../deployment/reverse-proxy) — HTTPS with nginx or Traefik
- [Keycloak](../deployment/keycloak) — SSO, LDAP, production mode
- [Theming](../configuration/theming) — custom colours and logo
