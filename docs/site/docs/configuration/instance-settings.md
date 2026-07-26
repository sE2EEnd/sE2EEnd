---
sidebar_position: 3
---

# Instance Settings

Instance-wide settings are stored in the `instance_settings` table (simple key/value) and can be changed **at runtime from the Admin dashboard** (Settings panel) — no restart or redeploy needed. Defaults are seeded by database migrations.

| Key                         | Default              | Description                                                                                                                                                                                       |
|-----------------------------|----------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `max_upload_size_bytes`     | `2147483648` (2 GiB) | Maximum upload size (plaintext). `0` disables the limit. Enforced **incrementally on every chunk**, before anything is written to storage (see [Large files](../architecture#large-files)).       |
| `require_send_password`     | `false`              | When `true`, every new send **must** have a password (enforced at creation).                                                                                                                      |
| `require_auth_for_download` | `true`               | When `true`, recipients must be authenticated before downloading. Surfaced to the SPA via the public config.                                                                                      |
| `cleanup_cron`              | `0 0 2 * * *`        | Spring cron expression for the cleanup scheduler — deletes expired / revoked / exhausted sends and their files, and prunes stale upload sessions. Set to empty or `disabled` to turn cleanup off. |

:::note
`max_upload_size_bytes` is a **plaintext** size limit. The stored ciphertext is marginally larger (a 28-byte IV + GCM tag per 25 MB chunk), so the effective cap is applied very slightly below the configured value — negligible in practice.
:::

:::warning
Leaving `cleanup_cron` empty (or `disabled`) means expired/revoked sends and abandoned upload sessions are **never** cleaned up automatically, and their files accumulate on disk. Keep a cleanup schedule enabled in production.
:::

## Changing a setting

Open the **Admin dashboard → Settings**, edit the value, and save. Changes take effect immediately for subsequent requests.
