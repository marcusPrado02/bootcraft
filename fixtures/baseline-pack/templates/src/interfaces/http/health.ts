/**
 * Health and Readiness endpoints.
 *
 * - GET /health → liveness probe (is the process alive?)
 * - GET /ready  → readiness probe (is the service ready to handle traffic?)
 *
 * Keep these endpoints lightweight. Never perform heavy logic here.
 * Add readiness checks (DB ping, external deps) only if strictly necessary.
 */

export interface HealthResponse {
  status: "ok" | "degraded" | "unavailable";
  service: string;
  version: string;
  timestamp: string;
}

export function healthHandler(): HealthResponse {
  return {
    status: "ok",
    service: "{{projectName}}",
    version: process.env["SERVICE_VERSION"] ?? "0.1.0",
    timestamp: new Date().toISOString(),
  };
}

export function readyHandler(): HealthResponse {
  // TODO: add readiness checks (e.g., database connectivity) as the service evolves
  return {
    status: "ok",
    service: "{{projectName}}",
    version: process.env["SERVICE_VERSION"] ?? "0.1.0",
    timestamp: new Date().toISOString(),
  };
}
