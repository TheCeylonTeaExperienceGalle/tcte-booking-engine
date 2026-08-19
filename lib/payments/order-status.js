const ORDER_ID_PATTERN = /^[A-Za-z0-9_-]{4,64}$/;

export const PAYMENT_DISPLAY = {
  success: {
    title: "Payment confirmed",
    description:
      "Thank you for completing your booking. A confirmation email with the full itinerary has been sent to you.",
    accent: "text-emerald-600",
    badge: "Settled",
  },
  pending: {
    title: "Payment pending",
    description:
      "Payment confirmation is still being processed. We will email you once PayHere confirms the payment.",
    accent: "text-amber-600",
    badge: "Awaiting gateway",
  },
  cancelled: {
    title: "Payment cancelled",
    description:
      "It looks like the payment was cancelled. You can try the checkout again or reach out to our concierge team for assistance.",
    accent: "text-rose-600",
    badge: "Cancelled",
  },
  failed: {
    title: "Payment failed",
    description:
      "The transaction could not be completed. Please try again or contact PayHere support if the issue persists.",
    accent: "text-rose-600",
    badge: "Failed",
  },
  unknown: {
    title: "Payment status unknown",
    description:
      "We are still waiting for the payment gateway to report the final status. Please refresh this page in a moment or contact our concierge.",
    accent: "text-slate-600",
    badge: "Processing",
  },
};

export function normalizeOrderId(rawOrderId) {
  if (Array.isArray(rawOrderId)) {
    return String(rawOrderId[0] ?? "").trim();
  }
  return String(rawOrderId ?? "").trim();
}

export function isValidOrderId(orderId) {
  return ORDER_ID_PATTERN.test(orderId);
}

export function displayFromStoredPaymentStatus(paymentStatus) {
  switch (paymentStatus) {
    case "SUCCESS":
      return PAYMENT_DISPLAY.success;
    case "PENDING":
      return PAYMENT_DISPLAY.pending;
    case "CANCELED":
      return PAYMENT_DISPLAY.cancelled;
    case "FAILED":
      return PAYMENT_DISPLAY.failed;
    default:
      return PAYMENT_DISPLAY.unknown;
  }
}

/**
 * Query-string status values are never authoritative.
 * Kept as an explicit no-op so tests can prove mutation is impossible.
 */
export function mutationFromResultQuery() {
  return null;
}

export async function readPaymentDisplay(prismaClient, orderId) {
  if (!isValidOrderId(orderId)) {
    return {
      orderId: null,
      copy: PAYMENT_DISPLAY.unknown,
      paymentStatus: null,
    };
  }

  const payment = await prismaClient.payment.findUnique({
    where: { orderId },
    select: { status: true, orderId: true },
  });

  if (!payment) {
    return {
      orderId,
      copy: PAYMENT_DISPLAY.pending,
      paymentStatus: null,
    };
  }

  return {
    orderId: payment.orderId,
    copy: displayFromStoredPaymentStatus(payment.status),
    paymentStatus: payment.status,
  };
}
