<div align="center">

<img src="docs/screenshots/title.svg" alt="sE2EEnd" height="90" />

**Encrypted file transfer, under your control.**

Self-hosted, end-to-end encrypted file sharing.  
The server never sees your files or encryption keys.  
Built for teams who can't compromise on privacy.

[**Website**](https://se2eend.github.io) · [**Documentation**](https://se2eend.github.io/sE2EEnd) · [**Releases**](https://github.com/sE2EEnd/sE2EEnd/releases)

[![GitHub Release](https://img.shields.io/github/v/release/sE2EEnd/sE2EEnd?style=flat)](https://github.com/sE2EEnd/sE2EEnd/releases/latest)
[![AGPL-3.0 Licensed](https://img.shields.io/github/license/sE2EEnd/sE2EEnd?style=flat)](https://github.com/sE2EEnd/sE2EEnd/blob/main/LICENSE)
[![GitHub last commit](https://img.shields.io/github/last-commit/sE2EEnd/sE2EEnd?style=flat)](https://github.com/sE2EEnd/sE2EEnd/commits/main)
[![GitHub issues](https://img.shields.io/github/issues/sE2EEnd/sE2EEnd?style=flat)](https://github.com/sE2EEnd/sE2EEnd/issues)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat)](CONTRIBUTING.md)

![React](https://img.shields.io/badge/React_19-61DAFB?style=flat&logo=react&logoColor=white&labelColor=20232a)
![TypeScript](https://img.shields.io/badge/TypeScript_6-3178C6?style=flat&logo=typescript&logoColor=white)
![Java](https://img.shields.io/badge/Java_25-ED8B00?style=flat&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot_4-6DB33F?style=flat&logo=springboot&logoColor=white)
![Keycloak](https://img.shields.io/badge/Keycloak_26-4D4D4D?style=flat&logo=keycloak&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)

</div>

---

![Dashboard](docs/screenshots/dashboard.png)

<p align="center">
  <img src="docs/screenshots/create_send.png" width="49%" alt="Create a send" />
  <img src="docs/screenshots/download.png" width="49%" alt="Download page" />
</p>

---

## Table of contents

- [How it works](#how-it-works)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Project structure](#project-structure)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

---

## How it works

Encryption and decryption happen entirely in the browser using the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) (AES-256-GCM). The key never leaves the client — it lives in the URL fragment (`#key`) which browsers never include in HTTP requests.

```
Browser (sender)
  └─ AES-256-GCM encrypt(file, key)
       └─ POST /api/sends  ──▶  Backend  ──▶  Storage (ciphertext only)
                                    │
                                    └─▶  PostgreSQL (metadata only)

Share link:  https://your-domain/d/{id}#key
                                        ↑
                               Fragment — never sent to server

Browser (recipient)
  └─ GET /api/sends/{id}  ──▶  fetch ciphertext
       └─ AES-256-GCM decrypt(ciphertext, key from URL fragment)
```

> Even with full access to the database and file storage, an attacker cannot decrypt any file without the URL fragment.

---

## Features

**Privacy & encryption**
- Zero-knowledge architecture — server stores only ciphertext, keys never leave the browser
- AES-256-GCM encryption via the native Web Crypto API
- Password-protected transfers (with built-in secure password generator)

**Transfer controls**
- Share files (single or multiple — auto-zipped) and secret notes/text snippets
- Per-transfer download limits and expiration dates
- Instant revocation from the dashboard at any time
- QR code generation for cross-device sharing

**Authentication & administration**
- Enterprise-grade auth via [Keycloak](https://github.com/keycloak/keycloak) — OAuth2 / OIDC, SSO, LDAP / Active Directory, MFA
- Admin dashboard: manage all transfers, monitor storage usage, view deletion audit logs
- Configurable instance policies (require auth for download, enforce transfer passwords…)

**Deployment & customisation**
- Single `docker compose up` — images are pre-built and published to GHCR
- S3-compatible storage support (AWS, MinIO, Scaleway, OVHcloud…) or local filesystem
- Custom branding: primary colour, logo, app name — all via environment variables, no rebuild needed
- Multi-language UI (English, French — easily extensible)
- Dark mode with automatic system awareness

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript 6 + Vite 8 + ShadcnUI, served by nginx |
| Backend | Spring Boot 4 (Java 25) |
| Auth | Keycloak 26 (OAuth2 / OIDC) |
| Database | PostgreSQL 18 |
| Encryption | Web Crypto API — AES-256-GCM |
| Storage | Local filesystem or any S3-compatible object store |
| Infrastructure | Docker, Docker Compose |

---

## Quick start

### Prerequisites

- **Docker** ≥ 24
- **Docker Compose** ≥ 2.20

No Java, Node.js, or Maven required — images are pulled from GHCR.

### 1. Get the deployment files

You don't need the full source code. Pull only what's needed to run the stack:

```bash
git clone --depth=1 --filter=blob:none --sparse https://github.com/sE2EEnd/sE2EEnd.git
cd sE2EEnd
git sparse-checkout set --no-cone /docker-compose.yml /.env.example /init-databases.sql keycloak/
```

### 2. Configure

```bash
cp .env.example .env
```

For a local test the defaults work as-is. For production, set at minimum:

```dotenv
POSTGRES_PASSWORD='<random 32+ chars>'
KEYCLOAK_ADMIN_PASSWORD='<random 32+ chars>'
KEYCLOAK_EXTERNAL_URL=https://auth.your-domain.com   # must match what browsers use
FRONTEND_URL=https://your-domain.com
```

See the [Environment Variables reference](https://se2eend.github.io/sE2EEnd/docs/deployment/environment-variables) for all options (storage, theming, instance policies).

### 3. Start

```bash
docker compose up -d
```

Docker Compose pulls the images and starts PostgreSQL, then Keycloak (which imports the realm on first boot), then the backend and frontend.

> Wait ~30 seconds on first boot for Keycloak to complete the realm import, then open `http://localhost`.

### Updating

```bash
docker compose pull && docker compose up -d
```

### Service URLs (default)

| Service | URL |
|---|---|
| Frontend | http://localhost |
| Backend API | http://localhost:8081 |
| Keycloak | http://localhost:8090 |

---

## Project structure

```
sE2EEnd/
├── backend/                  # Spring Boot application
│   └── src/main/java/fr/se2eend/backend/
├── frontend/
│   └── core/                 # React + Vite SPA
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── locales/      # i18n — en/ and fr/
│       │   └── contexts/
│       └── public/
├── keycloak/
│   ├── realm-config/         # Realm JSON (auto-imported on first boot)
│   └── themes/se2eend/       # Custom login theme
├── docs/
│   └── site/                 # Docusaurus documentation site
└── docker-compose.yml
```

---

## Contributing

Contributions are welcome — bug fixes, features, docs, and translations.

> **Explore the codebase faster:** [DeepWiki](https://deepwiki.com/sE2EEnd/sE2EEnd) provides an AI-generated map of the repository, useful for understanding how components fit together before diving in.

### Development setup

**Prerequisites:** Docker & Docker Compose, Java 21 + Maven, Node.js 20+

```bash
git clone https://github.com/sE2EEnd/sE2EEnd.git
cd sE2EEnd
cp .env.example .env

# Start infrastructure (Keycloak + PostgreSQL)
docker compose up -d postgres keycloak
# Wait ~30s for Keycloak first-run import

# Backend (in a separate terminal)
cd backend && mvn spring-boot:run

# Frontend (in a separate terminal)
cd frontend/core && npm install && npm run dev
# → http://localhost:3001
```

### Tests & lint

```bash
# Backend tests
cd backend && mvn clean test

# Frontend lint + build
cd frontend/core && npm run lint && npm run build
```

### Submitting changes

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-improvement`
3. Open a pull request against `main`

For larger changes, open an [issue](https://github.com/sE2EEnd/sE2EEnd/issues) first to discuss the approach. Please keep PRs focused — one feature or fix per PR.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

---

## Security

Please do not report security vulnerabilities through public GitHub issues.  
See [SECURITY.md](SECURITY.md) for the responsible disclosure process.

---

## License

Licensed under the [AGPL-3.0 License](LICENSE).