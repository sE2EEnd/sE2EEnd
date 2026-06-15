---
slug: /
sidebar_position: 1
---

# Introduction

**sE2EEnd** is an open-source, self-hosted file transfer platform with end-to-end encryption. The server never sees encryption keys or plaintext data — encryption and decryption happen entirely in the browser using the native **Web Crypto API** (AES-256-GCM).

## Key features

- **Zero-knowledge architecture** — the server stores only ciphertext; the encryption key lives only in the URL fragment, never sent to the server
- **File and text transfers** — share files (single or multiple, auto-zipped) or plaintext/secret notes
- **Large files** — multi-gigabyte transfers, uploaded and downloaded in encrypted chunks streamed to/from disk, so the whole file is never buffered in memory (client or server)
- **Enterprise authentication** via Keycloak (OAuth2 / OIDC) — supports SSO, LDAP federation, MFA
- **Password-protected transfers** — optional second factor on top of the encryption key, with built-in secure password generation
- **Per-transfer download limits and expiration dates**
- **Instant revocation** from the dashboard
- **Admin dashboard** — manage all transfers, storage usage, instance settings
- **Multi-language UI** (EN, FR)
- **Customisable branding** — primary colour, logo, app name via environment variables
- **S3-compatible storage** — local filesystem or any S3-compatible object store (AWS, MinIO, Scaleway, OVHcloud…)

## How it works

```
Browser (sender)
  └─ AES-256-GCM encrypt, chunk by chunk (~25 MB)
       └─ PUT /api/v1/files/chunked/…  ──▶  Backend  ──▶  Storage (ciphertext only)
                                              │
                                              └─▶  PostgreSQL (metadata only)

Share link:  https://your-domain/download/{accessId}#key
                                                   ↑
                                   Fragment — never sent to server

Browser (recipient)
  └─ GET /api/v1/sends/{accessId}/download  ──▶  fetch ciphertext (streamed)
       └─ AES-256-GCM decrypt  →  Service Worker  →  saved to disk
```

## Stack

| Layer      | Technology                               |
|------------|------------------------------------------|
| Frontend   | React 19 + Vite 8 + ShadcnUI, served by nginx |
| Backend    | Spring Boot 4 (Java 25)                        |
| Auth       | Keycloak 26                                    |
| Database   | PostgreSQL 18                                  |
| Encryption | Web Crypto API — AES-256-GCM             |
| Storage    | Local filesystem or S3-compatible        |

## License

sE2EEnd is published under the [AGPL-3.0](https://github.com/sE2EEnd/sE2EEnd/blob/main/LICENSE) license.
