# ADR-0001 – Initial Architecture

**Date:** {{date}}
**Status:** Accepted
**Project:** {{projectName}}

---

## Context

We are starting the `{{projectName}}` service. We need to establish a foundational architecture that:

- Is easy to evolve as requirements change
- Allows swapping infrastructure concerns (database, messaging broker) without touching business logic
- Makes dependencies between layers explicit and enforced
- Provides a clear home for every type of code

---

## Decision

We adopt **Clean Architecture** combined with **Hexagonal Architecture (Ports & Adapters)**.

**Layer structure:**

| Layer         | Responsibility                                    |
|---------------|---------------------------------------------------|
| `domain`      | Business entities, value objects, domain services, repository interfaces |
| `app`         | Use cases, command/query handlers, application services |
| `infra`       | Implementations of ports: database adapters, external API clients, messaging |
| `interfaces`  | Primary adapters that drive the application: HTTP controllers, CLI, event consumers |

**Dependency rule:** Dependencies always point inward. The domain layer has zero external dependencies.

---

## Consequences

**Positive:**
- Business logic is isolated and independently testable
- Infrastructure can be replaced without touching domain or use cases
- New capabilities (persistence, messaging) are added as packs, not by modifying core code
- Clear home for every type of code reduces "where does this go?" friction

**Negative:**
- More files and indirection than a simple layered architecture
- Junior developers need to learn the pattern before being productive
- Ports/adapters can feel over-engineered for very simple services

---

## Notes

This architecture was selected as the Bootcraft golden path for microservices. It is non-negotiable for the baseline and should be maintained through future evolution of the service.
