# {{projectName}}

{{projectDescription}}

> Bootstrapped with [Bootcraft](https://github.com/your-org/bootcraft) — golden path enforcer for senior-grade microservices.

---

## Architecture

This service follows **Clean Architecture** with **Hexagonal (Ports & Adapters)** principles.

```
src/
├── domain/         # Core business logic — zero external dependencies
│   ├── entities/
│   ├── value-objects/
│   ├── repositories/   # Repository interfaces (ports)
│   ├── services/
│   └── events/
├── app/            # Application layer — use cases, orchestration
│   ├── use-cases/
│   ├── commands/
│   ├── queries/
│   └── ports/      # Secondary ports (driven adapter interfaces)
├── infra/          # Infrastructure — implements ports, external concerns
│   ├── config/
│   ├── logging/
│   └── http-client/
└── interfaces/     # Primary adapters — drives the application
    └── http/
```

### Dependency Rule

> All dependencies point **inward**. Domain knows nothing about infra or interfaces.

| Layer       | Can depend on     |
|-------------|-------------------|
| `domain`    | nothing           |
| `app`       | `domain`          |
| `infra`     | `domain`, `app`   |
| `interfaces`| `app`, `infra`    |

---

## Architecture Decisions

Initial decisions are documented in `docs/architecture/`:

- [ADR-0001 – Initial Architecture](docs/architecture/ADR-0001-initial-architecture.md)

---

## Getting Started

```bash
cp .env.example .env
npm install
npm run dev
```

---

## Health Endpoints

| Endpoint  | Purpose                              |
|-----------|--------------------------------------|
| `GET /health` | Liveness — is the service running? |
| `GET /ready`  | Readiness — is the service ready to serve traffic? |

---

## Generation State

This project was bootstrapped by Bootcraft. See `.bootcraft/state.json` for the full generation history including applied packs, versions, and capabilities.
