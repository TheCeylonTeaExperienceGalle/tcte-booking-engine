import { describe, expect, it } from "vitest";
import { isPayHereEnabled } from "../../lib/payments/payhere-enabled.js";

describe("PAYHERE_ENABLED flag", () => {
  it("is disabled when missing", () => {
    expect(isPayHereEnabled({})).toBe(false);
  });

  it("is disabled for any value other than the string true", () => {
    expect(isPayHereEnabled({ PAYHERE_ENABLED: "false" })).toBe(false);
    expect(isPayHereEnabled({ PAYHERE_ENABLED: "FALSE" })).toBe(false);
    expect(isPayHereEnabled({ PAYHERE_ENABLED: "1" })).toBe(false);
    expect(isPayHereEnabled({ PAYHERE_ENABLED: "yes" })).toBe(false);
    expect(isPayHereEnabled({ NODE_ENV: "production" })).toBe(false);
  });

  it("is enabled only for exact true", () => {
    expect(isPayHereEnabled({ PAYHERE_ENABLED: "true" })).toBe(true);
  });

  it("does not infer from merchant variables", () => {
    expect(
      isPayHereEnabled({
        PAYHERE_MERCHANT_ID: "merchant-1",
        PAYHERE_MERCHANT_SECRET: "secret",
      })
    ).toBe(false);
  });
});
