import { BootcraftError } from "../errors/index.js";
import type { VariableDeclaration } from "../manifest/schemas.js";

/**
 * Validates and enriches provided variables against manifest declarations.
 *
 * - Fills in declared defaults for missing optional variables
 * - Throws INIT_FAILED / GENERATE_FAILED if any required variable is not provided
 */
export function resolveVariables(
  declared: VariableDeclaration[] | undefined,
  provided: Record<string, string>,
  errorCode: "INIT_FAILED" | "GENERATE_FAILED" = "INIT_FAILED",
): Record<string, string> {
  if (!declared || declared.length === 0) return provided;

  const result = { ...provided };
  const missing: string[] = [];

  for (const decl of declared) {
    if (Object.prototype.hasOwnProperty.call(result, decl.name)) continue;

    if (decl.default !== undefined) {
      result[decl.name] = decl.default;
      continue;
    }

    if (decl.required) {
      missing.push(decl.name);
    }
  }

  if (missing.length > 0) {
    throw new BootcraftError(
      errorCode,
      `Missing required template variables: ${missing.map((n) => `-D ${n}=<value>`).join(", ")}`,
    );
  }

  return result;
}
