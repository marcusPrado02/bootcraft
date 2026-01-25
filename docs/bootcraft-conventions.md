# Bootcraft Conventions

> **Version:** 0.1.0
> **Status:** Living document — updated as Bootcraft evolves
> **Last updated:** 2026-01-25

This document defines the core concepts, project structure, naming conventions, and generation flow for Bootcraft. It serves as the **source of truth** for all Bootcraft-related terminology and behavior.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Glossary / Core Concepts](#2-glossary--core-concepts)
3. [Standard Generated Project Structure](#3-standard-generated-project-structure)
4. [Naming & Versioning Conventions](#4-naming--versioning-conventions)
5. [Generation Flow](#5-generation-flow)
6. [Examples](#6-examples)

---

## 1. Overview

**Bootcraft** is an opinionated CLI that generates **senior-grade microservice foundations**. It produces production-ready project scaffolds — not demos or tutorials — by applying:

- **Clean Architecture** (domain-centric layers with clear boundaries)
- **Hexagonal Architecture** (Ports & Adapters pattern)
- **Domain-Driven Design** (DDD) building blocks
- **Modern engineering practices** (testing pyramid, observability, CI/CD readiness)

### What Bootcraft Generates

Bootcraft generates a complete microservice baseline that includes:

- A domain-centric folder structure following Clean/Hexagonal principles
- Opinionated technology stacks selected via **Packs** and **Archetypes**
- Test scaffolding across the testing pyramid
- Documentation templates (architecture decision records, API specs)
- A `.bootcraft/state.json` file tracking generation history

### Design Philosophy

1. **Opinionated, not flexible**: Bootcraft makes decisions so teams don't have to debate boilerplate.
2. **Composition over configuration**: Combine Packs to build the exact stack you need.
3. **Auditability**: Every generation is recorded in state, making it traceable.
4. **Doctor-verified**: No generation completes without passing the `doctor` command.

---

## 2. Glossary / Core Concepts

### Pack

**Definition**: A Pack is a versioned, self-contained unit of generation logic that produces files, configurations, or scaffolding in a target project.

**Purpose**: Packs are the atomic building blocks of Bootcraft. They encapsulate knowledge about how to set up a specific concern (e.g., PostgreSQL persistence, Kafka messaging, REST API).

**Example**:
A `persistence-postgres` pack generates:
- Database connection configuration
- Repository interfaces in `src/domain`
- PostgreSQL adapter implementation in `src/infra`
- Database migrations folder structure
- Integration test utilities

### Archetype

**Definition**: An Archetype is a pre-configured combination of Packs representing a common service pattern.

**Purpose**: Archetypes provide quick-start blueprints for common service types, reducing decision fatigue while still allowing customization.

**Example**:
A `rest-api-postgres` archetype might bundle:
- `baseline` (mandatory)
- `stack-typescript-node`
- `persistence-postgres`
- `interface-rest`
- `docs-openapi`

### Baseline Pack

**Definition**: The Baseline Pack is the **mandatory, always-applied** pack that establishes the core project structure and Clean Architecture skeleton.

**Purpose**: Ensures every Bootcraft project has a consistent foundation regardless of which optional packs are added. The baseline is non-negotiable.

**Example**:
The baseline pack generates:
- Core folder structure (`src/domain`, `src/app`, `src/infra`, `src/interfaces`)
- Root configuration files (`package.json`, `tsconfig.json`, `.gitignore`)
- `.bootcraft/state.json` initialized with baseline metadata
- Basic README template

### Preset

**Definition**: A Preset is a curated set of default values and configuration choices within a Pack or Archetype.

**Purpose**: Presets allow the same Pack to behave differently in different contexts without forking the Pack itself.

**Example**:
The `persistence-postgres` pack might have presets:
- `minimal`: Just connection + one repository example
- `full`: Migrations, seeders, connection pooling, health checks

### Capability

**Definition**: A Capability is a discrete, self-contained feature or behavior that a Pack can provide.

**Purpose**: Capabilities allow fine-grained control over what a Pack generates, enabling teams to opt-in or opt-out of specific features.

**Example**:
The `baseline` pack might expose capabilities:
- `health-endpoint`: Generates `/health` and `/ready` endpoints
- `graceful-shutdown`: Adds shutdown hooks
- `structured-logging`: Configures JSON logging

### Step

**Definition**: A Step is a single, atomic unit of work within a Pack's generation process.

**Purpose**: Steps provide visibility into what a Pack is doing and enable resumable/debuggable generation.

**Example**:
The `persistence-postgres` pack might have steps:
1. `create-config`: Generate `src/infra/database/config.ts`
2. `create-repository-interface`: Generate `src/domain/repositories/base.ts`
3. `create-postgres-adapter`: Generate `src/infra/database/postgres-adapter.ts`
4. `create-migrations-folder`: Create `migrations/` directory

---

## 3. Standard Generated Project Structure

Every Bootcraft-generated project follows this canonical structure:

```
<project-root>/
├── src/
│   ├── domain/                 # Core business logic (no external dependencies)
│   │   ├── entities/           # Domain entities and aggregates
│   │   ├── value-objects/      # Immutable value objects
│   │   ├── repositories/       # Repository interfaces (ports)
│   │   ├── services/           # Domain services
│   │   └── events/             # Domain events
│   │
│   ├── app/                    # Application layer (use cases, orchestration)
│   │   ├── use-cases/          # Application services / use cases
│   │   ├── commands/           # Command handlers (CQRS write side)
│   │   ├── queries/            # Query handlers (CQRS read side)
│   │   └── ports/              # Secondary ports (driven adapters interfaces)
│   │
│   ├── infra/                  # Infrastructure layer (adapters, external concerns)
│   │   ├── database/           # Database adapters (implements repository interfaces)
│   │   ├── messaging/          # Message broker adapters
│   │   ├── http-client/        # External API clients
│   │   ├── config/             # Configuration loading
│   │   └── logging/            # Logging infrastructure
│   │
│   └── interfaces/             # Primary adapters (driving adapters)
│       ├── http/               # REST/GraphQL controllers
│       ├── grpc/               # gRPC service implementations
│       ├── cli/                # CLI commands
│       └── events/             # Event consumers
│
├── tests/
│   ├── unit/                   # Fast, isolated unit tests
│   ├── slice/                  # Vertical slice tests (use case + adapter)
│   ├── contract/               # Consumer-driven contract tests
│   └── integration/            # Full integration tests
│
├── docs/
│   ├── architecture/           # ADRs (Architecture Decision Records)
│   └── api/                    # API documentation (OpenAPI, AsyncAPI)
│
├── migrations/                 # Database migrations (if persistence pack applied)
│
├── .bootcraft/
│   └── state.json              # Generation state and history
│
├── package.json                # (or equivalent for other stacks)
├── tsconfig.json               # (for TypeScript stacks)
├── .env.example                # Environment variable template
├── .gitignore
└── README.md
```

### Layer Descriptions

| Folder | Purpose | Dependencies Allowed |
|--------|---------|---------------------|
| `src/domain` | Pure business logic. Entities, value objects, domain services. **Zero external dependencies.** | None (only language primitives) |
| `src/app` | Application services orchestrating domain logic. Defines ports for infrastructure needs. | `domain` only |
| `src/infra` | Adapters implementing ports defined in `domain` and `app`. Contains all external dependencies. | `domain`, `app`, external libraries |
| `src/interfaces` | Primary adapters that drive the application (HTTP controllers, CLI, event consumers). | `app`, `infra` (for wiring) |

### Architectural Principles

**Clean Architecture / Hexagonal (Ports & Adapters)**:

```
                    ┌─────────────────────────────────────────┐
                    │            INTERFACES                   │
                    │   (HTTP, gRPC, CLI, Event Consumers)    │
                    │           [Primary Adapters]            │
                    └─────────────────┬───────────────────────┘
                                      │ drives
                                      ▼
                    ┌─────────────────────────────────────────┐
                    │              APP (Use Cases)            │
                    │        [Application Services]           │
                    │                                         │
                    │    ┌─────────────────────────────┐      │
                    │    │         DOMAIN              │      │
                    │    │  (Entities, Value Objects,  │      │
                    │    │   Domain Services, Events)  │      │
                    │    │        [Core Logic]         │      │
                    │    └─────────────────────────────┘      │
                    │                                         │
                    └─────────────────┬───────────────────────┘
                                      │ uses (via ports)
                                      ▼
                    ┌─────────────────────────────────────────┐
                    │              INFRA                      │
                    │   (Database, Messaging, HTTP Clients)   │
                    │          [Secondary Adapters]           │
                    └─────────────────────────────────────────┘
```

**Key rules**:
1. **Domain is king**: All dependencies point inward toward domain
2. **Ports are interfaces**: Domain defines what it needs; infra provides implementations
3. **Adapters are replaceable**: Swap PostgreSQL for MongoDB without touching domain
4. **Interfaces drive, Infra is driven**: Primary adapters initiate; secondary adapters respond

---

## 4. Naming & Versioning Conventions

### Identifiers

| Identifier | Format | Uniqueness | Example |
|------------|--------|------------|---------|
| `packId` | `kebab-case` | Unique within registry | `persistence-postgres` |
| `archetypeId` | `kebab-case` | Unique within registry | `rest-api-postgres` |
| `capabilityId` | `kebab-case` | Unique within pack | `health-endpoint` |
| `stepId` | `kebab-case` | Unique within pack | `create-config` |

**Rules**:
- Use lowercase letters, numbers, and hyphens only
- Start with a letter, not a number
- No consecutive hyphens (`--`)
- Maximum length: 64 characters

### Versioning

Bootcraft uses **Semantic Versioning (SemVer)**: `MAJOR.MINOR.PATCH`

| Component | When to increment | Example |
|-----------|------------------|---------|
| MAJOR | Breaking changes to generated output or manifest schema | `1.0.0` → `2.0.0` |
| MINOR | New capabilities, backward-compatible features | `1.0.0` → `1.1.0` |
| PATCH | Bug fixes, documentation updates | `1.0.0` → `1.0.1` |

**Compatibility expectations**:
- Packs with same MAJOR version should be combinable
- MINOR updates should not break existing generated projects
- PATCH updates are always safe to apply

### Paths

#### Pack Locations

Packs can be resolved from (in priority order):

1. **Local path**: Explicit path to pack directory
   ```
   /path/to/my-pack/
   ```

2. **Registry reference**: Resolved via registry lookup
   ```
   persistence-postgres@1.2.0
   ```

3. **Remote sources** (future): Git URLs, npm packages
   ```
   github:my-org/my-pack@v1.0.0
   ```

#### Registry Location

**Default**: `~/.bootcraft/registry.json`

**Override via environment variable**:
```bash
export BOOTCRAFT_REGISTRY=/custom/path/registry.json
```

**Registry structure**:
```json
{
  "version": "1",
  "packs": {
    "baseline": {
      "version": "0.1.0",
      "path": "/path/to/baseline-pack"
    },
    "persistence-postgres": {
      "version": "1.0.0",
      "path": "/path/to/persistence-postgres-pack"
    }
  }
}
```

#### Project State Location

**Path**: `.bootcraft/state.json` (relative to project root)

**Purpose**: Tracks all applied packs, versions, capabilities, and generation history.

### Manifest Files

| File | Location | Purpose |
|------|----------|---------|
| `pack.yaml` | Pack root | Defines pack metadata, capabilities, steps |
| `archetype.yaml` | Archetype root | Defines archetype metadata, pack composition |
| `templates/` | Within pack | Template files to be generated |

---

## 5. Generation Flow

Bootcraft follows a **canonical pipeline** for project generation. The pipeline is deterministic and idempotent.

### Pipeline Stages

```
┌──────────┐   ┌──────────┐   ┌─────────────┐   ┌───────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ BASELINE │ → │  STACK   │ → │ PERSISTENCE │ → │ MESSAGING │ → │   DOCS   │ → │  STATE   │ → │  DOCTOR  │
└──────────┘   └──────────┘   └─────────────┘   └───────────┘   └──────────┘   └──────────┘   └──────────┘
  (mandatory)   (optional)      (optional)        (optional)     (optional)    (mandatory)    (mandatory)
```

### Stage Details

#### 1. Baseline (Mandatory)

**Inputs**:
- Target directory
- Project name

**Outputs**:
- Core folder structure (`src/domain`, `src/app`, `src/infra`, `src/interfaces`)
- Root configuration files
- `.bootcraft/state.json` (initialized)
- Basic README

**State recorded**:
```json
{
  "appliedPacks": [{
    "packId": "baseline",
    "version": "0.1.0",
    "appliedAt": "2026-01-25T10:00:00Z",
    "capabilities": ["health-endpoint", "graceful-shutdown"]
  }]
}
```

**Failure behavior**: Abort with error, no partial output.

#### 2. Stack (Optional)

**Inputs**:
- Stack pack ID (e.g., `stack-typescript-node`, `stack-python-fastapi`)
- Selected preset

**Outputs**:
- Language-specific configuration (`package.json`, `pyproject.toml`, etc.)
- Linting, formatting, testing toolchain
- CI/CD templates

**State recorded**:
```json
{
  "stack": {
    "packId": "stack-typescript-node",
    "version": "1.0.0",
    "preset": "minimal"
  }
}
```

**Failure behavior**: Rollback stack files, log error, allow retry.

#### 3. Persistence (Optional)

**Inputs**:
- Persistence pack ID (e.g., `persistence-postgres`, `persistence-mongodb`)
- Database connection template values

**Outputs**:
- Repository implementations in `src/infra/database`
- Migration folder structure
- Database configuration
- Integration test utilities

**State recorded**:
```json
{
  "persistence": {
    "packId": "persistence-postgres",
    "version": "1.0.0",
    "capabilities": ["migrations", "connection-pool"]
  }
}
```

**Failure behavior**: Rollback persistence files, log error, allow retry.

#### 4. Messaging (Optional)

**Inputs**:
- Messaging pack ID (e.g., `messaging-kafka`, `messaging-rabbitmq`)
- Topic/queue configuration template

**Outputs**:
- Message broker adapters in `src/infra/messaging`
- Event consumer scaffolding in `src/interfaces/events`
- Producer utilities
- AsyncAPI documentation template

**State recorded**:
```json
{
  "messaging": {
    "packId": "messaging-kafka",
    "version": "1.0.0",
    "capabilities": ["consumer", "producer", "dead-letter"]
  }
}
```

**Failure behavior**: Rollback messaging files, log error, allow retry.

#### 5. Docs (Optional)

**Inputs**:
- Docs pack ID (e.g., `docs-openapi`, `docs-adr`)
- Documentation configuration

**Outputs**:
- API specification templates
- ADR templates in `docs/architecture`
- Generated documentation structure

**State recorded**:
```json
{
  "docs": {
    "packId": "docs-openapi",
    "version": "1.0.0"
  }
}
```

**Failure behavior**: Log warning, continue (docs are non-critical).

#### 6. State (Mandatory)

**Inputs**:
- All previously applied packs and their results

**Outputs**:
- Finalized `.bootcraft/state.json` with complete generation history
- Generation summary log

**State recorded**: Final, complete state object.

**Failure behavior**: Abort (state integrity is critical).

#### 7. Doctor (Mandatory)

**Inputs**:
- Generated project directory
- Expected state from previous stages

**Outputs**:
- Validation report
- Success confirmation or detailed error list

**Checks performed**:
- All expected files exist
- File permissions are correct
- Dependencies can be installed (dry-run)
- No manifest/schema violations
- State file integrity

**Failure behavior**: Report all failures, block generation completion, require fix or `--force`.

---

## 6. Examples

### Minimal Generated Project Tree

```
my-service/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   │   └── .gitkeep
│   │   └── repositories/
│   │       └── .gitkeep
│   ├── app/
│   │   └── use-cases/
│   │       └── .gitkeep
│   ├── infra/
│   │   └── config/
│   │       └── index.ts
│   └── interfaces/
│       └── http/
│           └── health.ts
├── tests/
│   ├── unit/
│   │   └── .gitkeep
│   └── integration/
│       └── .gitkeep
├── docs/
│   └── architecture/
│       └── 001-initial-setup.md
├── .bootcraft/
│   └── state.json
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

### Minimal Pack Manifest (`pack.yaml`)

```yaml
# pack.yaml
packId: example-pack
version: 0.1.0
name: Example Pack
description: A minimal example pack demonstrating manifest structure

# Supported stack constraints (optional)
compatibleWith:
  stacks:
    - stack-typescript-node
    - stack-python-fastapi

# Capabilities this pack can provide
capabilities:
  - id: feature-a
    name: Feature A
    description: Adds feature A to the project
    default: true

  - id: feature-b
    name: Feature B
    description: Adds feature B (optional)
    default: false
    requires:
      - feature-a

# Generation steps
steps:
  - id: create-config
    name: Create Configuration
    description: Generates configuration files
    capabilities:
      - feature-a
    templates:
      - src: templates/config.ts.hbs
        dest: src/infra/config/example.ts

  - id: create-service
    name: Create Service
    description: Generates service implementation
    capabilities:
      - feature-b
    templates:
      - src: templates/service.ts.hbs
        dest: src/app/services/example-service.ts
    after:
      - create-config

# Presets
presets:
  minimal:
    description: Minimal setup with just feature-a
    capabilities:
      feature-a: true
      feature-b: false

  full:
    description: Full setup with all features
    capabilities:
      feature-a: true
      feature-b: true
```

### Minimal Archetype Manifest (`archetype.yaml`)

```yaml
# archetype.yaml
archetypeId: rest-api-postgres
version: 0.1.0
name: REST API with PostgreSQL
description: A REST API microservice backed by PostgreSQL

# Packs included in this archetype (order matters)
packs:
  - packId: baseline
    version: ">=0.1.0"
    capabilities:
      health-endpoint: true
      graceful-shutdown: true

  - packId: stack-typescript-node
    version: ">=1.0.0"
    preset: minimal

  - packId: persistence-postgres
    version: ">=1.0.0"
    capabilities:
      migrations: true
      connection-pool: true

  - packId: interface-rest
    version: ">=1.0.0"
    capabilities:
      openapi: true

# Default values for interactive prompts
defaults:
  projectName: my-api
  nodeVersion: "20"
  databaseName: mydb
```

### Example State File (`.bootcraft/state.json`)

```json
{
  "version": "1",
  "projectName": "my-service",
  "createdAt": "2026-01-25T10:00:00Z",
  "updatedAt": "2026-01-25T10:05:00Z",
  "bootcraftVersion": "0.1.0",
  "archetype": {
    "archetypeId": "rest-api-postgres",
    "version": "0.1.0"
  },
  "appliedPacks": [
    {
      "packId": "baseline",
      "version": "0.1.0",
      "appliedAt": "2026-01-25T10:00:00Z",
      "capabilities": ["health-endpoint", "graceful-shutdown"],
      "steps": ["create-structure", "create-config", "create-health"]
    },
    {
      "packId": "stack-typescript-node",
      "version": "1.0.0",
      "appliedAt": "2026-01-25T10:01:00Z",
      "preset": "minimal",
      "capabilities": [],
      "steps": ["create-package-json", "create-tsconfig", "create-eslint"]
    },
    {
      "packId": "persistence-postgres",
      "version": "1.0.0",
      "appliedAt": "2026-01-25T10:02:00Z",
      "capabilities": ["migrations", "connection-pool"],
      "steps": ["create-db-config", "create-repository", "create-migrations"]
    }
  ],
  "generationLog": [
    {
      "timestamp": "2026-01-25T10:00:00Z",
      "action": "init",
      "result": "success"
    },
    {
      "timestamp": "2026-01-25T10:05:00Z",
      "action": "doctor",
      "result": "success",
      "checks": {
        "files": "pass",
        "permissions": "pass",
        "dependencies": "pass"
      }
    }
  ]
}
```

---

## Alignment Notes

This document uses the following folder naming aligned with the current codebase:

| Convention Doc | Codebase Reality | Status |
|----------------|-----------------|--------|
| `src/app` | — | Established in this doc |
| `src/infra` | — | Established in this doc |
| `src/cli` | `src/cli` | Existing (Bootcraft's own CLI, not generated projects) |

The current codebase (`src/cli/`) is the Bootcraft CLI itself. The conventions in this document describe **generated projects**, not Bootcraft's internal structure. No alignment conflicts exist.

---

*This document is maintained as part of the Bootcraft project. Contributions and clarifications are welcome via pull request.*
