/**
 * Error codes for Bootcraft operations.
 * Use these to programmatically handle specific error conditions.
 */
export type BootcraftErrorCode =
  | "STATE_INVALID" // State file exists but contains invalid JSON or schema
  | "STATE_READ_FAILED" // Failed to read state file (permissions, etc.)
  | "STATE_WRITE_FAILED" // Failed to write state file
  | "MANIFEST_NOT_FOUND" // Neither pack.yaml nor archetype.yaml exists
  | "MANIFEST_READ_FAILED" // Failed to read manifest (permissions, etc.)
  | "MANIFEST_YAML_INVALID" // YAML parse error
  | "MANIFEST_SCHEMA_INVALID" // Manifest parsed but schema invalid
  | "REGISTRY_INVALID" // Registry exists but contains invalid JSON/schema
  | "REGISTRY_READ_FAILED" // Failed to read registry file
  | "REGISTRY_WRITE_FAILED" // Failed to write registry file
  | "PACK_RESOLVE_FAILED" // Failed to resolve pack dir / manifest
  | "PACK_HASH_FAILED" // Failed to hash pack contents
  | "TEMPLATE_TARGET_EXISTS" // target file exists and force=false
  | "TEMPLATE_RENDER_FAILED" // generic template rendering error
  | "GENERATOR_FAILED"
  | "GENERATOR_STEP_FAILED"
  | "JSON_MERGE_FAILED"
  | "FS_ERROR"; // Generic filesystem error

/**
 * Structured error type for Bootcraft operations.
 * Provides actionable error information with codes, messages, and causes.
 */
export class BootcraftError extends Error {
  readonly code: BootcraftErrorCode;
  override readonly cause?: Error;

  constructor(code: BootcraftErrorCode, message: string, cause?: Error) {
    super(message);
    this.name = "BootcraftError";
    this.code = code;
    this.cause = cause;

    // Maintain proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BootcraftError);
    }
  }

  /**
   * Format error for user display with cause chain.
   */
  toUserMessage(): string {
    let msg = `[${this.code}] ${this.message}`;
    if (this.cause) {
      msg += `\n  Caused by: ${this.cause.message}`;
    }
    return msg;
  }
}
