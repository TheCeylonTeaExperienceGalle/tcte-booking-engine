import { describe, expect, it } from "vitest";
import {
  buildPublicBookingResponse,
  isCheckoutAttemptUniqueConflict,
  isValidCheckoutAttemptId,
  normalizeCheckoutAttemptId,
} from "../../lib/bookings/checkout-attempt.js";

describe("checkoutAttemptId", () => {
  it("accepts cryptographically generated UUIDs", () => {
    const id = crypto.randomUUID();
    expect(isValidCheckoutAttemptId(id)).toBe(true);
    expect(normalizeCheckoutAttemptId(id.toUpperCase())).toBe(id.toLowerCase());
  });

  it("rejects empty or malformed keys", () => {
    expect(normalizeCheckoutAttemptId("")).toBeNull();
    expect(normalizeCheckoutAttemptId("not-a-uuid")).toBeNull();
    expect(normalizeCheckoutAttemptId(null)).toBeNull();
  });

  it("detects unique conflicts on checkoutAttemptId", () => {
    expect(
      isCheckoutAttemptUniqueConflict({
        code: "P2002",
        meta: { target: ["checkoutAttemptId"] },
      })
    ).toBe(true);
    expect(
      isCheckoutAttemptUniqueConflict({
        code: "P2002",
        meta: { target: ["orderId"] },
      })
    ).toBe(false);
  });

  it("builds a public duplicate response without extra fields", () => {
    const body = buildPublicBookingResponse({
      bookingId: 9,
      referenceCode: "RV-1-TEST",
      paymentProvider: "MANUAL",
      duplicate: true,
    });
    expect(body).toEqual({
      success: true,
      bookingId: 9,
      referenceCode: "RV-1-TEST",
      duplicate: true,
      message: "Booking already created for this checkout attempt",
      paymentRedirect: null,
    });
  });
});
