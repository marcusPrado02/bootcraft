import { describe, it, expect } from "vitest";
import { parseSemVer, compareSemVer, highestVersion } from "../../src/infra/semver.js";

describe("parseSemVer", () => {
  it("parses valid X.Y.Z", () => {
    const v = parseSemVer("1.2.3");
    expect(v).toEqual({ major: 1, minor: 2, patch: 3, raw: "1.2.3" });
  });

  it("parses with leading zeros as integers", () => {
    const v = parseSemVer("1.02.003");
    expect(v?.major).toBe(1);
    expect(v?.minor).toBe(2);
    expect(v?.patch).toBe(3);
  });

  it("returns null for non-semver strings", () => {
    expect(parseSemVer("latest")).toBeNull();
    expect(parseSemVer("")).toBeNull();
    expect(parseSemVer("1.2")).toBeNull();
  });
});

describe("compareSemVer", () => {
  it("returns 0 for equal versions", () => {
    expect(compareSemVer("1.0.0", "1.0.0")).toBe(0);
  });

  it("higher major wins", () => {
    expect(compareSemVer("2.0.0", "1.9.9")).toBeGreaterThan(0);
    expect(compareSemVer("1.9.9", "2.0.0")).toBeLessThan(0);
  });

  it("higher minor wins when major equal", () => {
    expect(compareSemVer("1.2.0", "1.1.9")).toBeGreaterThan(0);
  });

  it("higher patch wins when major.minor equal", () => {
    expect(compareSemVer("1.0.2", "1.0.1")).toBeGreaterThan(0);
  });

  it("falls back to locale compare for non-semver", () => {
    const result = compareSemVer("alpha", "beta");
    expect(typeof result).toBe("number");
  });
});

describe("highestVersion", () => {
  it("returns undefined for empty array", () => {
    expect(highestVersion([])).toBeUndefined();
  });

  it("returns single version", () => {
    expect(highestVersion(["1.0.0"])).toBe("1.0.0");
  });

  it("returns highest semver", () => {
    expect(highestVersion(["0.1.0", "0.3.0", "0.2.0"])).toBe("0.3.0");
    expect(highestVersion(["1.0.0", "2.0.0", "1.5.0"])).toBe("2.0.0");
  });
});
