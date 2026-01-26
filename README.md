# sE2EEnd - E2EE File Transfer

**File transfer solution with end-to-end encryption.**

---

[![GitHub Release](https://img.shields.io/github/v/release/sE2EEnd/sE2EEnd?style=flat)](https://github.com/sE2EEnd/sE2EEnd/releases/latest)
[![AGPL-3.0 Licensed](https://img.shields.io/github/license/sE2EEnd/sE2EEnd?style=flat)](https://github.com/sE2EEnd/sE2EEnd/blob/main/LICENSE) <br>

## Features

- **E2EE encryption** : All files are encrypted client-side before upload using industry-standard algorithms.
- **Zero-Knowledge Architecture** : the server never sees your encryption keys. Your data remain private and unreadable to anyone else, even the administrator.
- **Enterprise-Grade Auth** : Integrated with [Keycloak](https://github.com/keycloak/keycloak) for OAuth 2.0 and OpenID Connect Authentication.
- **Password-protected Sends** : Add an extra layer of security by requiring a custom password for each transfer.
- **Granular Download Limits** : Controle file distribution by setting a download limit.
- **Time-based auto-expiration** : Files are automatically wiped out from the server after a user-defined period. 
- **Instant Revocation** : Revoke access to any shared file at any time with a single click.

## Usage

### Prerequisites

* Java 21
* Keycloak instance
* MySQL / PostgreSQL

### Quick start

#### 1. Configuration

1. Clone the repository
2. Configure .`env` file with [`.env.example`](.env.example)

#### 2. Infrastructure (Docker)

The easiest way to get the environment ready (Database + Identity Provider) is using Docker :

```bash
docker-compose up -d
```

#### 3. Backend

```bash
cd backend

mvn clean install

mvn spring-boot:run
```

#### 4. Frontend

```bash
cd frontend/core

npm install

npm run dev
```


## License

The project is licensed under the AGPL-3.0 License. See the [LICENSE](LICENSE) file for details.
