import { describe, it, expect } from "vitest";
import { applyHelper, builtinVars } from "../../../src/core/templates/helpers.js";

describe("applyHelper", () => {
  it("upper: converts to UPPER CASE", () => {
    expect(applyHelper("upper", "my-service")).toBe("MY-SERVICE");
  });

  it("lower: converts to lower case", () => {
    expect(applyHelper("lower", "MY-SERVICE")).toBe("my-service");
  });

  it("camelCase: converts kebab to camelCase", () => {
    expect(applyHelper("camelCase", "my-service-name")).toBe("myServiceName");
  });

  it("camelCase: converts snake to camelCase", () => {
    expect(applyHelper("camelCase", "my_service_name")).toBe("myServiceName");
  });

  it("camelCase: handles single word", () => {
    expect(applyHelper("camelCase", "service")).toBe("service");
  });

  it("pascalCase: converts to PascalCase", () => {
    expect(applyHelper("pascalCase", "my-service-name")).toBe("MyServiceName");
  });

  it("kebabCase: converts to kebab-case", () => {
    expect(applyHelper("kebabCase", "MyServiceName")).toBe("my-service-name");
  });

  it("kebabCase: converts snake to kebab", () => {
    expect(applyHelper("kebabCase", "my_service_name")).toBe("my-service-name");
  });

  it("snakeCase: converts to snake_case", () => {
    expect(applyHelper("snakeCase", "my-service-name")).toBe("my_service_name");
  });

  it("snakeCase: converts camelCase to snake_case", () => {
    expect(applyHelper("snakeCase", "myServiceName")).toBe("my_service_name");
  });
});

describe("builtinVars", () => {
  it("provides year as a 4-digit string", () => {
    const vars = builtinVars();
    expect(vars.year).toMatch(/^\d{4}$/);
  });

  it("provides date in YYYY-MM-DD format", () => {
    const vars = builtinVars();
    expect(vars.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
