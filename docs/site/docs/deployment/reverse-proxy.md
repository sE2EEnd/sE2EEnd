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

Large files are uploaded in **chunks**, so the nginx `client_max_body_size` limit (default **100 MB**) applies **per chunk**, not to the whole file — the total transfer size is effectively unbounded (capped only by the `max_upload_size_bytes` instance setting, see [Instance Settings](../configuration/instance-settings)). Any reverse proxy in front must allow a single chunk through (≥ 100 MB), but does not need to allow the full file size.

- **Caddy:** no request body limit by default
- **nginx:** keep `client_max_body_size` at least at the chunk size (e.g. `client_max_body_size 100M;`)

## Streaming downloads

Downloads are streamed to disk through a service worker, so the response must not be buffered by an intermediary. If you put **nginx** in front of the backend, disable buffering on the download route so bytes flow through in real time:

```nginx
location ~ ^/api/.*/download$ {
    proxy_pass http://backend;
    proxy_buffering off;
}
```

Caddy and Traefik stream responses by default — nothing to do.

:::note Split deployments (SPA and API on different origins)
The streaming download still works when the SPA and API are on different origins (the service worker is same-origin with the SPA — only the `fetch` to the API is cross-origin). The download **progress bar**, however, needs the backend to expose `Content-Length` over CORS. sE2EEnd's backend already sends `Access-Control-Expose-Headers: Content-Length`; if you front the API with your own proxy, don't strip that header.
:::
