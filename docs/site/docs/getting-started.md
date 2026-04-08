---
sidebar_position: 2
---

# Getting Started

## Prerequisites

- Docker & Docker Compose
- A domain name (for production)

## Quick start

```bash
git clone https://github.com/sE2EEnd/sE2EEnd.git
cd sE2EEnd
cp .env.example .env
```

Edit `.env` with your values, then:

```bash
docker-compose up -d
```

Access the app at `http://localhost:3000`.

:::info
See the [Deployment](./deployment/docker-compose) section for a production-ready setup.
:::
