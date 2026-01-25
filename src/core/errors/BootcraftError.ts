/**
 * Error codes for Bootcraft operations.
 * Use these to programmatically handle specific error conditions.
 */
export type BootcraftErrorCode =
  | "STATE_INVALID" // State file exists but contains invalid JSON or schema
  | "STATE_READ_FAILED" // Failed to read state file (permissions, etc.)
  | "STATE_WRITE_FAILED" // Failed to write state file
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
