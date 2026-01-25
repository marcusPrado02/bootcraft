# Bootcraft

Bootcraft is an opinionated CLI to bootstrap **senior-grade microservices**
following Clean Architecture, DDD, Hexagonal Architecture, and modern
engineering best practices.

## Goals
- Enforce a golden path for microservices
- Generate production-ready foundations, not demos
- Make architectural decisions explicit and auditable

## Status
🚧 Work in progress (MVP)

## CLI
```bash
bootcraft init
bootcraft doctor
```

## Architecture & Conventions

Bootcraft follows Clean Architecture and Hexagonal (Ports & Adapters) patterns.
For detailed documentation on:

- **Core concepts**: Pack, Archetype, Baseline, Preset, Capability, Step
- **Generated project structure**: Where domain, application, infrastructure, and interface code lives
- **Naming conventions**: ID formats, versioning policy, path locations
- **Generation pipeline**: How Bootcraft applies packs in order

See **[docs/bootcraft-conventions.md](./docs/bootcraft-conventions.md)**
