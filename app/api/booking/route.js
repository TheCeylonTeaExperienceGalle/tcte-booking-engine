import { NextResponse } from "next/server";
import { createHash } from "crypto";
import prisma from "@/lib/prisma";
import {
  buildDateRange,
  getSessionAvailability,
  lockSessions,
} from "@/lib/availability";
import {
  calculateBookingPricing,
  PricingError,
} from "@/lib/pricing/booking-pricing";
import { appendOrderIdToUrl } from "@/lib/payments/payhere-urls";
import { isPayHereEnabled } from "@/lib/payments/payhere-enabled";
import {
  buildPublicBookingResponse,
  isCheckoutAttemptUniqueConflict,
  normalizeCheckoutAttemptId,
} from "@/lib/bookings/checkout-attempt";

const PAYMENT_TYPES = new Set(["Full", "Partial", "Later"]);
const PAYMENT_PROVIDERS = new Set(["MANUAL", "PAYHERE"]);
const PAYHERE_DEFAULT_ACTION_URL =
  process.env.PAYHERE_CHECKOUT_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://www.payhere.lk/pay/checkout"
    : "https://sandbox.payhere.lk/pay/checkout");

class HttpError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

class ConcurrencyError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConcurrencyError";
    this.retryable = true;
  }
}

const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY_MS = 100;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error) {
  const message = error?.message?.toLowerCase() || "";
  const code = error?.code || "";

  // Deadlock detected
  if (message.includes("deadlock") || code === "40001") return true;
  // Lock wait timeout
  if (message.includes("lock wait timeout") || code === "HY000") return true;
  // Serialization failure
  if (message.includes("could not serialize") || code === "40001") return true;
  // Concurrency error thrown by our code
  if (error instanceof ConcurrencyError) return true;

  return false;
}

export async function POST(request) {
  let checkoutAttemptId = null;
  try {
    const payload = await request.json();
    const validationError = validatePayload(payload);

    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      );
    }

    const {
      leaderId,
      bookedDate,
      additionalNotes,
      selections,
      payment = {},
      customer = {},
      checkoutAttemptId: rawCheckoutAttemptId,
    } = payload;

    const parsedCheckoutAttemptId = normalizeCheckoutAttemptId(rawCheckoutAttemptId);
    if (rawCheckoutAttemptId && !parsedCheckoutAttemptId) {
      return NextResponse.json(
        { success: false, error: "checkoutAttemptId must be a UUID" },
        { status: 400 }
      );
    }
    if (!parsedCheckoutAttemptId) {
      return NextResponse.json(
        { success: false, error: "checkoutAttemptId is required" },
        { status: 400 }
      );
    }
    checkoutAttemptId = parsedCheckoutAttemptId;

    const {
      paymentType,
      provider: rawProvider,
      method,
      transactionId,
    } = payment;

    const normalizedProvider =
      typeof rawProvider === "string" ? rawProvider.toUpperCase() : "MANUAL";
    const paymentProvider = PAYMENT_PROVIDERS.has(normalizedProvider)
      ? normalizedProvider
      : "MANUAL";

    if (paymentProvider === "PAYHERE" && !isPayHereEnabled()) {
      return NextResponse.json(
        { success: false, error: "Online payment is currently unavailable." },
        { status: 400 }
      );
    }

    const existingCheckout = await prisma.booking.findUnique({
      where: { checkoutAttemptId },
      include: { payment: true },
    });
    if (existingCheckout) {
      return NextResponse.json(
        await buildExistingCheckoutResponse(existingCheckout)
      );
    }

    const bookingDate = new Date(bookedDate);
    if (Number.isNaN(bookingDate.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid bookedDate provided" },
        { status: 400 }
      );
    }

    const bookingRange = buildDateRange(bookingDate);
    if (!bookingRange) {
      return NextResponse.json(
        { success: false, error: "Unable to normalize bookedDate" },
        { status: 400 }
      );
    }

    const leader = await prisma.leader.findFirst({
      where: { id: leaderId, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        contact: true,
      },
    });

    if (!leader) {
      return NextResponse.json(
        { success: false, error: "Leader not found" },
        { status: 404 }
      );
    }

    const sessionIds = [...new Set(selections.map((selection) => selection.sessionId))];
    const sessions = await prisma.session.findMany({
      where: { id: { in: sessionIds } },
      select: {
        id: true,
        programId: true,
        startTime: true,
        endTime: true,
        price: true,
        specialPrice: true,
        sessionTypes: {
          select: { id: true, price: true, specialPrice: true },
        },
      },
    });

    if (sessions.length !== sessionIds.length) {
      return NextResponse.json(
        { success: false, error: "One or more sessions do not exist" },
        { status: 400 }
      );
    }

    const sessionMap = new Map(sessions.map((session) => [session.id, session]));

    try {
      validateSessionConflicts(selections, sessionMap);
    } catch (conflictError) {
      return NextResponse.json(
        { success: false, error: conflictError.message },
        { status: 400 }
      );
    }

    const programId = sessions[0]?.programId;
    const discountRules = programId
      ? await prisma.discountRule.findMany({
          where: {
            programId,
            isActive: true,
            deletedAt: null,
          },
          orderBy: { priority: "desc" },
        })
      : [];

    let pricing;
    try {
      pricing = calculateBookingPricing({
        selections,
        sessionMap,
        discountRules,
        paymentType,
        provider: paymentProvider,
      });
    } catch (pricingError) {
      const status =
        pricingError instanceof PricingError ? pricingError.status : 400;
      return NextResponse.json(
        { success: false, error: pricingError.message },
        { status }
      );
    }

    const {
      fullTotal,
      amountDueNow,
      balance,
      paymentStatus,
      bookingStatus,
      currency,
    } = pricing;

    const resolvedOrderId = generatePayHereOrderId(leaderId);

    const paymentMethodName =
      paymentProvider === "PAYHERE"
        ? "PayHere Checkout"
        : method?.trim() || method || null;

    const customerDetails = buildCustomerDetails(customer, leader);

    // Calculate total seats for commission
    const totalSeats = selections.reduce((sum, sel) => sum + sel.seatsRequested, 0);

    // Retry logic for handling concurrent booking conflicts
    let transactionResult;
    let lastError;

    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        transactionResult = await prisma.$transaction(
          async (tx) => {
            await validateAvailability(tx, bookingRange, selections, sessionMap);

            const paymentRecord = await tx.payment.create({
              data: {
                provider: paymentProvider,
                status: paymentStatus,
                amount: amountDueNow,
                currency,
                method: paymentMethodName,
                orderId: resolvedOrderId,
                transactionId:
                  paymentProvider === "MANUAL" && transactionId
                    ? transactionId
                    : null,
              },
            });

            const bookingRecord = await tx.booking.create({
              data: {
                leaderId,
                bookedDate: bookingDate,
                paymentType: pricing.paymentType,
                amount: fullTotal,
                balance,
                paymentId: paymentRecord.id,
                status: bookingStatus,
                additionalNotes: additionalNotes,
                checkoutAttemptId,
              },
            });

            const selectionCustomerIds = await createCustomerRecords(
              tx,
              leaderId,
              selections
            );

            await createBookingItems(
              tx,
              bookingRecord.id,
              bookingDate,
              selections,
              selectionCustomerIds
            );

            // Create commission record if applicable
            const commissionRecord = await createCommissionRecord(
              tx,
              bookingRecord.id,
              leaderId,
              totalSeats,
              fullTotal
            );

            return { bookingRecord, paymentRecord, commissionRecord };
          },
          {
            isolationLevel: "Serializable", // Strongest isolation to prevent race conditions
            timeout: 15000, // 15 second timeout
          }
        );

        // Success - break out of retry loop
        break;
      } catch (error) {
        lastError = error;

        if (isRetryableError(error) && attempt < MAX_RETRY_ATTEMPTS) {
          // Exponential backoff: 100ms, 200ms, 400ms...
          const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          console.error("Booking concurrency retry");
          await sleep(delayMs);
          continue;
        }

        // Non-retryable error or max attempts reached
        throw error;
      }
    }

    if (!transactionResult) {
      throw lastError || new Error("Booking transaction failed after all retry attempts");
    }

    const { bookingRecord, paymentRecord } = transactionResult;

    const booking = bookingRecord;

    let paymentRedirect = null;

    if (paymentProvider === "PAYHERE") {
      const payHereConfig = getPayHereConfig();
      const amountFormatted = formatPayHereAmount(paymentRecord.amount);
      const hashedSecret = md5Upper(payHereConfig.merchantSecret);
      const hash = md5Upper(
        `${payHereConfig.merchantId}${paymentRecord.orderId}${amountFormatted}${currency}${hashedSecret}`
      );

      const itemsLabel = buildPayHereItems(selections, sessionMap);

      const returnUrlWithOrder = appendOrderIdToUrl(
        payHereConfig.returnUrl,
        paymentRecord.orderId
      );
      const cancelUrlWithOrder = appendOrderIdToUrl(
        payHereConfig.cancelUrl,
        paymentRecord.orderId
      );

      paymentRedirect = {
        actionUrl: payHereConfig.actionUrl,
        params: {
          merchant_id: payHereConfig.merchantId,
          return_url: returnUrlWithOrder,
          cancel_url: cancelUrlWithOrder,
          notify_url: payHereConfig.notifyUrl,
          order_id: paymentRecord.orderId,
          items: itemsLabel,
          currency,
          amount: amountFormatted,
          first_name: customerDetails.firstName,
          last_name: customerDetails.lastName,
          email: customerDetails.email,
          phone: customerDetails.phone,
          address: customerDetails.address,
          city: customerDetails.city,
          country: customerDetails.country,
          hash,
          custom_1: String(booking.id),
          custom_2: String(leaderId),
        },
      };

      await prisma.payment.update({
        where: { id: paymentRecord.id },
        data: {
          payhereMd5Sig: hash,
          metadata: {
            checkout: {
              generatedAt: new Date().toISOString(),
              items: itemsLabel,
            },
          },
        },
      });
    }

    return NextResponse.json(
      buildPublicBookingResponse({
        bookingId: booking.id,
        referenceCode: paymentRecord.orderId,
        paymentProvider,
        paymentRedirect,
        duplicate: false,
      })
    );
  } catch (error) {
    if (isCheckoutAttemptUniqueConflict(error)) {
      const replay = await replayExistingCheckout(checkoutAttemptId, {
        retries: 8,
        delayMs: 25,
      });
      if (replay) {
        return NextResponse.json(replay);
      }
    }

    console.error("Booking creation failed");

    // Handle specific concurrency-related errors with user-friendly messages
    if (isRetryableError(error)) {
      return NextResponse.json(
        {
          success: false,
          error: "This session is experiencing high demand. Please try again in a moment.",
          code: "CONCURRENCY_ERROR",
        },
        { status: 409 }
      );
    }

    const status = error instanceof HttpError ? error.status : 500;
    const message =
      error?.message || "An unexpected error occurred while creating the booking";

    return NextResponse.json({ success: false, error: message }, { status });
  }
}

async function replayExistingCheckout(attemptId, options = {}) {
  if (!attemptId) {
    return null;
  }
  const retries = Number.isInteger(options.retries) ? options.retries : 0;
  const delayMs = Number.isInteger(options.delayMs) ? options.delayMs : 25;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const existing = await prisma.booking.findUnique({
      where: { checkoutAttemptId: attemptId },
      include: { payment: true },
    });
    if (existing) {
      return buildExistingCheckoutResponse(existing);
    }
    if (attempt < retries) {
      await sleep(delayMs);
    }
  }
  return null;
}

async function buildExistingCheckoutResponse(existingCheckout) {
  const paymentRecord = existingCheckout.payment;
  let paymentRedirect = null;

  if (paymentRecord?.provider === "PAYHERE" && isPayHereEnabled()) {
    const payHereConfig = getPayHereConfig();
    const currency = paymentRecord.currency || "USD";
    const amountFormatted = formatPayHereAmount(paymentRecord.amount);
    const hashedSecret = md5Upper(payHereConfig.merchantSecret);
    const hash = md5Upper(
      `${payHereConfig.merchantId}${paymentRecord.orderId}${amountFormatted}${currency}${hashedSecret}`
    );
    paymentRedirect = {
      actionUrl: payHereConfig.actionUrl,
      params: {
        merchant_id: payHereConfig.merchantId,
        return_url: appendOrderIdToUrl(
          payHereConfig.returnUrl,
          paymentRecord.orderId
        ),
        cancel_url: appendOrderIdToUrl(
          payHereConfig.cancelUrl,
          paymentRecord.orderId
        ),
        notify_url: payHereConfig.notifyUrl,
        order_id: paymentRecord.orderId,
        items: "Tea Experience Booking",
        currency,
        amount: amountFormatted,
        hash,
        custom_1: String(existingCheckout.id),
        custom_2: String(existingCheckout.leaderId),
      },
    };
  }

  return buildPublicBookingResponse({
    bookingId: existingCheckout.id,
    referenceCode: paymentRecord?.orderId,
    paymentProvider: paymentRecord?.provider,
    paymentRedirect,
    duplicate: true,
  });
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object") {
    return "Invalid request payload";
  }

  const { leaderId, bookedDate, selections, payment } = payload;

  if (!leaderId) {
    return "leaderId is required";
  }

  if (!bookedDate) {
    return "bookedDate is required";
  }

  if (!Array.isArray(selections) || selections.length === 0) {
    return "At least one selection is required";
  }

  for (const selection of selections) {
    if (!selection.sessionId) {
      return "Each selection must include sessionId";
    }

    if (!selection.seatsRequested || selection.seatsRequested <= 0) {
      return "seatsRequested must be greater than 0";
    }
  }

  if (!payment) {
    return "Payment details are required";
  }

  if (!PAYMENT_TYPES.has(payment.paymentType)) {
    return "Unsupported payment type";
  }

  const provider =
    typeof payment.provider === "string"
      ? payment.provider.toUpperCase()
      : "MANUAL";

  if (!PAYMENT_PROVIDERS.has(provider)) {
    return "Unsupported payment provider";
  }

  if (provider === "MANUAL") {
    if (!payment.method) {
      return "Payment method is required";
    }

    if (payment.paymentType !== "Later" && !payment.transactionId) {
      return "Payment transactionId is required";
    }
  }

  return null;
}

function validateSessionConflicts(selections, sessionMap) {
  if (selections.length <= 1) {
    return;
  }

  const intervals = selections.map((selection) => {
    const session = sessionMap.get(selection.sessionId);

    if (!session) {
      throw new HttpError(`Session ${selection.sessionId} not found`);
    }

    const startTime = session.startTime?.getTime?.();
    const endTime = session.endTime?.getTime?.();

    if (typeof startTime !== "number" || typeof endTime !== "number") {
      throw new HttpError("Session times are missing or invalid");
    }

    if (endTime <= startTime) {
      throw new HttpError(
        `Session ${selection.sessionId} has an invalid time range`
      );
    }

    return {
      sessionId: selection.sessionId,
      start: startTime,
      end: endTime,
    };
  });

  intervals.sort((a, b) => a.start - b.start);

  for (let index = 1; index < intervals.length; index += 1) {
    const previous = intervals[index - 1];
    const current = intervals[index];

    // If IDs are the same, it's the same session (e.g. split by session type), so no conflict
    if (previous.sessionId === current.sessionId) {
      continue;
    }

    if (previous.start < current.end && previous.end > current.start) {
      throw new HttpError(
        `Session ${previous.sessionId} overlaps with session ${current.sessionId}`
      );
    }
  }
}

async function validateAvailability(tx, bookingRange, selections, sessionMap) {
  if (!bookingRange) {
    throw new HttpError("Invalid booking date supplied");
  }

  const sessionTotals = new Map();
  for (const selection of selections) {
    const current = sessionTotals.get(selection.sessionId) || 0;
    sessionTotals.set(selection.sessionId, current + selection.seatsRequested);
  }

  const sessionIds = Array.from(sessionTotals.keys());
  if (sessionIds.length === 0) {
    throw new HttpError("No sessions supplied for availability validation");
  }

  await lockSessions(tx, sessionIds);
  const availabilityMap = await getSessionAvailability(
    tx,
    sessionIds,
    bookingRange
  );

  for (const [sessionId, totalSeatsRequested] of sessionTotals) {
    if (!sessionMap.has(sessionId)) {
      throw new HttpError(`Session ${sessionId} not found`);
    }

    const availability = availabilityMap.get(sessionId);
    if (!availability) {
      throw new HttpError(
        `Availability could not be derived for session ${sessionId}`
      );
    }

    if (availability.available < totalSeatsRequested) {
      const sessionInfo = sessionMap.get(sessionId);
      throw new HttpError(
        `Sorry, only ${availability.available} seat(s) remaining for this session. You requested ${totalSeatsRequested}. Please reduce the number of seats or choose a different session.`,
        409
      );
    }
  }
}


async function createCustomerRecords(tx, leaderId, selections) {
  const selectionCustomerIds = [];

  for (const selection of selections) {
    const { seatsRequested, customers } = selection;

    if (seatsRequested > 1) {
      if (!Array.isArray(customers) || customers.length !== seatsRequested) {
        throw new HttpError(
          `Expected ${seatsRequested} customers for session ${selection.sessionId}`
        );
      }

      const customerIds = [];

      for (const customerData of customers) {
        if (!customerData?.name || !customerData?.email) {
          throw new HttpError("Customer name and email are required");
        }

        // Create a new customer record for every booking to allow reusability
        // and avoid conflicts between leaders or previous bookings.
        const createdCustomer = await tx.customer.create({
          data: {
            leaderId,
            name: customerData.name,
            email: customerData.email,
            phone: customerData.phone ?? null,
            nic: customerData.nic ?? null,
          },
        });

        customerIds.push(createdCustomer.id);
      }

      selectionCustomerIds.push(customerIds);
    } else if (
      seatsRequested === 1 &&
      Array.isArray(customers) &&
      customers.length === 1
    ) {
      const customerData = customers[0];

      if (!customerData?.name || !customerData?.email) {
        throw new HttpError("Customer name and email are required");
      }

      // Create a new customer record for every booking
      const createdCustomer = await tx.customer.create({
        data: {
          leaderId,
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone ?? null,
          nic: customerData.nic ?? null,
        },
      });

      selectionCustomerIds.push([createdCustomer.id]);
    } else {
      selectionCustomerIds.push([]);
    }
  }

  return selectionCustomerIds;
}

function generatePayHereOrderId(leaderId) {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.floor(Math.random() * 1_000_000)
    .toString(36)
    .toUpperCase();
  return `RV-${leaderId}-${timestamp}-${random}`.slice(0, 40);
}

function formatPayHereAmount(amount) {
  const numeric = Number(amount || 0);
  return Number.isNaN(numeric) ? "0.00" : numeric.toFixed(2);
}

function md5Upper(value) {
  return createHash("md5").update(String(value)).digest("hex").toUpperCase();
}

function getPayHereConfig() {
  const merchantId = process.env.PAYHERE_MERCHANT_ID;
  const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
  const returnUrl = process.env.PAYHERE_RETURN_URL;
  const cancelUrl = process.env.PAYHERE_CANCEL_URL;
  const notifyUrl = process.env.PAYHERE_NOTIFY_URL;

  if (!merchantId || !merchantSecret || !returnUrl || !cancelUrl || !notifyUrl) {
    throw new HttpError("PayHere integration is not configured", 500);
  }

  return {
    merchantId,
    merchantSecret,
    returnUrl,
    cancelUrl,
    notifyUrl,
    actionUrl: PAYHERE_DEFAULT_ACTION_URL,
  };
}

function buildCustomerDetails(customer, leader) {
  const safeName = (customer?.name || leader?.name || "Guest").trim();
  const [firstNameRaw, ...rest] = safeName.split(/\s+/);
  const firstName = customer?.firstName?.trim() || firstNameRaw || "Guest";
  const lastNameValue = customer?.lastName?.trim() || rest.join(" ") || "Customer";
  const email = (customer?.email || leader?.email || "guest@example.com").trim();
  const phone = (customer?.phone || leader?.contact || "0000000000").trim();
  const address = customer?.address?.trim() || "N/A";
  const city = customer?.city?.trim() || "Colombo";
  const country = customer?.country?.trim() || "Sri Lanka";

  return {
    firstName,
    lastName: lastNameValue,
    email,
    phone,
    address,
    city,
    country,
  };
}

function buildPayHereItems(selections, sessionMap) {
  const sessionNames = new Set();

  selections.forEach((selection) => {
    const session = sessionMap.get(selection.sessionId);
    if (session?.name) {
      sessionNames.add(session.name);
    }
  });

  if (sessionNames.size === 0) {
    return "Tea Experience Booking";
  }

  const namesArray = Array.from(sessionNames);
  const baseLabel = namesArray.slice(0, 3).join(", ");
  const suffix = namesArray.length > 3 ? "..." : "";
  return `Tea Sessions: ${baseLabel}${suffix}`.slice(0, 100);
}

async function createBookingItems(
  tx,
  bookingId,
  bookedDate,
  selections,
  selectionCustomerIds
) {
  for (let index = 0; index < selections.length; index += 1) {
    const selection = selections[index];
    const customerIds = selectionCustomerIds[index];

    if (selection.seatsRequested === 1 && customerIds.length === 0) {
      await tx.bookingItem.create({
        data: {
          bookingId,
          sessionId: selection.sessionId,
          sessionTypeId: selection.sessionTypeId ?? null,
          quantity: 1,
          customerId: null,
          date: bookedDate,
        },
      });

      continue;
    }

    if (selection.seatsRequested > 1) {
      if (customerIds.length !== selection.seatsRequested) {
        throw new HttpError(
          `Customer records mismatch for session ${selection.sessionId}`
        );
      }

      for (const customerId of customerIds) {
        await tx.bookingItem.create({
          data: {
            bookingId,
            sessionId: selection.sessionId,
            sessionTypeId: selection.sessionTypeId ?? null,
            quantity: 1,
            customerId,
            date: bookedDate,
          },
        });
      }

      continue;
    }

    if (selection.seatsRequested === 1 && customerIds.length === 1) {
      await tx.bookingItem.create({
        data: {
          bookingId,
          sessionId: selection.sessionId,
          sessionTypeId: selection.sessionTypeId ?? null,
          quantity: 1,
          customerId: customerIds[0],
          date: bookedDate,
        },
      });
    }
  }
}

// Calculate and create commission record for a booking
async function createCommissionRecord(tx, bookingId, leaderId, totalSeats, bookingAmount) {
  // Check if the leader has role LEADER (only leaders with promo codes can earn commission)
  const leader = await tx.leader.findFirst({
    where: { id: leaderId, deletedAt: null },
    select: { role: true, promoteCode: true },
  });

  // Only create commission for LEADERs with promo codes
  if (!leader || leader.role !== "LEADER" || !leader.promoteCode) {
    return null;
  }

  // Find the applicable commission rule based on total seats
  const commissionRule = await tx.commissionRule.findFirst({
    where: {
      deletedAt: null,
      isActive: true,
      minSeats: { lte: totalSeats },
      OR: [
        { maxSeats: { gte: totalSeats } },
        { maxSeats: null }, // Unlimited max seats
      ],
    },
    orderBy: { minSeats: "desc" }, // Get the most specific rule
  });

  // No applicable commission rule found
  if (!commissionRule) {
    return null;
  }

  // Calculate commission amount
  const commissionAmount = (bookingAmount * commissionRule.commissionRate) / 100;

  // Create the commission record
  const commission = await tx.commission.create({
    data: {
      bookingId,
      leaderId,
      totalSeats,
      bookingAmount,
      commissionRate: commissionRule.commissionRate,
      commissionAmount,
      paymentStatus: "PENDING",
    },
  });

  return commission;
}
