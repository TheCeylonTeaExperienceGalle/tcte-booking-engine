import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  displayFromStoredPaymentStatus,
  isValidOrderId,
  mutationFromResultQuery,
  normalizeOrderId,
  readPaymentDisplay,
} from "../../lib/payments/order-status.js";

describe("payment result page is display-only", () => {
  it("does not mutate state from query status values", () => {
    for (const status of ["success", "cancelled", "failed", "arbitrary", "", undefined]) {
      expect(mutationFromResultQuery(status)).toBeNull();
    }
  });

  it("derives copy from stored payment status, not the URL", () => {
    expect(displayFromStoredPaymentStatus("SUCCESS").badge).toBe("Settled");
    expect(displayFromStoredPaymentStatus("PENDING").badge).toBe("Awaiting gateway");
    expect(displayFromStoredPaymentStatus("FAILED").badge).toBe("Failed");
  });

  it("looks up payments with findUnique only", async () => {
    const prisma = {
      payment: {
        findUnique: vi.fn(async () => ({ orderId: "RV-TEST-1", status: "PENDING" })),
        update: vi.fn(),
        create: vi.fn(),
      },
      booking: {
        update: vi.fn(),
      },
    };

    const result = await readPaymentDisplay(prisma, "RV-TEST-1");
    expect(result.paymentStatus).toBe("PENDING");
    expect(prisma.payment.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.payment.update).not.toHaveBeenCalled();
    expect(prisma.booking.update).not.toHaveBeenCalled();
  });

  it("does not write when the order is missing", async () => {
    const prisma = {
      payment: {
        findUnique: vi.fn(async () => null),
        update: vi.fn(),
      },
      booking: { update: vi.fn() },
    };

    const result = await readPaymentDisplay(prisma, "SECURITY-TEST");
    expect(result.copy.badge).toBe("Awaiting gateway");
    expect(prisma.payment.update).not.toHaveBeenCalled();
  });

  it("normalizes and validates order ids without using status", () => {
    expect(normalizeOrderId(["RV-1", "RV-2"])).toBe("RV-1");
    expect(isValidOrderId("RV-1-ABC")).toBe(true);
    expect(isValidOrderId("x")).toBe(false);
  });

  it("removed the result-page mutation function from application source", () => {
    const page = readFileSync(
      path.join(process.cwd(), "app/book/result/page.jsx"),
      "utf8"
    );
    expect(page).not.toContain("updateDevStatus");
    expect(page).not.toContain("prisma.payment.update");
    expect(page).not.toContain("prisma.booking.update");
    expect(page).not.toMatch(/status\s*===\s*["']success["']/);
  });
});
