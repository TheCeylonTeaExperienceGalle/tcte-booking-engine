import { describe, expect, it } from "vitest";
import { shouldAllowSeed } from "../../lib/security/seed-guard.js";

describe("seed credential safety", () => {
  it("refuses production unless ALLOW_SEED is true", () => {
    expect(shouldAllowSeed({ NODE_ENV: "production" })).toBe(false);
    expect(shouldAllowSeed({ NODE_ENV: "production", ALLOW_SEED: "false" })).toBe(
      false
    );
    expect(shouldAllowSeed({ NODE_ENV: "production", ALLOW_SEED: "true" })).toBe(
      true
    );
  });

  it("allows local development seeding", () => {
    expect(shouldAllowSeed({ NODE_ENV: "development" })).toBe(true);
    expect(shouldAllowSeed({ NODE_ENV: "test" })).toBe(true);
  });
});
