# sE2EEnd — E2EE File Transfer

**Self-hosted, end-to-end encrypted file sharing. The server never sees your keys.**

---

[![GitHub Release](https://img.shields.io/github/v/release/sE2EEnd/sE2EEnd?style=flat)](https://github.com/sE2EEnd/sE2EEnd/releases/latest)
[![AGPL-3.0 Licensed](https://img.shields.io/github/license/sE2EEnd/sE2EEnd?style=flat)](https://github.com/sE2EEnd/sE2EEnd/blob/main/LICENSE)
[![GitHub last commit](https://img.shields.io/github/last-commit/sE2EEnd/sE2EEnd?style=flat)](https://github.com/sE2EEnd/sE2EEnd/commits/main)
[![GitHub issues](https://img.shields.io/github/issues/sE2EEnd/sE2EEnd?style=flat)](https://github.com/sE2EEnd/sE2EEnd/issues)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat)](https://github.com/sE2EEnd/sE2EEnd/blob/main/CONTRIBUTING.md)

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=white&labelColor=20232a)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript&logoColor=white)
![Java](https://img.shields.io/badge/Java-21-ED8B00?style=flat&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3-6DB33F?style=flat&logo=springboot&logoColor=white)
![Keycloak](https://img.shields.io/badge/Keycloak-26-4D4D4D?style=flat&logo=keycloak&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=flat&logo=docker&logoColor=white)

![Dashboard](docs/screenshots/dashboard.png)

<p align="center">
  <img src="docs/screenshots/create_send.png" width="49%" alt="Create send" />
  <img src="docs/screenshots/download.png" width="49%" alt="Download page" />
</p>

---

## Table of contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

---

## Features

- **End-to-end encryption** — Files are encrypted client-side before upload using AES-256-GCM via the Web Crypto API.
- **Zero-knowledge architecture** — The server never sees your encryption keys or plaintext data, even as an administrator.
- **Enterprise-grade auth** — Integrated with [Keycloak](https://github.com/keycloak/keycloak) for OAuth 2.0 / OpenID Connect. Supports federated identity providers (Google, etc.).
- **Password-protected sends** — Add an extra layer of security with a per-transfer password.
- **Granular download limits** — Control file distribution by setting a maximum download count.
- **Time-based auto-expiration** — Files are automatically deleted after a user-defined period.
- **Instant revocation** — Revoke access to any shared file at any time with a single click.

---

## Architecture

sE2EEnd uses **AES-256-GCM** encryption performed entirely in the browser via the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API). The encryption key lives in the URL fragment (`#key`) and is **never sent to the server**.

```mermaid
sequenceDiagram
    participant Sender as Sender (Browser)
    participant Server as Server
    participant Recipient as Recipient (Browser)

    Note over Sender: Upload Flow
    Sender->>Sender: Generate AES-256 key (Web Crypto API)
    Sender->>Sender: Generate random IV (96-bit) per file/text
    Sender->>Sender: Encrypt file content (AES-256-GCM)
    Sender->>Sender: Encrypt filename (AES-256-GCM)
    Sender->>Sender: Encrypt send name (AES-256-GCM)
    Sender->>Sender: Store key locally (IndexedDB)

    Sender->>Server: POST /api/v1/sends {encrypted name, config}
    Server-->>Sender: Send created (accessId)
    Sender->>Server: POST /api/v1/files {encrypted blob, encrypted filename}
    Server-->>Sender: File stored

    Note over Sender: Build share link
    Sender->>Sender: Link = /download/{accessId}#keyBase64url
    Note right of Sender: Key in URL fragment, never sent to server

    Sender->>Recipient: Share link (out-of-band)

    Note over Recipient: Download Flow
    Recipient->>Recipient: Extract key from URL fragment
    Recipient->>Recipient: Import key (base64url to CryptoKey)
    Recipient->>Server: GET /download/{accessId}
    Server->>Server: Validate expiration
    Server->>Server: Validate revocation
    Server->>Server: Validate password (BCrypt)
    Server->>Server: Validate download limit
    Server-->>Recipient: Encrypted blob
    Recipient->>Recipient: Extract IV (first 12 bytes)
    Recipient->>Recipient: Decrypt with AES-256-GCM
    Recipient->>Recipient: Save decrypted file
```

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Tailwind CSS, Vite |
| Backend | Java 21, Spring Boot, Spring Security |
| Auth | Keycloak (OAuth 2.0 / OIDC) |
| Database | PostgreSQL |
| Encryption | AES-256-GCM via Web Crypto API |
| Infrastructure | Docker, Nginx |

---

## Quick start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose

### 1. Clone and configure

```bash
git clone https://github.com/sE2EEnd/sE2EEnd.git
cd sE2EEnd
cp .env.example .env
```

Edit `.env` to set your passwords and URLs (see [`.env.example`](.env.example) for all options).

### 2. Run

```bash
docker compose up -d
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost |
| Backend API | http://localhost:8081 |
| Keycloak | http://localhost:8090 |

### Local development

To build from source instead of pulling images:

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

Or run each service individually:

```bash
# Backend
cd backend && mvn spring-boot:run

# Frontend
cd frontend/core && npm install && npm run dev
```

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

For significant new features, open a [GitHub Discussion](https://github.com/sE2EEnd/sE2EEnd/discussions/new) first.

---

## Security

Please do not report security vulnerabilities through public GitHub issues. See [SECURITY.md](SECURITY.md) for the responsible disclosure process.

---

## License

Licensed under the [AGPL-3.0 License](LICENSE).