# Bootcraft – Implementation Tasks

## CLI & UX

- [ ] **1. Add interactive prompts for `init`** – Use `@inquirer/prompts` to interactively ask for pack path, archetype, and template variables when flags are omitted.
- [ ] **2. Add `--dry-run` flag to `init`** – Preview which files would be written without touching the filesystem.
- [ ] **3. Add `--verbose` / `--debug` logging flags** – Wire a log-level flag into the CLI and propagate it through all services.
- [ ] **4. Add `bootcraft pack list` command** – List all packs registered in `~/.bootcraft/registry.json` with their ids, versions, and registration timestamps.
- [ ] **5. Add `bootcraft pack info <id>` command** – Show full manifest details for a registered pack: archetypes, capabilities, and template variables.
- [ ] **6. Add `bootcraft pack add <path>` command** – Register a local pack into the registry as a standalone operation (separate from `init`).
- [ ] **7. Add `bootcraft pack remove <id>` command** – Unregister a pack from the registry.
- [ ] **8. Add `bootcraft generate` command** – Run additional generation steps (stack, persistence, messaging, docs) on an already-initialised project.
- [ ] **9. Add generation progress reporting** – Print a spinner or step counter (e.g. `[2/5] Applying archetype templates`) during `init` and `generate`.
- [ ] **10. Add `--version` flag** – Read the version from `package.json` and print it; wire it into the `app.ts` top-level command.

## Template Engine

- [ ] **11. Add conditional blocks** – Support `{{#if varName}} ... {{/if}}` and `{{#unless varName}} ... {{/unless}}` in templates.
- [ ] **12. Add loop blocks** – Support `{{#each items}} ... {{/each}}` for repeating sections in templates.
- [ ] **13. Add built-in template helpers** – Add at minimum `{{uppercase varName}}`, `{{lowercase varName}}`, `{{camelCase varName}}`, `{{pascalCase varName}}`, and `{{kebabCase varName}}`.
- [ ] **14. Add partial/include support** – Allow templates to include shared snippets via `{{> partialName}}`.
- [ ] **15. Report unresolved template variables as warnings** – Instead of silently passing through `{{unknownVar}}`, collect and surface them to the user after generation.
- [ ] **16. Add strict mode for template variables** – A `--strict-vars` flag (or manifest setting) that fails generation if any variable is unresolved.
- [ ] **17. Support `.bootcraftignore` glob negation** – Handle negation patterns (`!path/to/include`) so packs can re-include subsets of ignored paths.

## Manifest & Pack Schema

- [ ] **18. Add `variables` declaration to pack/archetype manifests** – Allow manifests to declare expected `-D` variables with types, defaults, and descriptions; validate them at load time.
- [ ] **19. Add `capabilities` field to archetype manifests** – Declaratively list what a pack provides (e.g. `openapi`, `domain-layer`, `unit-tests`) for doctor and orchestration.
- [ ] **20. Add `steps` list to archetype/pack manifests** – Let packs declare their own generator steps (applyTemplates, mergeJson, custom) instead of hard-coding them in InitService.
- [ ] **21. Add `requires` / `conflicts` dependency fields to manifests** – Express inter-pack compatibility constraints so the orchestrator can validate before generation.
- [ ] **22. Add `presets` to pack manifests** – Named groups of `-D` variable values so users can pick a preset rather than setting each variable individually.
- [ ] **23. Validate manifest `templateRoot` path exists** – Emit a clear error at manifest-load time if the declared `templateRoot` directory is missing.

## Generation Pipeline

- [ ] **24. Implement stack pack selection stage** – Add a `generate stack` sub-flow that lets users pick a language/runtime pack (TypeScript/Node, Python/FastAPI, Go) and apply its templates.
- [ ] **25. Implement persistence pack stage** – Add a `generate persistence` sub-flow for database packs (PostgreSQL/TypeORM, MongoDB/Mongoose, DynamoDB).
- [ ] **26. Implement messaging pack stage** – Add a `generate messaging` sub-flow for broker packs (Kafka, RabbitMQ, SQS).
- [ ] **27. Implement docs pack stage** – Add a `generate docs` sub-flow that scaffolds OpenAPI specs and ADR templates.
- [ ] **28. Add multi-pack orchestration** – Resolve and sequence multiple packs respecting `requires`/`conflicts` declarations before running any generator steps.
- [ ] **29. Implement rollback on generation failure** – If any generator step throws, undo written files and restore the previous state snapshot.
- [ ] **30. Add `mergeYamlStep` generator step** – Deep-merge YAML configuration files (docker-compose, Kubernetes manifests) analogous to the existing `mergeJsonStep`.

## State & Registry

- [ ] **31. Track per-pack capability metadata in state** – Store which packs contributed which capabilities in `.bootcraft/state.json` so doctor can cross-reference.
- [ ] **32. Add step-level execution history to state** – Record each step name, timestamp, pack id, and outcome so generation is fully auditable.
- [ ] **33. Add semantic version comparison to registry** – When resolving a pack by id, pick the highest semver-compatible version rather than the most recently registered one.
- [ ] **34. Support remote registry** – Allow `BOOTCRAFT_REGISTRY_URL` to point to an HTTP registry endpoint; fetch and cache pack metadata locally.
- [ ] **35. Add registry pack deduplication** – Detect when two local paths resolve to the same content hash and avoid duplicate registry entries.
- [ ] **36. Add state schema migration** – When loading a `state.json` whose `schemaVersion` is older than the current version, run migrations to bring it up to date.

## Doctor Checks

- [ ] **37. Validate OpenAPI spec content** – Parse `openapi.yaml`/`openapi.json` and assert it contains at least one path and a valid info block, not just check for file existence.
- [ ] **38. Validate ADR document content** – Check that the architecture ADR file contains required sections (Context, Decision, Consequences).
- [ ] **39. Add dependency doctor checks** – Verify that required `package.json` dependencies declared by registered packs are actually installed.
- [ ] **40. Add TypeScript compilation check** – Run `tsc --noEmit` as part of doctor and report compiler errors as a failed check.
- [ ] **41. Add test-pyramid check for integration and e2e layers** – Extend the existing unit-test check to also verify `tests/integration` and `tests/e2e` directories exist.
- [ ] **42. Make doctor checks data-driven** – Move check definitions into a configuration structure (array of check descriptors) so new checks can be added without modifying DoctorService internals.
- [ ] **43. Add `--fix` flag to `doctor`** – For checks with an auto-fix (e.g. missing directory), create the missing artifact and re-run the check.

## Testing

- [ ] **44. Add E2E tests for `init` with a real pack fixture** – Create a `fixtures/baseline-pack` directory and run `init` against a real temporary output directory.
- [ ] **45. Add E2E tests for `doctor`** – Scaffold a fixture project in a temp dir and assert doctor passes/fails for known missing artefacts.
- [ ] **46. Add CLI integration tests** – Use `execa` or `child_process` to run the compiled binary and assert stdout/stderr/exit codes for all commands.
- [ ] **47. Add test coverage reporting** – Wire `c8` or `istanbul` into the test script and enforce a minimum coverage threshold in CI.
- [ ] **48. Add property-based tests for `mergeJsonStep`** – Use `fast-check` to fuzz JSON merge inputs and assert deep-merge invariants.

## Build & Developer Experience

- [ ] **49. Add ESM dual-export to the build** – Update `tsup.config.ts` to emit both CJS and ESM formats and export type declarations (`dts: true`).
- [ ] **50. Add a pre-commit hook with lint and type-check** – Configure `husky` + `lint-staged` to run `eslint` and `tsc --noEmit` on staged files before every commit.
