---
sidebar_position: 4
---

# Reverse Proxy

In production, you should put a reverse proxy in front of sE2EEnd to handle HTTPS termination. Only two ports need to be publicly exposed:

| Public URL | Proxies to | Purpose |
|---|---|---|
| `https://your-domain.com` | `localhost:80` | Frontend + API (via nginx internal proxy) |
| `https://auth.your-domain.com` | `localhost:8090` | Keycloak |

The backend (`:8081`) does **not** need to be exposed publicly — the frontend nginx container forwards `/api/*` requests to it internally.

## Caddy

Caddy handles TLS automatically via Let's Encrypt — no certificate management needed.

```caddy
your-domain.com {
    reverse_proxy localhost:80 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-Proto {http.request.proto}
    }
}

auth.your-domain.com {
    reverse_proxy localhost:8090 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-Proto {http.request.proto}
    }
}
```

Then set in `.env`:

```dotenv
KEYCLOAK_EXTERNAL_URL=https://auth.your-domain.com
FRONTEND_URL=https://your-domain.com
```

## Upload size

The frontend nginx container allows up to **100 MB** per request. If your reverse proxy enforces a lower limit, raise it:

- **Caddy:** no limit by default
- **nginx:** add `client_max_body_size 200M;` to the server block
