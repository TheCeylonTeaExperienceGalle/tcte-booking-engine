import { roundMoney } from "./money.js";

export const DEFAULT_CURRENCY = "USD";
export const PARTIAL_DEPOSIT_RATIO = 0.5;

export class PricingError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "PricingError";
    this.status = status;
  }
}

export function normalizeDiscountValue(discountType, rawValue) {
  const value = Number(rawValue);
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  if (discountType === "PERCENTAGE") {
    return Math.min(100, value);
  }
  return roundMoney(value);
}

export function parseDiscountSessionIds(raw) {
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw || "[]");
    } catch {
      parsed = [];
    }
  }
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0)
    .sort((a, b) => a - b);
}

export function uniqueSortedSessionIds(selections) {
  return [...new Set(selections.map((selection) => Number(selection.sessionId)))]
    .filter((id) => Number.isInteger(id) && id > 0)
    .sort((a, b) => a - b);
}

function sessionSeatsMap(lineItems) {
  const seatsBySession = new Map();
  for (const item of lineItems) {
    seatsBySession.set(
      item.sessionId,
      (seatsBySession.get(item.sessionId) || 0) + item.seatsRequested
    );
  }
  return seatsBySession;
}

export function comboUnitsForRule(lineItems, ruleSessionIds) {
  if (!ruleSessionIds.length) {
    return 0;
  }
  const seatsBySession = sessionSeatsMap(lineItems);
  const counts = ruleSessionIds.map((sessionId) => seatsBySession.get(sessionId) || 0);
  if (counts.some((count) => count <= 0)) {
    return 0;
  }
  return Math.min(...counts);
}

export function resolveLineItems(selections, sessionMap) {
  if (!Array.isArray(selections) || selections.length === 0) {
    throw new PricingError("At least one selection is required");
  }

  return selections.map((selection) => {
    const sessionId = Number(selection.sessionId);
    const seatsRequested = Number(selection.seatsRequested);
    const session = sessionMap.get(sessionId);

    if (!session) {
      throw new PricingError(`Session ${sessionId} not found`);
    }

    if (!Number.isInteger(seatsRequested) || seatsRequested <= 0) {
      throw new PricingError("seatsRequested must be greater than 0");
    }

    const sessionBasePrice = roundMoney(
      session.specialPrice ?? session.price ?? 0
    );
    let addOnPrice = 0;
    const sessionTypeId = selection.sessionTypeId
      ? Number(selection.sessionTypeId)
      : null;

    if (sessionTypeId) {
      const sessionType = (session.sessionTypes || []).find(
        (type) => Number(type.id) === sessionTypeId
      );
      if (!sessionType) {
        throw new PricingError(
          `Session type ${sessionTypeId} does not belong to session ${sessionId}`
        );
      }
      addOnPrice = roundMoney(
        sessionType.specialPrice ?? sessionType.price ?? 0
      );
    }

    const unitPrice = roundMoney(sessionBasePrice + addOnPrice);
    const lineGross = roundMoney(unitPrice * seatsRequested);

    return {
      sessionId,
      sessionTypeId,
      sessionBasePrice,
      addOnPrice,
      unitPrice,
      seatsRequested,
      lineGross,
    };
  });
}

export function applyDiscountRules(lineItems, discountRules = []) {
  const selectedSessionIds = uniqueSortedSessionIds(lineItems);
  const grossSubtotal = roundMoney(
    lineItems.reduce((sum, item) => sum + item.lineGross, 0)
  );

  const rules = Array.isArray(discountRules) ? discountRules : [];
  for (const rule of rules) {
    const ruleSessionIds = parseDiscountSessionIds(rule.sessionIds);
    const isExactMatch =
      ruleSessionIds.length === selectedSessionIds.length &&
      ruleSessionIds.every((id, index) => id === selectedSessionIds[index]);

    if (!isExactMatch) {
      continue;
    }

    const comboUnits = comboUnitsForRule(lineItems, ruleSessionIds);
    if (comboUnits <= 0) {
      continue;
    }

    const discountValue = normalizeDiscountValue(
      rule.discountType,
      rule.discountValue
    );

    let discountAmount = 0;
    if (rule.discountType === "PERCENTAGE") {
      discountAmount = roundMoney((grossSubtotal * discountValue) / 100);
    } else {
      // FIXED_AMOUNT = currency amount OFF the gross, per matching combo unit.
      discountAmount = roundMoney(discountValue * comboUnits);
    }

    discountAmount = Math.min(grossSubtotal, Math.max(0, discountAmount));

    return {
      discountAmount,
      appliedRule: {
        id: rule.id,
        name: rule.name,
        description: rule.description,
        discountType: rule.discountType,
        discountValue: rule.discountValue,
        sessionIds: ruleSessionIds,
      },
    };
  }

  return { discountAmount: 0, appliedRule: null };
}

export function resolvePaymentPlan({
  paymentType,
  provider,
  fullTotal,
}) {
  const total = roundMoney(fullTotal);
  const normalizedType =
    paymentType === "Partial" || paymentType === "Later" ? paymentType : "Full";
  const normalizedProvider = provider === "PAYHERE" ? "PAYHERE" : "MANUAL";

  let amountDueNow = total;
  if (normalizedType === "Later") {
    amountDueNow = 0;
  } else if (normalizedType === "Partial") {
    amountDueNow = roundMoney(total * PARTIAL_DEPOSIT_RATIO);
    if (amountDueNow <= 0 || amountDueNow >= total) {
      amountDueNow = total;
    }
  }

  const balance = roundMoney(total - amountDueNow);
  const isGatewayPending =
    normalizedProvider === "PAYHERE" || normalizedType === "Later";

  return {
    paymentType: normalizedType,
    provider: normalizedProvider,
    fullTotal: total,
    amountDueNow,
    balance,
    paymentStatus: isGatewayPending ? "PENDING" : "SUCCESS",
    bookingStatus: isGatewayPending ? "PENDING" : "CONFIRMED",
    currency: DEFAULT_CURRENCY,
  };
}

export function calculateBookingPricing({
  selections,
  sessionMap,
  discountRules = [],
  paymentType = "Full",
  provider = "MANUAL",
}) {
  const lineItems = resolveLineItems(selections, sessionMap);
  const sessionSubtotal = roundMoney(
    lineItems.reduce(
      (sum, item) => sum + item.sessionBasePrice * item.seatsRequested,
      0
    )
  );
  const addOnSubtotal = roundMoney(
    lineItems.reduce(
      (sum, item) => sum + item.addOnPrice * item.seatsRequested,
      0
    )
  );
  const grossSubtotal = roundMoney(sessionSubtotal + addOnSubtotal);
  const { discountAmount, appliedRule } = applyDiscountRules(
    lineItems,
    discountRules
  );
  const fullTotal = roundMoney(Math.max(0, grossSubtotal - discountAmount));
  const paymentPlan = resolvePaymentPlan({
    paymentType,
    provider,
    fullTotal,
  });

  return {
    lineItems,
    sessionSubtotal,
    addOnSubtotal,
    grossSubtotal,
    discountAmount,
    appliedRule,
    fullTotal,
    ...paymentPlan,
  };
}

export function selectionsFromQuotePayload({
  sessionIds,
  sessionTypeSelections = {},
  selections,
}) {
  if (Array.isArray(selections) && selections.length > 0) {
    return selections.map((selection) => ({
      sessionId: Number(selection.sessionId),
      sessionTypeId: selection.sessionTypeId
        ? Number(selection.sessionTypeId)
        : null,
      seatsRequested: Number(selection.seatsRequested) || 1,
    }));
  }

  const parsedSessionIds = (sessionIds || [])
    .map((id) => Number.parseInt(id, 10))
    .filter((id) => !Number.isNaN(id));

  return parsedSessionIds.map((sessionId) => {
    const typeId = sessionTypeSelections?.[sessionId];
    return {
      sessionId,
      sessionTypeId: typeId ? Number(typeId) : null,
      seatsRequested: 1,
    };
  });
}
