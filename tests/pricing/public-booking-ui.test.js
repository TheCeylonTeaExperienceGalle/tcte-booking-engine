import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolvePaymentPlan } from "../../lib/pricing/booking-pricing.js";

describe("public booking partial-payment UI", () => {
  const source = readFileSync(
    path.join(process.cwd(), "app/book/page.jsx"),
    "utf8"
  );

  it("no longer contains an editable arbitrary partial amount control", () => {
    expect(source).not.toContain('id="partialAmount"');
    expect(source).not.toContain("handlePartialAmountChange");
    expect(source).not.toContain("Enter Payment Amount");
    expect(source).not.toContain("Enter amount to pay now");
    expect(source).not.toMatch(/partialAmount:/);
  });

  it("displays the server 50% deposit instead of a customer-chosen amount", () => {
    expect(source).toContain("resolvePaymentPlan");
    expect(source).toContain("Pay 50% now");
    expect(source).toContain("Remaining balance");
    expect(source).toContain('SelectItem value="Partial"');
    expect(source).toContain('SelectItem value="Full"');
  });

  it("does not send caller-controlled money fields in the public payload", () => {
    expect(source).not.toContain("full_payment_price");
    expect(source).not.toMatch(/amount:\s*formData\.partialAmount/);
    expect(source).not.toMatch(/amount:\s*Number\(formData\.partialAmount\)/);
  });
});

describe("displayed partial plan matches server pricing", () => {
  it("shows 50% due now and 50% remaining for a 120.00 total", () => {
    const plan = resolvePaymentPlan({
      paymentType: "Partial",
      provider: "PAYHERE",
      fullTotal: 120,
    });
    expect(plan.amountDueNow).toBe(60);
    expect(plan.balance).toBe(60);
    expect(plan.fullTotal).toBe(120);
  });
});

describe("admin discount wording", () => {
  const source = readFileSync(
    path.join(process.cwd(), "app/dashboard/discount-rules/page.jsx"),
    "utf8"
  );

  it("labels FIXED_AMOUNT as amount off, not a target package price", () => {
    expect(source).toContain("Fixed Amount Off");
    expect(source).toContain("Amount Off *");
    expect(source).toContain("This is not a final package price");
    expect(source).not.toContain("Fixed Price");
  });
});
