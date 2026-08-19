import { beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({ current: null }));

vi.mock("@/lib/prisma", async () => {
  const { createBookingPrismaMock: createMock } = await import(
    "../helpers/booking-prisma-mock.js"
  );
  harness.current = createMock();
  return { default: harness.current.prisma };
});

import { POST } from "../../app/api/booking/route.js";
import { GET as getCheckoutConfig } from "../../app/api/public/checkout-config/route.js";

function laterPayload(overrides = {}) {
  const checkoutAttemptId = overrides.checkoutAttemptId || crypto.randomUUID();
  return {
    leaderId: 1,
    bookedDate: "2026-08-20",
    checkoutAttemptId,
    selections: overrides.selections || [
      {
        sessionId: 1,
        seatsRequested: 1,
        customers: [
          {
            name: "Dilhara test",
            email: "info@expace.io",
          },
        ],
      },
    ],
    payment: {
      paymentType: "Later",
      provider: "MANUAL",
      method: "Pay Later",
      currency: "USD",
      ...(overrides.payment || {}),
    },
    customer: {
      name: "Dilhara test",
      email: "info@expace.io",
    },
  };
}

async function postBooking(body) {
  return POST(
    new Request("http://127.0.0.1/api/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

describe("public booking checkout hardening", () => {
  beforeEach(() => {
    process.env.PAYHERE_ENABLED = "false";
    harness.current.reset();
  });

  it("exposes PayHere as unavailable when PAYHERE_ENABLED=false", async () => {
    const response = await getCheckoutConfig();
    const body = await response.json();
    expect(body.payHereEnabled).toBe(false);
  });

  it("rejects a crafted PayHere checkout while PayHere is disabled", async () => {
    const response = await postBooking(
      laterPayload({
        payment: {
          paymentType: "Full",
          provider: "PAYHERE",
          method: "PayHere Checkout",
        },
      })
    );
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toBe("Online payment is currently unavailable.");
    expect(harness.current.state.bookings).toHaveLength(0);
  });

  it("creates one Pay Later booking with no PayHere redirect", async () => {
    const response = await postBooking(laterPayload());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.duplicate).toBe(false);
    expect(body.paymentRedirect).toBeNull();
    expect(harness.current.state.bookings).toHaveLength(1);
    expect(harness.current.state.payments).toHaveLength(1);
    expect(harness.current.state.payments[0].provider).toBe("MANUAL");
    expect(harness.current.state.payments[0].status).toBe("PENDING");
    expect(harness.current.state.bookings[0].amount).toBe(70);
  });

  it("replays the original booking for the same idempotency key", async () => {
    const checkoutAttemptId = crypto.randomUUID();
    const first = await (await postBooking(laterPayload({ checkoutAttemptId }))).json();
    const secondResponse = await postBooking(laterPayload({ checkoutAttemptId }));
    const second = await secondResponse.json();

    expect(second.success).toBe(true);
    expect(second.duplicate).toBe(true);
    expect(second.bookingId).toBe(first.bookingId);
    expect(second.referenceCode).toBe(first.referenceCode);
    expect(harness.current.state.bookings).toHaveLength(1);
    expect(harness.current.state.payments).toHaveLength(1);
    expect(harness.current.state.customers).toHaveLength(1);
    expect(harness.current.state.items).toHaveLength(1);
    expect(harness.current.state.commissions).toHaveLength(0);
  });

  it("allows only one booking when the same key is submitted concurrently", async () => {
    const checkoutAttemptId = crypto.randomUUID();
    const payload = laterPayload({ checkoutAttemptId });
    const [firstResponse, secondResponse] = await Promise.all([
      postBooking(payload),
      postBooking(payload),
    ]);
    const first = await firstResponse.json();
    const second = await secondResponse.json();

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(new Set([first.bookingId, second.bookingId]).size).toBe(1);
    expect([first.duplicate, second.duplicate].filter(Boolean).length).toBe(1);
    expect(harness.current.state.bookings).toHaveLength(1);
    expect(harness.current.state.payments).toHaveLength(1);
  });

  it("creates a new booking when the same selections use a new key", async () => {
    await postBooking(laterPayload({ checkoutAttemptId: crypto.randomUUID() }));
    await postBooking(laterPayload({ checkoutAttemptId: crypto.randomUUID() }));
    expect(harness.current.state.bookings).toHaveLength(2);
    expect(harness.current.state.payments).toHaveLength(2);
  });

  it("retries a failed attempt with the same key without duplicating", async () => {
    const checkoutAttemptId = crypto.randomUUID();
    const failed = await postBooking({
      ...laterPayload({ checkoutAttemptId }),
      leaderId: 999,
    });
    expect(failed.status).toBe(404);
    expect(harness.current.state.bookings).toHaveLength(0);

    const recovered = await (
      await postBooking(laterPayload({ checkoutAttemptId }))
    ).json();
    expect(recovered.success).toBe(true);
    expect(recovered.duplicate).toBe(false);
    expect(harness.current.state.bookings).toHaveLength(1);

    const replay = await (
      await postBooking(laterPayload({ checkoutAttemptId }))
    ).json();
    expect(replay.duplicate).toBe(true);
    expect(harness.current.state.bookings).toHaveLength(1);
  });

  it("issues a new booking after a successful previous checkout with a new key", async () => {
    const firstKey = crypto.randomUUID();
    const first = await (await postBooking(laterPayload({ checkoutAttemptId: firstKey }))).json();
    const secondKey = crypto.randomUUID();
    const second = await (
      await postBooking(laterPayload({ checkoutAttemptId: secondKey }))
    ).json();
    expect(first.bookingId).not.toBe(second.bookingId);
    expect(second.duplicate).toBe(false);
    expect(harness.current.state.bookings).toHaveLength(2);
  });

  it("stores one Booking for a multi-session Tea Experience + Tea Tasting checkout", async () => {
    const response = await postBooking(
      laterPayload({
        selections: [
          {
            sessionId: 1,
            seatsRequested: 1,
            customers: [{ name: "Dilhara test", email: "info@expace.io" }],
          },
          {
            sessionId: 2,
            seatsRequested: 1,
            customers: [{ name: "Dilhara test", email: "info@expace.io" }],
          },
        ],
      })
    );
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(harness.current.state.bookings).toHaveLength(1);
    expect(harness.current.state.items).toHaveLength(2);
    expect(harness.current.state.items.map((item) => item.sessionId).sort()).toEqual([
      1, 2,
    ]);
    expect(harness.current.state.bookings[0].amount).toBe(140);
    expect(harness.current.state.payments[0].amount).toBe(0);
    expect(harness.current.state.customers).toHaveLength(2);
  });

  it("ignores client-supplied money and uses server pricing", async () => {
    await postBooking(
      laterPayload({
        payment: {
          paymentType: "Later",
          provider: "MANUAL",
          method: "Pay Later",
          amount: 1,
          fullTotal: 1,
        },
      })
    );
    expect(harness.current.state.bookings[0].amount).toBe(70);
    expect(harness.current.state.payments[0].amount).toBe(0);
  });
});
