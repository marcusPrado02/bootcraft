/**
 * Environment configuration.
 *
 * Read all env vars in one place. Fail fast if required vars are missing.
 * Never read process.env directly outside this file.
 */

export interface Config {
  nodeEnv: "development" | "production" | "test";
  port: number;
  logLevel: string;
  serviceName: string;
  serviceVersion: string;
}

export function loadConfig(): Config {
  return {
    nodeEnv: (process.env["NODE_ENV"] ?? "development") as Config["nodeEnv"],
    port: parseInt(process.env["PORT"] ?? "3000", 10),
    logLevel: process.env["LOG_LEVEL"] ?? "info",
    serviceName: process.env["SERVICE_NAME"] ?? "{{projectName}}",
    serviceVersion: process.env["SERVICE_VERSION"] ?? "0.1.0",
  };
}
