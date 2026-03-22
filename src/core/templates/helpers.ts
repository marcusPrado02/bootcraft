/**
 * Template string helpers.
 *
 * These transform variable values inside templates:
 *   {{upper projectName}}   → MY-SERVICE
 *   {{camelCase projectName}} → myService
 *
 * Built-in context helpers are also exported here:
 *   {{year}} → current year
 *   {{date}} → current ISO date (YYYY-MM-DD)
 */

export type HelperName = "upper" | "lower" | "camelCase" | "pascalCase" | "kebabCase" | "snakeCase";

export const HELPER_NAMES: HelperName[] = [
  "upper",
  "lower",
  "camelCase",
  "pascalCase",
  "kebabCase",
  "snakeCase",
];

export function applyHelper(helper: HelperName, value: string): string {
  switch (helper) {
    case "upper":
      return value.toUpperCase();
    case "lower":
      return value.toLowerCase();
    case "camelCase":
      return toCamelCase(value);
    case "pascalCase":
      return toPascalCase(value);
    case "kebabCase":
      return toKebabCase(value);
    case "snakeCase":
      return toSnakeCase(value);
  }
}

/** Built-in variables always available in every template. */
export function builtinVars(): Record<string, string> {
  const now = new Date();
  return {
    year: String(now.getFullYear()),
    date: now.toISOString().slice(0, 10),
  };
}

// ---------------------------------------------------------------------------
// Case converters
// ---------------------------------------------------------------------------

function tokenize(value: string): string[] {
  // Split on spaces, hyphens, underscores, and camelCase boundaries
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function toCamelCase(value: string): string {
  const tokens = tokenize(value);
  return tokens.map((t, i) => (i === 0 ? t.toLowerCase() : capitalize(t))).join("");
}

function toPascalCase(value: string): string {
  return tokenize(value).map(capitalize).join("");
}

function toKebabCase(value: string): string {
  return tokenize(value)
    .map((t) => t.toLowerCase())
    .join("-");
}

function toSnakeCase(value: string): string {
  return tokenize(value)
    .map((t) => t.toLowerCase())
    .join("_");
}

function capitalize(word: string): string {
  if (!word) return word;
  return word[0]!.toUpperCase() + word.slice(1).toLowerCase();
}
