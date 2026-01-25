import { describe, it, expect } from "vitest";
import { createApp } from "../src/cli/app";

describe("bootcraft cli", () => {
  it("should have doctor command registered", () => {
    const app = createApp();
    const names = app.commands.map((c) => c.name());
    expect(names).toContain("doctor");
  });
});
