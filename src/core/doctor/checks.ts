/**
 * Data-driven check definitions for DoctorService.
 *
 * Each check is self-contained: it knows its id, description, hint, whether
 * it is auto-fixable, and how to run itself against a project root.
 */

import { mkdir, readFile } from "node:fs/promises";
import { access, constants } from "node:fs/promises";
import { join } from "node:path";

import type { DoctorCheckResult } from "./types.js";

// ---------------------------------------------------------------------------
// Check definition
// ---------------------------------------------------------------------------

export interface CheckContext {
  /** Absolute path to the project root being validated. */
  root: string;
}

export interface CheckDefinition {
  id: string;
  description: string;
  /** Shown only when the check fails. */
  hint: string;
  /** If true, the check can create the missing artifact via fix(). */
  autoFixable?: boolean;
  run(ctx: CheckContext): Promise<DoctorCheckResult>;
  fix?(ctx: CheckContext): Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function pass(id: string, description: string): DoctorCheckResult {
  return { id, description, status: "PASS" };
}

function fail(id: string, description: string, hint: string): DoctorCheckResult {
  return { id, description, status: "FAIL", hint };
}

// ---------------------------------------------------------------------------
// Structural checks (file / directory existence)
// ---------------------------------------------------------------------------

function fileCheck(
  id: string,
  description: string,
  relPath: string,
  hint: string,
): CheckDefinition {
  return {
    id,
    description,
    hint,
    async run({ root }) {
      const absPath = join(root, relPath);
      return (await exists(absPath)) ? pass(id, description) : fail(id, description, hint);
    },
  };
}

function dirCheck(
  id: string,
  description: string,
  relPath: string,
  hint: string,
  fixable = false,
): CheckDefinition {
  return {
    id,
    description,
    hint,
    autoFixable: fixable,
    async run({ root }) {
      const absPath = join(root, relPath);
      return (await exists(absPath)) ? pass(id, description) : fail(id, description, hint);
    },
    async fix({ root }) {
      await mkdir(join(root, relPath), { recursive: true });
    },
  };
}

// ---------------------------------------------------------------------------
// Content checks
// ---------------------------------------------------------------------------

function openapiContentCheck(): CheckDefinition {
  const id = "openapi-content";
  const description = "OpenAPI spec has info block and at least one path";
  const hint =
    "docs/api/openapi.yaml must contain an `info:` block and at least one entry under `paths:`.";

  return {
    id,
    description,
    hint,
    async run({ root }) {
      const absPath = join(root, "docs", "api", "openapi.yaml");
      if (!(await exists(absPath))) {
        return fail(id, description, "docs/api/openapi.yaml not found — run baseline pack first.");
      }
      const content = await readFile(absPath, "utf-8");
      const hasInfo = /^info:/m.test(content);
      const hasPaths = /^paths:/m.test(content);
      if (!hasInfo || !hasPaths) {
        return fail(id, description, hint);
      }
      return pass(id, description);
    },
  };
}

function adrContentCheck(): CheckDefinition {
  const id = "adr-content";
  const description = "ADR-0001 contains required sections (Context, Decision, Consequences)";
  const hint =
    "docs/architecture/ADR-0001-initial-architecture.md must contain '## Context', '## Decision', and '## Consequences' headings.";

  return {
    id,
    description,
    hint,
    async run({ root }) {
      const absPath = join(root, "docs", "architecture", "ADR-0001-initial-architecture.md");
      if (!(await exists(absPath))) {
        return fail(id, description, "ADR-0001 file not found — run baseline pack first.");
      }
      const content = await readFile(absPath, "utf-8");
      const hasContext = /##\s+Context/i.test(content);
      const hasDecision = /##\s+Decision/i.test(content);
      const hasConsequences = /##\s+Consequences/i.test(content);
      if (!hasContext || !hasDecision || !hasConsequences) {
        return fail(id, description, hint);
      }
      return pass(id, description);
    },
  };
}

// ---------------------------------------------------------------------------
// Canonical check list
// ---------------------------------------------------------------------------

export const DEFAULT_CHECKS: CheckDefinition[] = [
  // --- Baseline ---
  fileCheck(
    "state",
    "Project state exists (.bootcraft/state.json)",
    ".bootcraft/state.json",
    "Run `bootcraft init ...` or ensure `.bootcraft/state.json` is generated.",
  ),
  fileCheck(
    "adr",
    "Architecture decision record exists (ADR-0001)",
    "docs/architecture/ADR-0001-initial-architecture.md",
    "Baseline pack should generate docs/architecture/ADR-0001-initial-architecture.md",
  ),
  fileCheck(
    "openapi",
    "OpenAPI contract exists (docs/api/openapi.yaml)",
    "docs/api/openapi.yaml",
    "Baseline pack should generate docs/api/openapi.yaml (even a stub).",
  ),

  // --- Clean Architecture layers ---
  dirCheck(
    "src-domain",
    "Clean Architecture: domain layer exists (src/domain)",
    "src/domain",
    "Create src/domain and keep business rules there (entities, value objects, domain services).",
    true,
  ),
  dirCheck(
    "src-app",
    "Clean Architecture: application layer exists (src/app)",
    "src/app",
    "Create src/app for use-cases and orchestration (commands/queries, ports).",
    true,
  ),
  dirCheck(
    "src-infra",
    "Ports & Adapters: infrastructure layer exists (src/infra)",
    "src/infra",
    "Create src/infra for adapters (database, messaging, http clients, observability).",
    true,
  ),

  // --- Test pyramid ---
  dirCheck(
    "tests-unit",
    "Test pyramid: unit tests folder exists (tests/unit)",
    "tests/unit",
    "Create tests/unit and add at least 1 unit test as baseline.",
    true,
  ),
  dirCheck(
    "tests-integration",
    "Test pyramid: integration tests folder exists (tests/integration)",
    "tests/integration",
    "Create tests/integration for tests that hit real adapters (DB, queue, HTTP).",
    true,
  ),
  dirCheck(
    "tests-e2e",
    "Test pyramid: e2e tests folder exists (tests/e2e)",
    "tests/e2e",
    "Create tests/e2e for end-to-end scenarios against a running service.",
    true,
  ),

  // --- Content validation ---
  openapiContentCheck(),
  adrContentCheck(),
];
