import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("public booking UI PayHere demo mode and submit lock", () => {
  const source = readFileSync(
    path.join(process.cwd(), "app/book/page.jsx"),
    "utf8"
  );

  it("loads checkout config and hides online PayHere when disabled", () => {
    expect(source).toContain('/api/public/checkout-config');
    expect(source).toContain("Online payment is currently unavailable in this demo. Please select Pay Later.");
    expect(source).toContain("payHereEnabled");
    expect(source).toContain('payment: "Later"');
    expect(source).not.toContain("example.invalid/payhere");
  });

  it("does not POST PayHere when the demo flag is off", () => {
    expect(source).toContain('payHereEnabled ? formData.payment : "Later"');
    expect(source).toContain("payHereEnabled && formData.payment !== \"Later\" ? \"PAYHERE\" : \"MANUAL\"");
    expect(source).toContain("result.paymentRedirect && payHereEnabled");
  });

  it("locks Confirm Booking against double submission", () => {
    expect(source).toContain("submitLockRef");
    expect(source).toContain("if (submitLockRef.current || isSubmitting)");
    expect(source).toContain("Processing booking...");
    expect(source).toContain("disabled={isSubmitting}");
    expect(source).toContain("crypto.randomUUID()");
    expect(source).toContain("checkoutAttemptId:");
  });

  it("keeps the same checkoutAttemptId across a recoverable retry", () => {
    expect(source).toContain("isValidCheckoutAttemptId(checkoutAttemptIdRef.current)");
    expect(source).toContain("checkoutAttemptIdRef.current = null");
    expect(source).toContain("submitLockRef.current = false");
  });
});

describe("double-click simulation issues one outgoing POST", () => {
  it("uses a synchronous lock matching the booking page guard", async () => {
    const lock = { current: false };
    let posts = 0;

    async function confirmBooking() {
      if (lock.current) {
        return;
      }
      lock.current = true;
      posts += 1;
      await Promise.resolve();
    }

    await Promise.all([confirmBooking(), confirmBooking(), confirmBooking()]);
    expect(posts).toBe(1);
  });
});
