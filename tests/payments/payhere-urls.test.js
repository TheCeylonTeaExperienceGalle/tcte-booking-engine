import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { appendOrderIdToUrl } from "../../lib/payments/payhere-urls.js";
import { mutationFromResultQuery } from "../../lib/payments/order-status.js";

describe("PayHere return/cancel URL construction", () => {
  it("adds order_id with ? when the configured URL has no query", () => {
    expect(
      appendOrderIdToUrl("https://example.com/book/result", "ABC")
    ).toBe("https://example.com/book/result?order_id=ABC");
  });

  it("appends order_id with & when the configured URL already has a query", () => {
    expect(
      appendOrderIdToUrl(
        "https://example.com/book/result?source=payhere",
        "ABC"
      )
    ).toBe("https://example.com/book/result?source=payhere&order_id=ABC");
  });

  it("does not treat return URL parameters as payment mutations", () => {
    expect(mutationFromResultQuery("success")).toBeNull();
  });
});

describe("booking route no longer concatenates &order_id", () => {
  it("uses appendOrderIdToUrl instead of string &order_id concatenation", () => {
    const source = readFileSync(
      path.join(process.cwd(), "app/api/booking/route.js"),
      "utf8"
    );
    expect(source).toContain("appendOrderIdToUrl");
    expect(source).not.toMatch(/returnUrl\}&order_id=/);
    expect(source).not.toMatch(/full_payment_price/);
    expect(source).not.toMatch(/paidAmount = partialAmount/);
    expect(source).toContain("amount: fullTotal");
    expect(source).toContain("amount: amountDueNow");
    expect(source).toContain("status: bookingStatus");
    expect(source).toContain("status: paymentStatus");
  });
});
