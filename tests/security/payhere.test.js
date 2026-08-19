import { describe, expect, it } from "vitest";
import {
  amountsMatch,
  bookingStatusFromPaymentStatus,
  canTransitionPaymentStatus,
  computePayHereSignature,
  currenciesMatch,
  merchantsMatch,
  resolvePayHerePaymentStatus,
  sanitizeNotifyMetadata,
  signaturesMatch,
} from "../../lib/security/payhere.js";

const secret = "test-merchant-secret";

function signedPayload(overrides = {}) {
  const base = {
    merchantId: "merchant-1",
    orderId: "RV-1-TEST",
    amount: "100.00",
    currency: "USD",
    statusCode: 2,
    merchantSecret: secret,
    ...overrides,
  };
  return {
    ...base,
    md5sig: computePayHereSignature(base),
  };
}

describe("PayHere webhook helpers", () => {
  it("accepts a matching signature", () => {
    const payload = signedPayload();
    expect(signaturesMatch(payload.md5sig, payload.md5sig)).toBe(true);
  });

  it("rejects an invalid signature", () => {
    const payload = signedPayload();
    const other = signedPayload({ amount: "1.00" });
    expect(signaturesMatch(payload.md5sig, other.md5sig)).toBe(false);
  });

  it("rejects a merchant mismatch", () => {
    expect(merchantsMatch("merchant-1", "merchant-2")).toBe(false);
    expect(merchantsMatch("merchant-1", "merchant-1")).toBe(true);
  });

  it("compares amounts numerically rather than as raw strings", () => {
    expect(amountsMatch("100.00", 100)).toBe(true);
    expect(amountsMatch("100.0", "100.00")).toBe(true);
    expect(amountsMatch("99.99", 100)).toBe(false);
  });

  it("compares currency case-insensitively without converting", () => {
    expect(currenciesMatch("usd", "USD")).toBe(true);
    expect(currenciesMatch("USD", "LKR")).toBe(false);
  });

  it("maps PayHere status codes", () => {
    expect(resolvePayHerePaymentStatus(2)).toBe("SUCCESS");
    expect(resolvePayHerePaymentStatus(0)).toBe("PENDING");
    expect(resolvePayHerePaymentStatus(-1)).toBe("CANCELED");
    expect(resolvePayHerePaymentStatus(-2)).toBe("FAILED");
  });

  it("allows PENDING to SUCCESS and maps booking CONFIRMED", () => {
    expect(canTransitionPaymentStatus("PENDING", "SUCCESS")).toBe(true);
    expect(bookingStatusFromPaymentStatus("SUCCESS")).toBe("CONFIRMED");
  });

  it("is idempotent for duplicate SUCCESS", () => {
    expect(canTransitionPaymentStatus("SUCCESS", "SUCCESS")).toBe(false);
  });

  it("does not downgrade SUCCESS on FAILED replay", () => {
    expect(canTransitionPaymentStatus("SUCCESS", "FAILED")).toBe(false);
    expect(canTransitionPaymentStatus("SUCCESS", "CANCELED")).toBe(false);
    expect(canTransitionPaymentStatus("SUCCESS", "PENDING")).toBe(false);
  });

  it("maps failed and cancelled PayHere statuses away from CONFIRMED", () => {
    expect(bookingStatusFromPaymentStatus("FAILED")).toBe("CANCELLED");
    expect(bookingStatusFromPaymentStatus("CANCELED")).toBe("CANCELLED");
    expect(bookingStatusFromPaymentStatus("SUCCESS")).toBe("CONFIRMED");
    expect(bookingStatusFromPaymentStatus("PENDING")).toBe("PENDING");
  });

  it("does not store a full gateway payload in metadata", () => {
    const metadata = sanitizeNotifyMetadata(
      {},
      {
        status_code: "2",
        payment_id: "PH-1",
        method: "VISA",
        card_no: "should-not-be-copied",
      }
    );
    expect(metadata.notification.paymentId).toBe("PH-1");
    expect(JSON.stringify(metadata)).not.toContain("should-not-be-copied");
  });
});
