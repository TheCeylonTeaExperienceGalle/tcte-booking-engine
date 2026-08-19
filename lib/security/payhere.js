import { createHash } from "crypto";

export const PAYMENT_STATUS = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  CANCELED: "CANCELED",
};

export const BOOKING_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
};

export function md5Upper(value) {
  return createHash("md5").update(String(value)).digest("hex").toUpperCase();
}

export function computePayHereSignature({
  merchantId,
  orderId,
  amount,
  currency,
  statusCode,
  merchantSecret,
}) {
  return md5Upper(
    `${merchantId}${orderId}${amount}${currency}${statusCode}${md5Upper(merchantSecret)}`
  );
}

export function signaturesMatch(expected, provided) {
  if (!expected || !provided) {
    return false;
  }
  return String(expected) === String(provided);
}

export function merchantsMatch(incomingMerchantId, configuredMerchantId) {
  if (!incomingMerchantId || !configuredMerchantId) {
    return false;
  }
  return String(incomingMerchantId) === String(configuredMerchantId);
}

export function amountsMatch(incomingAmount, storedAmount) {
  const incoming = Number(incomingAmount);
  const stored = Number(storedAmount);
  if (!Number.isFinite(incoming) || !Number.isFinite(stored)) {
    return false;
  }
  return Math.round(incoming * 100) === Math.round(stored * 100);
}

export function currenciesMatch(incomingCurrency, storedCurrency) {
  if (!incomingCurrency || !storedCurrency) {
    return false;
  }
  return (
    String(incomingCurrency).trim().toUpperCase() ===
    String(storedCurrency).trim().toUpperCase()
  );
}

export function resolvePayHerePaymentStatus(statusCode) {
  switch (Number(statusCode)) {
    case 2:
      return PAYMENT_STATUS.SUCCESS;
    case 0:
      return PAYMENT_STATUS.PENDING;
    case -1:
      return PAYMENT_STATUS.CANCELED;
    case -2:
    case -3:
    default:
      return PAYMENT_STATUS.FAILED;
  }
}

export function bookingStatusFromPaymentStatus(paymentStatus) {
  if (paymentStatus === PAYMENT_STATUS.SUCCESS) {
    return BOOKING_STATUS.CONFIRMED;
  }
  if (paymentStatus === PAYMENT_STATUS.PENDING) {
    return BOOKING_STATUS.PENDING;
  }
  return BOOKING_STATUS.CANCELLED;
}

/**
 * SUCCESS is terminal. FAILED/CANCELED are terminal.
 * Only PENDING may transition to a later gateway status.
 */
export function canTransitionPaymentStatus(currentStatus, incomingStatus) {
  if (!incomingStatus) {
    return false;
  }
  if (currentStatus === incomingStatus) {
    return false;
  }
  if (currentStatus === PAYMENT_STATUS.SUCCESS) {
    return false;
  }
  if (
    currentStatus === PAYMENT_STATUS.FAILED ||
    currentStatus === PAYMENT_STATUS.CANCELED
  ) {
    return false;
  }
  return currentStatus === PAYMENT_STATUS.PENDING;
}

export function sanitizeNotifyMetadata(existingMetadata, payload) {
  return {
    ...(existingMetadata ?? {}),
    notification: {
      receivedAt: new Date().toISOString(),
      statusCode: payload?.status_code ?? null,
      paymentId: payload?.payment_id ?? null,
      method: payload?.method ?? null,
    },
  };
}
