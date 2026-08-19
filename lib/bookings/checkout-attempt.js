const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidCheckoutAttemptId(value) {
  return typeof value === "string" && UUID_PATTERN.test(value.trim());
}

export function normalizeCheckoutAttemptId(value) {
  if (value == null || value === "") {
    return null;
  }
  const trimmed = String(value).trim().toLowerCase();
  if (!isValidCheckoutAttemptId(trimmed)) {
    return null;
  }
  return trimmed;
}

export function isCheckoutAttemptUniqueConflict(error) {
  if (error?.code !== "P2002") {
    return false;
  }
  const target = error?.meta?.target;
  if (Array.isArray(target)) {
    return target.some((field) =>
      String(field).includes("checkoutAttemptId")
    );
  }
  if (typeof target === "string") {
    return target.includes("checkoutAttemptId");
  }
  return false;
}

export function buildPublicBookingResponse({
  bookingId,
  referenceCode,
  paymentProvider,
  paymentRedirect = null,
  duplicate = false,
}) {
  return {
    success: true,
    bookingId,
    referenceCode,
    duplicate,
    message: duplicate
      ? "Booking already created for this checkout attempt"
      : paymentProvider === "PAYHERE"
        ? "Booking created. Redirecting to payment gateway."
        : "Booking created successfully",
    paymentRedirect,
  };
}
