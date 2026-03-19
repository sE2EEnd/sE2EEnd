# AGENTS.md — Context for AI Agents

> This file is the AI equivalent of README.md. If you are an AI agent working on this repository, read this file first.

---

## What is sE2EEnd?

**sE2EEnd** is an open-source, end-to-end encrypted (E2EE) file transfer solution. The core invariant: **the server never sees encryption keys or plaintext data**. Encryption happens entirely in the browser using the native Web Crypto API (AES-256-GCM). The server stores only ciphertext and metadata.

Key capabilities:
- E2EE file transfers (AES-256-GCM, client-side only)
- Enterprise authentication via Keycloak (OAuth2 / OIDC)
- Password-protected transfers
- Per-transfer download limits and expiration dates
- Instant revocation
- Admin dashboard
- Multi-language UI (EN, FR)

**License:** AGPL-3.0

---

## Architecture Overview

```
Browser (React)
  ├── Encrypts files locally (Web Crypto API)
  ├── Authenticates via Keycloak (JWT Bearer)
  └── Sends ciphertext to backend

Backend (Spring Boot)
  ├── Stores ciphertext + file metadata
  ├── Validates JWTs (via Keycloak JWKS)
  └── Exposes REST API at /api/v1

Keycloak
  └── Identity Provider (OAuth2/OIDC, realm: se2eend)

PostgreSQL
  └── Persists sends + file metadata
```

**Key architectural rule:** The backend must never decrypt data. Any change that causes the server to handle plaintext or encryption keys violates the zero-knowledge guarantee.

---

## Tech Stack

| Layer        | Technology                                   |
|--------------|----------------------------------------------|
| Backend      | Java 21, Spring Boot 3.5.6, Maven 3.9        |
| Database     | PostgreSQL 18.1, Spring Data JPA / Hibernate |
| Security     | Spring Security, OAuth2 Resource Server, JWT |
| API Docs     | SpringDoc OpenAPI (Swagger UI at `/swagger-ui.html`) |
| Frontend     | React 19, TypeScript 5, Vite 7               |
| Styling      | Tailwind CSS 3.4                             |
| Auth (FE)    | @react-keycloak/web + keycloak-js            |
| HTTP Client  | Axios (with JWT interceptor)                 |
| i18n         | i18next (EN + FR)                            |
| Crypto       | Web Crypto API (browser-native, no lib)      |
| IdP          | Keycloak 26.5                                |
| Containers   | Docker + Docker Compose                      |
| CI/CD        | GitHub Actions → GHCR                        |

---

## Repository Structure

```
sE2EEnd/
├── backend/                          # Spring Boot application
│   └── src/main/java/fr/se2eend/backend/
│       ├── controller/               # REST endpoints
│       ├── service/                  # Business logic
│       ├── model/                    # JPA entities
│       ├── repository/               # Spring Data repos
│       ├── dto/                      # Request/response DTOs
│       ├── config/                   # Security, CORS, OpenAPI
│       ├── storage/                  # File storage abstraction
│       ├── scheduler/                # Cleanup cron (daily at 2 AM)
│       └── exception/                # Custom exceptions
├── frontend/core/                    # React application
│   └── src/
│       ├── features/                 # upload/, download/, dashboard/, admin/, profile/
│       ├── components/               # Shared components
│       ├── lib/
│       │   ├── crypto.ts             # ALL encryption logic lives here
│       │   └── sendKeysDB.ts         # Local key persistence (IndexedDB)
│       ├── services/api.ts           # Axios client + JWT interceptor
│       ├── contexts/                 # ThemeContext
│       ├── hooks/
│       └── locales/en/ + locales/fr/ # i18n translations
├── keycloak/
│   ├── realm-config/                 # Realm import JSON
│   └── themes/                       # Custom Keycloak theme CSS
├── docs/
│   └── encryption-flow.mermaid       # E2EE flow diagram (read this)
├── .github/workflows/
│   ├── backend.yml                   # CI: Maven build + tests
│   ├── frontend.yml                  # CI: lint + build
│   └── release.yml                   # Release: Docker → GHCR
├── docker-compose.yml                # Dev environment
├── .env.example                      # All required env vars
├── README.md                         # Human-facing documentation
├── CONTRIBUTING.md
├── SECURITY.md
└── CODE_OF_CONDUCT.md
```

---

## Running the Project Locally

### Prerequisites
- Java 21
- Node.js 25+
- Docker & Docker Compose

### 1. Configure environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 2. Start infrastructure (PostgreSQL + Keycloak)

```bash
docker-compose up -d
```

Services started:
- PostgreSQL on port `5432`
- Keycloak on port `8090`

### 3. Run backend

```bash
cd backend
mvn spring-boot:run
# Starts on port 8081
# Swagger UI: http://localhost:8081/swagger-ui.html
```

### 4. Run frontend

```bash
cd frontend/core
npm install
npm run dev
# Starts on port 3000, proxies /api → http://localhost:8081
```

### 5. Access

- App: `http://localhost:3000`
- Keycloak admin: `http://localhost:8090`
- Swagger: `http://localhost:8081/swagger-ui.html`

---

## Running Tests

### Backend

```bash
cd backend
mvn test
```

Tests use H2 in-memory database. Key test classes:
- `SendExpirationAndRevocationTest`
- `SendPasswordProtectionTest`
- `SendDownloadLimitTest`
- `SE2EEndApplicationTests`

### Frontend

```bash
cd frontend/core
npm run lint    # ESLint
npm run build   # Type check + build
```

There are currently no frontend unit tests (only lint + build check in CI).

---

## API Design

**Base URL:** `/api/v1`

**Authentication:** Bearer JWT (from Keycloak). The frontend injects it automatically via Axios interceptor in `services/api.ts`.

### Public routes (no auth required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/sends/{accessId}` | Get send metadata |
| GET | `/api/v1/sends/{accessId}/download` | Download file list |
| GET | `/api/v1/files/{fileId}` | Download a file (ciphertext) |
| GET | `/api/v1/config/theme` | Get theme configuration |

### Protected routes (JWT required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/sends` | List user's sends |
| POST | `/api/v1/sends` | Create a new send |
| DELETE | `/api/v1/sends/{id}` | Delete / revoke a send |
| POST | `/api/v1/files` | Upload encrypted file |
| GET | `/api/v1/admin/*` | Admin operations |

---

## Database Schema

### `sends` table

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Internal ID |
| access_id | VARCHAR (unique) | 22-char public identifier |
| owner_id / owner_name / owner_email | VARCHAR | From JWT claims |
| type | ENUM | FILE or TEXT |
| encrypted_metadata | TEXT | Client-side encrypted |
| expires_at | TIMESTAMP | Nullable |
| max_downloads / download_count | INT | Download limiting |
| password_protected | BOOLEAN | |
| password_hash | VARCHAR | BCrypt |
| revoked | BOOLEAN | |
| created_at | TIMESTAMP | |

### `files` table

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| send_id | UUID (FK) | |
| filename | VARCHAR | Original filename |
| storage_path | VARCHAR | Path in `/app/uploads/` |
| size_bytes | BIGINT | |
| checksum | VARCHAR | |

---

## E2EE Implementation — Critical Context

**All crypto code lives in `frontend/core/src/lib/crypto.ts`.**

- Algorithm: AES-256-GCM
- Key generation: `crypto.subtle.generateKey`
- The encryption key is serialized and placed in the **URL fragment** (`#key=...`) — it is never sent to the server
- `sendKeysDB.ts` persists keys locally (IndexedDB) so the sender can re-access their own sends
- `encrypted_metadata` in the database is ciphertext — the server cannot read filenames or other metadata

**When working on upload/download flows, always verify that encryption keys do not appear in request bodies, headers, or server logs.**

---

## Security Configuration

- **Sessions:** Stateless (JWT only, no server-side sessions)
- **CSRF:** Disabled (stateless API)
- **CORS:** Configurable via environment variable
- **Security headers:** CSP (strict), `X-Frame-Options: DENY`, HSTS (31536000s)
- **Password hashing:** BCrypt

Relevant file: `backend/src/main/java/fr/se2eend/backend/config/SecurityConfig.java`

---

## Code Conventions

### Backend (Java/Spring Boot)

- Package root: `fr.se2eend.backend`
- Lombok is used extensively: `@Getter`, `@Setter`, `@Builder`, `@RequiredArgsConstructor`, etc.
- DTOs for all request/response objects — never expose entities directly
- Custom exceptions in `exception/` package
- Spring Security context used to extract the current user (not a custom thread-local)
- OpenAPI annotations on controllers (`@Operation`, `@Tag`)

### Frontend (TypeScript/React)

- Functional components only (no class components)
- React Context API for shared state (no Redux or Zustand)
- Tailwind CSS utility classes — no CSS modules, no inline styles
- All API calls go through `services/api.ts` — do not call `fetch` directly
- i18n: use `t('key')` from `useTranslation()` — never hardcode user-facing strings
- Add translations for both `locales/en/` and `locales/fr/` when adding new strings
- TypeScript strict mode — do not use `any`

---

## CI/CD

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| `backend.yml` | Push/PR on `backend/**` | `mvn clean install` |
| `frontend.yml` | Push/PR on `frontend/**` | lint + `npm run build` |
| `release.yml` | Tag push (`v*`) | Build + push Docker images to GHCR |

Docker images published to:
- `ghcr.io/se2eend/se2eend-backend:{version}`
- `ghcr.io/se2eend/se2eend-frontend:{version}`

---

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Description |
|----------|-------------|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` | Database credentials |
| `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD` | Keycloak admin |
| `KEYCLOAK_EXTERNAL_URL` | Public Keycloak URL (used by frontend) |
| `FRONTEND_URL` | Allowed CORS origin for backend |
| `THEME_COLOR_PRIMARY` | Brand color (hex) |

Frontend build-time env vars (Vite `VITE_*`):
- `VITE_KEYCLOAK_URL`
- `VITE_KEYCLOAK_REALM`
- `VITE_KEYCLOAK_CLIENT_ID`

---

## What NOT to Do

- **Do not move encryption to the backend.** The zero-knowledge guarantee is the core value proposition.
- **Do not expose JPA entities in API responses.** Always use DTOs.
- **Do not add user-facing strings without i18n keys** in both EN and FR.
- **Do not add `any` types in TypeScript** — use proper types or generics.
- **Do not store session tokens server-side** — the app is intentionally stateless.
- **Do not skip CI checks** — both lint and tests must pass before merging.