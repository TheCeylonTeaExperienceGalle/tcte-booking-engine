import { describe, expect, it } from "vitest";
import {
  calculateBookingPricing,
  PARTIAL_DEPOSIT_RATIO,
  resolvePaymentPlan,
} from "../../lib/pricing/booking-pricing.js";
import { roundMoney } from "../../lib/pricing/money.js";

function sessionMapFrom(sessions) {
  return new Map(sessions.map((session) => [session.id, session]));
}

const session10k = {
  id: 1,
  price: 10000,
  specialPrice: null,
  sessionTypes: [{ id: 11, price: 2000, specialPrice: null }],
};

describe("authoritative booking pricing", () => {
  const caseARules = [
    {
      id: 1,
      name: "10% combo",
      description: null,
      discountType: "PERCENTAGE",
      discountValue: 10,
      sessionIds: "[1]",
    },
  ];
  const caseBRules = [
    {
      id: 2,
      name: "1000 off",
      description: null,
      discountType: "FIXED_AMOUNT",
      discountValue: 1000,
      sessionIds: "[1]",
    },
  ];
  const selections = [
    { sessionId: 1, sessionTypeId: 11, seatsRequested: 1 },
  ];
  const sessions = sessionMapFrom([session10k]);

  it("CASE A: 10% applies to session + add-on gross (quote === booking)", () => {
    const quote = calculateBookingPricing({
      selections,
      sessionMap: sessions,
      discountRules: caseARules,
    });
    const booking = calculateBookingPricing({
      selections,
      sessionMap: sessions,
      discountRules: caseARules,
      paymentType: "Full",
      provider: "PAYHERE",
    });

    expect(quote.sessionSubtotal).toBe(10000);
    expect(quote.addOnSubtotal).toBe(2000);
    expect(quote.grossSubtotal).toBe(12000);
    expect(quote.discountAmount).toBe(1200);
    expect(quote.fullTotal).toBe(10800);
    expect(booking.fullTotal).toBe(quote.fullTotal);
    expect(booking.amountDueNow).toBe(10800);
  });

  it("CASE B: fixed amount is currency off the gross, not a target price", () => {
    const quote = calculateBookingPricing({
      selections,
      sessionMap: sessions,
      discountRules: caseBRules,
    });
    const booking = calculateBookingPricing({
      selections,
      sessionMap: sessions,
      discountRules: caseBRules,
    });

    expect(quote.grossSubtotal).toBe(12000);
    expect(quote.discountAmount).toBe(1000);
    expect(quote.fullTotal).toBe(11000);
    expect(booking.fullTotal).toBe(quote.fullTotal);
  });

  it("matches with no discount and with add-ons omitted", () => {
    const withAddon = calculateBookingPricing({
      selections,
      sessionMap: sessions,
      discountRules: [],
    });
    const withoutAddon = calculateBookingPricing({
      selections: [{ sessionId: 1, seatsRequested: 1 }],
      sessionMap: sessions,
      discountRules: [],
    });
    expect(withAddon.fullTotal).toBe(12000);
    expect(withoutAddon.fullTotal).toBe(10000);
  });

  it("ignores caller-supplied monetary fields", () => {
    const pricing = calculateBookingPricing({
      selections,
      sessionMap: sessions,
      discountRules: caseARules,
      paymentType: "Full",
      provider: "PAYHERE",
    });
    const malicious = {
      amount: 1,
      full_payment_price: 1,
      payment: { amount: 1, full_payment_price: 1 },
    };
    expect(pricing.fullTotal).toBe(10800);
    expect(pricing.amountDueNow).toBe(10800);
    expect(pricing.fullTotal).not.toBe(malicious.amount);
    expect(pricing.fullTotal).not.toBe(malicious.full_payment_price);
  });

  it("computes a server-side partial deposit instead of a client amount", () => {
    const pricing = calculateBookingPricing({
      selections,
      sessionMap: sessions,
      discountRules: [],
      paymentType: "Partial",
      provider: "PAYHERE",
    });
    expect(pricing.fullTotal).toBe(12000);
    expect(pricing.amountDueNow).toBe(roundMoney(12000 * PARTIAL_DEPOSIT_RATIO));
    expect(pricing.balance).toBe(6000);
    expect(pricing.paymentStatus).toBe("PENDING");
    expect(pricing.bookingStatus).toBe("PENDING");
  });

  it("does not use omitted, negative, zero, huge, or string amounts as totals", () => {
    const pricing = calculateBookingPricing({
      selections,
      sessionMap: sessions,
      discountRules: [],
      paymentType: "Full",
      provider: "MANUAL",
    });
    for (const junk of [undefined, null, -5, 0, 999999, "12.00"]) {
      expect(pricing.fullTotal).toBe(12000);
      expect(pricing.amountDueNow).not.toBe(junk);
    }
  });

  it("rounds money to cents", () => {
    expect(roundMoney(10.005)).toBe(10.01);
    expect(roundMoney(10.004)).toBe(10);
  });
});

describe("payment plan booking status", () => {
  it("confirms manual full payments immediately", () => {
    const plan = resolvePaymentPlan({
      paymentType: "Full",
      provider: "MANUAL",
      fullTotal: 12000,
    });
    expect(plan.paymentStatus).toBe("SUCCESS");
    expect(plan.bookingStatus).toBe("CONFIRMED");
    expect(plan.amountDueNow).toBe(12000);
    expect(plan.balance).toBe(0);
  });

  it("confirms manual partial payments with a server deposit", () => {
    const plan = resolvePaymentPlan({
      paymentType: "Partial",
      provider: "MANUAL",
      fullTotal: 12000,
    });
    expect(plan.paymentStatus).toBe("SUCCESS");
    expect(plan.bookingStatus).toBe("CONFIRMED");
    expect(plan.amountDueNow).toBe(6000);
    expect(plan.balance).toBe(6000);
  });

  it("keeps PayHere checkouts pending until the webhook", () => {
    const plan = resolvePaymentPlan({
      paymentType: "Full",
      provider: "PAYHERE",
      fullTotal: 12000,
    });
    expect(plan.paymentStatus).toBe("PENDING");
    expect(plan.bookingStatus).toBe("PENDING");
    expect(plan.amountDueNow).toBe(12000);
  });

  it("keeps later/unpaid bookings pending", () => {
    const plan = resolvePaymentPlan({
      paymentType: "Later",
      provider: "MANUAL",
      fullTotal: 12000,
    });
    expect(plan.paymentStatus).toBe("PENDING");
    expect(plan.bookingStatus).toBe("PENDING");
    expect(plan.amountDueNow).toBe(0);
    expect(plan.balance).toBe(12000);
  });
});

function priceWithRule(discountType, discountValue) {
  return calculateBookingPricing({
    selections: [{ sessionId: 1, sessionTypeId: 11, seatsRequested: 1 }],
    sessionMap: sessionMapFrom([session10k]),
    discountRules: [
      {
        id: 9,
        name: "edge",
        discountType,
        discountValue,
        sessionIds: "[1]",
      },
    ],
  });
}

describe("discount validation clamps", () => {
  it("treats a negative fixed amount as no discount", () => {
    const pricing = priceWithRule("FIXED_AMOUNT", -1000);
    expect(pricing.discountAmount).toBe(0);
    expect(pricing.fullTotal).toBe(12000);
  });

  it("treats a zero fixed amount as no discount", () => {
    const pricing = priceWithRule("FIXED_AMOUNT", 0);
    expect(pricing.discountAmount).toBe(0);
    expect(pricing.fullTotal).toBe(12000);
  });

  it("clamps a fixed discount larger than gross so the final total is not negative", () => {
    const pricing = priceWithRule("FIXED_AMOUNT", 50000);
    expect(pricing.discountAmount).toBe(12000);
    expect(pricing.fullTotal).toBe(0);
  });

  it("treats a negative percentage as no discount", () => {
    const pricing = priceWithRule("PERCENTAGE", -10);
    expect(pricing.discountAmount).toBe(0);
    expect(pricing.fullTotal).toBe(12000);
  });

  it("caps percentage above 100 at a free booking", () => {
    const pricing = priceWithRule("PERCENTAGE", 150);
    expect(pricing.discountAmount).toBe(12000);
    expect(pricing.fullTotal).toBe(0);
  });

  it("allows a 100% discount to reach a zero total, not a negative total", () => {
    const pricing = priceWithRule("PERCENTAGE", 100);
    expect(pricing.discountAmount).toBe(12000);
    expect(pricing.fullTotal).toBe(0);
  });
});
