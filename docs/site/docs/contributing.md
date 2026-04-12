---
sidebar_position: 6
---

# Contributing

Contributions are welcome — bug fixes, new features, documentation improvements, and translations.

:::tip Explore the codebase
[DeepWiki](https://deepwiki.com/sE2EEnd/sE2EEnd) provides an AI-generated, always up-to-date map of the repository — useful for quickly understanding how components fit together before diving in.
:::

## Development setup

### Prerequisites

- Docker & Docker Compose (for the full stack)
- Java 25 + Maven (backend)
- Node.js 20+ (frontend and docs site)

### Start the full stack locally

```bash
git clone https://github.com/sE2EEnd/sE2EEnd.git
cd sE2EEnd
cp .env.example .env
docker compose up -d postgres keycloak
```

Wait for Keycloak to finish its first-run import (~30s), then start the backend and frontend in dev mode:

```bash
# Backend
cd backend
mvn spring-boot:run

# Frontend
cd frontend/core
npm install
npm run dev
```

The frontend dev server runs on `http://localhost:3001` and proxies `/api/*` to the backend.

### Run backend tests

```bash
cd backend
mvn clean test
```

### Lint and build frontend

```bash
cd frontend/core
npm run lint
npm run build
```

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
│       └── public/           # Static assets
├── keycloak/
│   ├── realm-config/         # Realm JSON (imported on first boot)
│   └── themes/se2eend/       # Custom login theme
├── docs/
│   └── site/                 # This Docusaurus site
└── docker-compose.yml
```

## Adding a translation

Translation files are in `frontend/core/src/locales/{lang}/translation.json`.

To add a new language:

1. Copy `en/translation.json` to `{lang}/translation.json`
2. Translate all values
3. Add the language to `i18n` in `frontend/core/src/i18n.ts`
4. Add it to the `LanguageSwitcher` component

## CI

The repository uses GitHub Actions:

| Workflow         | Trigger                  | What it does                                                                                              |
|------------------|--------------------------|-----------------------------------------------------------------------------------------------------------|
| `release.yml`    | Push `v*` tag            | Tests, builds Docker images, publishes to GHCR, packages frontend as a static zip, creates GitHub Release |
| `backend.yml`    | Push to `main` or PR     | Runs backend tests                                                                                        |
| `frontend.yml`   | Push to `main` or PR     | Lints and builds the frontend                                                                             |
| `docs-pages.yml` | Push to `main` or manual | Builds and deploys this Docusaurus site to GitHub Pages                                                   |

## Submitting changes

1. Fork the repository
2. Create a branch: `git checkout -b feature/the-best-improvement`
3. Commit your changes
4. Open a pull request against `main`

Please keep PRs focused — one feature or fix per PR makes review easier.

For larger changes, open an issue first to discuss the approach.
