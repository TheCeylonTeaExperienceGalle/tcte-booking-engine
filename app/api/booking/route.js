import { NextResponse } from "next/server";
import { createHash } from "crypto";
import prisma from "@/lib/prisma";
import { sendBookingConfirmation } from "@/lib/email";
import {
  buildDateRange,
  getSessionAvailability,
  lockSessions,
} from "@/lib/availability";
import { isSessionPastInColombo } from "@/lib/dateUtils";
import { requirePermission } from "@/lib/auth";

const PAYMENT_TYPES = new Set(["Full", "Partial", "Later"]);
const PAYMENT_PROVIDERS = new Set(["MANUAL", "PAYHERE"]);
const DEFAULT_CURRENCY = "USD";
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

const MAX_RETRY_ATTEMPTS = 5;
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
  
  // Unique constraint collision on auto-generated transactionId or orderId (Prisma P2002)
  if (code === "P2002") {
    const target = String(error?.meta?.target || "");
    if (target.includes("transactionId") || message.includes("transactionid")) {
      return true;
    }
  }

  return false;
}

export async function POST(request) {
  try {
    const payload = await request.json();
    console.log("Received booking payload:", payload);

    // Determine authenticated caller permission for admin source vs online booking
    let isAuthorizedAdmin = false;
    const authCheck = await requirePermission(request, "bookings", "write");
    if (authCheck.authorized) {
      isAuthorizedAdmin = true;
    } else if (payload?.source === "ADMIN") {
      return NextResponse.json(
        { success: false, error: authCheck.error || "Forbidden: Authenticated bookings write permission required for ADMIN source" },
        { status: 403 }
      );
    }

    const effectiveSource = isAuthorizedAdmin && payload?.source === "ADMIN" ? "ADMIN" : "ONLINE";

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
      status: requestedStatus,
    } = payload;

    const {
      paymentType,
      amount: partialAmount,
      paidAmount: explicitPaidAmount,
      provider: rawProvider,
      method,
      full_payment_price,
      transactionId,
      currency: paymentCurrency,
      orderId: providedOrderId,
    } = payment;

    const normalizedProvider =
      typeof rawProvider === "string" ? rawProvider.toUpperCase() : "MANUAL";
    const paymentProvider = PAYMENT_PROVIDERS.has(normalizedProvider)
      ? normalizedProvider
      : "MANUAL";

    const rawDateStr = typeof bookedDate === "string" ? bookedDate.split("T")[0] : "";
    const bookingDate = rawDateStr ? new Date(`${rawDateStr}T00:00:00.000Z`) : new Date(bookedDate);
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

    let leader = null;
    const parsedLeaderId = leaderId ? Number(leaderId) : null;

    if (parsedLeaderId && !Number.isNaN(parsedLeaderId) && parsedLeaderId > 0) {
      leader = await prisma.leader.findFirst({
        where: { id: parsedLeaderId, deletedAt: null },
        select: {
          id: true,
          name: true,
          email: true,
          contact: true,
          status: true,
          role: true,
        },
      });

      if (!leader) {
        return NextResponse.json(
          { success: false, error: "Travel Agent not found" },
          { status: 404 }
        );
      }

      if (leader.role === "LEADER" && leader.status === "PENDING") {
        return NextResponse.json(
          { success: false, error: "This travel agent account is pending admin verification." },
          { status: 403 }
        );
      }

      if (leader.role === "LEADER" && leader.status === "DEACTIVATED") {
        return NextResponse.json(
          { success: false, error: "This travel agent account has been locked. Please contact support." },
          { status: 403 }
        );
      }
    } else {
      // Direct booking without a travel agent: resolve or create a Direct Contact profile (role: USER)
      const primaryGuest = customer?.email
        ? customer
        : selections?.[0]?.customers?.[0] || {};
      const directName = (primaryGuest.name || "Direct Guest").trim();
      const directEmail = (primaryGuest.email || "direct-booking@reviva.internal").trim().toLowerCase();
      const directContact = (primaryGuest.phone || primaryGuest.contact || null)?.trim() || null;

      leader = await prisma.leader.findFirst({
        where: { email: directEmail, role: "USER", deletedAt: null },
        select: {
          id: true,
          name: true,
          email: true,
          contact: true,
          status: true,
          role: true,
        },
      });

      if (!leader) {
        const existingAny = await prisma.leader.findFirst({
          where: { email: directEmail },
        });

        const contactEmail = existingAny
          ? `direct-${Date.now()}-${directEmail}`
          : directEmail;

        leader = await prisma.leader.create({
          data: {
            name: directName,
            email: contactEmail,
            contact: directContact,
            role: "USER",
            status: "ACTIVE",
          },
          select: {
            id: true,
            name: true,
            email: true,
            contact: true,
            status: true,
            role: true,
          },
        });
      }
    }

    const resolvedLeaderId = leader.id;

    // Check for duplicate transactionId for manual payments
    if (paymentProvider === "MANUAL" && transactionId && !transactionId.startsWith("Auto-generated")) {
      const existingPayment = await prisma.payment.findUnique({
        where: { transactionId: transactionId.trim() },
        select: { id: true, orderId: true },
      });
      if (existingPayment) {
        return NextResponse.json(
          {
            success: false,
            error: `Transaction reference "${transactionId.trim()}" has already been used for another booking. Please enter a unique transaction reference.`,
          },
          { status: 409 }
        );
      }
    }

    const sessionIds = [...new Set(selections.map((selection) => selection.sessionId))];
    const sessions = await prisma.session.findMany({
      where: { id: { in: sessionIds } },
      select: {
        id: true,
        name: true,
        programId: true,
        startTime: true,
        endTime: true,
        price: true,
        specialPrice: true,
        program: {
          select: {
            id: true,
            title: true,
            location: {
              select: { id: true, name: true },
            },
          },
        },
        sessionTypes: {
          select: { id: true, name: true, price: true, specialPrice: true },
        },
      },
    });

    if (sessions.length !== sessionIds.length) {
      return NextResponse.json(
        { success: false, error: "One or more sessions do not exist" },
        { status: 400 }
      );
    }

    // Enforce that all selected sessions belong to the same location (disallow all-location / multi-location bookings)
    const distinctLocations = new Set(
      sessions
        .map((s) => s.program?.location?.id)
        .filter((id) => id !== undefined && id !== null)
    );

    if (distinctLocations.size > 1) {
      return NextResponse.json(
        {
          success: false,
          error: "Bookings cannot span across multiple locations. All selected sessions must belong to the same location.",
        },
        { status: 400 }
      );
    }

    const sessionMap = new Map(sessions.map((session) => [session.id, session]));

    const programId = sessions[0]?.programId;
    const program = programId
      ? await prisma.program.findUnique({
          where: { id: programId },
          select: { id: true },
        })
      : null;

    // Enforce that no selected session has already started or passed in Sri Lanka time
    for (const selection of selections) {
      const sess = sessionMap.get(selection.sessionId);
      if (sess && isSessionPastInColombo(bookedDate, sess.startTime)) {
        return NextResponse.json(
          {
            success: false,
            error: `Session "${sess.name}" is unavailable (bookings close 4 hours before session start). Please choose an upcoming session.`,
          },
          { status: 400 }
        );
      }
    }

    try {
      validateSessionConflicts(selections, sessionMap);
    } catch (conflictError) {
      return NextResponse.json(
        { success: false, error: conflictError.message },
        { status: 400 }
      );
    }

    let pricing;

    try {
      pricing = calculatePrice(selections, sessionMap);
    } catch (pricingError) {
      return NextResponse.json(
        { success: false, error: pricingError.message },
        { status: 400 }
      );
    }

    const totalBaseAmount = pricing.reduce(
      (sum, item) => sum + item.sessionBasePrice * item.seatsRequested,
      0
    );
    const totalAddOnAmount = pricing.reduce(
      (sum, item) => sum + item.sessionTypePrice * item.seatsRequested,
      0
    );
    const perSeatBaseCombinationTotal = pricing.reduce(
      (sum, item) => sum + item.sessionBasePrice,
      0
    );
    const totalAmount = totalBaseAmount + totalAddOnAmount;
    const seatCounts = selections.map((selection) => selection.seatsRequested || 0);
    const seatsEligibleForDiscount =
      seatCounts.length > 0 ? Math.min(...seatCounts) : 0;

    let discountAmount = 0;
    const programPrice = 0;
    const totalAmountWithProgramPrice = totalAmount;

    // Fetch discount rules across all programs represented in the selections
    const allProgramIds = Array.from(
      new Set(
        selections
          .map((sel) => sessionMap.get(sel.sessionId)?.programId)
          .filter(Boolean)
      )
    );

    if (allProgramIds.length > 0) {
      const discountRules = await prisma.discountRule.findMany({
        where: {
          programId: { in: allProgramIds },
          isActive: true,
          deletedAt: null,
        },
        orderBy: { priority: "desc" },
      });

      for (const pId of allProgramIds) {
        const progSelections = selections.filter(
          (sel) => sessionMap.get(sel.sessionId)?.programId === pId
        );
        const progSessionIds = progSelections.map((sel) => sel.sessionId);
        const progSeatCounts = progSelections.map((sel) => sel.seatsRequested || 0);
        const progSeats = progSeatCounts.length > 0 ? Math.min(...progSeatCounts) : 0;

        if (progSeats <= 0) continue;

        const programRules = discountRules.filter((r) => r.programId === pId);
        const matchingRules = [];

        for (const rule of programRules) {
          let ruleSessionIds = [];
          try {
            ruleSessionIds = JSON.parse(rule.sessionIds || "[]")
              .map((value) => Number(value))
              .filter((value) => !Number.isNaN(value));
          } catch {
            ruleSessionIds = [];
          }

          if (
            ruleSessionIds.length > 0 &&
            ruleSessionIds.every((id) => progSessionIds.includes(id))
          ) {
            matchingRules.push({
              rule,
              requiredSessionCount: ruleSessionIds.length,
              discountValue: rule.discountValue,
              priority: rule.priority || 0,
            });
          }
        }

        // Sort matching rules: priority DESC, session count DESC (Combo II beats Combo I), discountValue DESC
        matchingRules.sort((a, b) => {
          if (b.priority !== a.priority) return b.priority - a.priority;
          if (b.requiredSessionCount !== a.requiredSessionCount)
            return b.requiredSessionCount - a.requiredSessionCount;
          return b.discountValue - a.discountValue;
        });

        if (matchingRules.length > 0) {
          const best = matchingRules[0];
          if (best.rule.discountType === "PERCENTAGE") {
            const progTotal = progSelections.reduce((sum, sel) => {
              const s = sessionMap.get(sel.sessionId);
              return sum + (s?.specialPrice ?? s?.price ?? 0) * (sel.seatsRequested || 1);
            }, 0);
            discountAmount += (progTotal * best.rule.discountValue) / 100;
          } else {
            // Flat deduction per seat
            discountAmount += best.rule.discountValue * progSeats;
          }
        }
      }
    }

    // Apply discounts to the entire total (base + add-ons)
    const finalTotalAmount = Math.max(0, totalAmountWithProgramPrice - discountAmount);

    const isPartialOrInstallment = paymentType === "Partial" || paymentType === "Installment";
    let paidAmount = finalTotalAmount;

    if (explicitPaidAmount != null && !isNaN(Number(explicitPaidAmount))) {
      paidAmount = Number(explicitPaidAmount);
    } else if (typeof partialAmount === 'number' && isPartialOrInstallment) {
      paidAmount = partialAmount;
    }
    
    if (isPartialOrInstallment) {
      if (paidAmount > finalTotalAmount) paidAmount = finalTotalAmount;
      if (paidAmount < 0) paidAmount = 0;
    }

    if (paymentType === "Later") {
      paidAmount = 0;
    }

    // Calculate balance: total price minus what's being paid now
    const totalPrice = full_payment_price ?? finalTotalAmount;
    const balance = Math.max(0, totalPrice - paidAmount);

    const currency =
      typeof paymentCurrency === "string" && paymentCurrency.trim().length > 0
        ? paymentCurrency.trim().toUpperCase()
        : DEFAULT_CURRENCY;

    const resolvedOrderId = providedOrderId?.trim() || generatePayHereOrderId(leaderId);

    const paymentMethodName =
      paymentProvider === "PAYHERE"
        ? "PayHere Checkout"
        : method?.trim() || method || null;

    const customerDetails = buildCustomerDetails(customer, leader);

    // Calculate total seats for commission (party size across sessions)
    // When booking for multiple sessions (e.g. 2 seats morning + 2 seats afternoon),
    // count as 2 seats rather than summing all sessions.
    const sessionSeatsMap = new Map();
    for (const sel of selections) {
      const sId = sel.sessionId;
      sessionSeatsMap.set(sId, (sessionSeatsMap.get(sId) || 0) + (sel.seatsRequested || 0));
    }
    const totalSeats = sessionSeatsMap.size > 0 ? Math.max(...sessionSeatsMap.values()) : 0;

    // Retry logic for handling concurrent booking conflicts
    let transactionResult;
    let lastError;
    
    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        transactionResult = await prisma.$transaction(
          async (tx) => {
            await validateAvailability(tx, bookingRange, selections, sessionMap);

            let finalTransactionId = null;
            if (paymentProvider === "MANUAL") {
              if (transactionId && !transactionId.startsWith("Auto-generated") && !transactionId.startsWith("TEST-")) {
                finalTransactionId = transactionId.trim();
              } else if (paymentType === "Later" && effectiveSource !== "ADMIN") {
                // Online "Pay Later": no financial transaction has taken place yet.
                // It is tracked by its reservation order reference (orderId).
                // TXN reference is assigned when payment is actually collected/recorded.
                finalTransactionId = null;
              } else {
                finalTransactionId = await generateNextTransactionId(tx);
              }
            }

            const paymentRecord = await tx.payment.create({
              data: {
                provider: paymentProvider,
                status: (paymentProvider === "PAYHERE" || paymentType === "Later" || balance > 0) ? "PENDING" : "SUCCESS",
                amount: paidAmount,
                currency,
                method: paymentMethodName,
                orderId: resolvedOrderId,
                transactionId: finalTransactionId,
              },
            });

            const finalBookingStatus = isAuthorizedAdmin && requestedStatus
              ? requestedStatus
              : (balance === 0 && paymentType !== "Later" ? "CONFIRMED" : "PENDING");

            const bookingRecord = await tx.booking.create({
              data: {
                leaderId: resolvedLeaderId,
                bookedDate: bookingDate,
                source: effectiveSource,
                paymentType: isPartialOrInstallment ? "Partial" : (paymentType === "Later" ? "Later" : "Full"),
                amount: totalPrice,
                balance: balance,
                paymentId: paymentRecord.id,
                status: finalBookingStatus,
                additionalNotes: additionalNotes ?? null,
              },
            });

            const selectionCustomerIds = await createCustomerRecords(
              tx,
              resolvedLeaderId,
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
              resolvedLeaderId,
              totalSeats,
              finalTotalAmount
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
          // Exponential backoff with jitter
          const jitter = Math.floor(Math.random() * 50);
          const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1) + jitter;
          console.log(`Booking attempt ${attempt} failed due to concurrency (${error?.message || error?.code}), retrying in ${delayMs}ms...`);
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

      // Append order_id to return and cancel URLs so the result page can update the DB
      const returnUrlWithOrder = `${payHereConfig.returnUrl}&order_id=${paymentRecord.orderId}`;
      const cancelUrlWithOrder = `${payHereConfig.cancelUrl}&order_id=${paymentRecord.orderId}`;

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
          custom_2: String(resolvedLeaderId),
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

    // Format booked items with session name, time slots, and add-on options for email
    const bookedItems = selections.map((sel) => {
      const session = sessionMap.get(sel.sessionId);
      const sessionType = sel.sessionTypeId
        ? session?.sessionTypes?.find((st) => st.id === sel.sessionTypeId)
        : null;

      return {
        sessionName: session?.name || `Activity #${sel.sessionId}`,
        programTitle: session?.program?.title || programInfo?.title || "Tea Experience",
        startTime: session?.startTime || null,
        endTime: session?.endTime || null,
        sessionTypeName: sessionType?.name || null,
        seats: sel.seatsRequested || 1,
      };
    });

    const programInfo = sessions[0]?.program;

    // Trigger email notification asynchronously without blocking response
    sendBookingConfirmation({
      id: booking.id,
      bookingNumber: paymentRecord.orderId,
      date: bookingDate,
      programTitle: programInfo?.title || null,
      location: programInfo?.location?.name || null,
      currency: currency || "USD",
      totalPrice: totalPrice,
      paidAmount: paidAmount,
      balance: balance,
      paymentType: paymentType,
      paymentMethod: paymentMethodName || (paymentType === "Later" ? "Pay Later" : paymentType),
      items: bookedItems,
      email: customerDetails.email,
      firstName: customerDetails.firstName,
      lastName: customerDetails.lastName,
    }).catch((err) => console.error("Error triggering booking email:", err));

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      referenceCode: paymentRecord.orderId,
      message:
        paymentProvider === "PAYHERE"
          ? "Booking created. Redirecting to payment gateway."
          : "Booking created successfully",
      paymentRedirect,
    });
  } catch (error) {
    console.error("Booking creation failed", error);
    
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

    if (error?.code === "P2002") {
      const target = String(error?.meta?.target || "");
      if (target.includes("transactionId")) {
        return NextResponse.json(
          {
            success: false,
            error: "This transaction reference has already been used. Please provide a unique transaction reference.",
          },
          { status: 409 }
        );
      }
    }
    
    const status = error instanceof HttpError ? error.status : 500;
    const message =
      error?.message || "An unexpected error occurred while creating the booking";

    return NextResponse.json({ success: false, error: message }, { status });
  }
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object") {
    return "Invalid request payload";
  }

  const { leaderId, bookedDate, selections, payment } = payload;

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

function calculatePrice(selections, sessionMap) {
  return selections.map((selection) => {
    const session = sessionMap.get(selection.sessionId);

    if (!session) {
      throw new HttpError(`Session ${selection.sessionId} not found`);
    }

    const sessionBasePrice = session.specialPrice ?? session.price ?? 0;
    let sessionTypePrice = 0;

    if (selection.sessionTypeId) {
      const sessionType = session.sessionTypes.find(
        (type) => type.id === selection.sessionTypeId
      );

      if (!sessionType) {
        throw new HttpError(
          `Session type ${selection.sessionTypeId} does not belong to session ${selection.sessionId}`
        );
      }

      sessionTypePrice = sessionType.specialPrice ?? sessionType.price ?? 0;
    }

    const unitPrice = sessionBasePrice + sessionTypePrice;

    if (unitPrice === null || unitPrice === undefined) {
      throw new HttpError(`Price not configured for session ${selection.sessionId}`);
    }

    const total = unitPrice * selection.seatsRequested;

    return {
      sessionId: selection.sessionId,
      sessionTypeId: selection.sessionTypeId ?? null,
      sessionBasePrice,
      sessionTypePrice,
      unitPrice,
      seatsRequested: selection.seatsRequested,
      total,
    };
  });
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

async function generateNextTransactionId(tx) {
  // Query the highest TXN record ordered by transactionId desc
  // Because 'TXN-000001' is zero-padded to 6 digits, lexicographical descending matches numeric order
  const latestTxn = await tx.payment.findFirst({
    where: {
      transactionId: { startsWith: "TXN-" },
    },
    orderBy: { transactionId: "desc" },
    select: { transactionId: true },
  });

  let maxNum = 0;
  if (latestTxn?.transactionId) {
    const match = latestTxn.transactionId.match(/^TXN-(\d+)$/i);
    if (match) {
      maxNum = parseInt(match[1], 10);
    }
  }

  const nextNum = maxNum + 1;
  return `TXN-${String(nextNum).padStart(6, "0")}`;
}

function generatePayHereOrderId(leaderId) {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.floor(Math.random() * 1_000_000)
    .toString(36)
    .toUpperCase();
  const prefix = leaderId ? `RV-${leaderId}` : "RV";
  return `${prefix}-${timestamp}-${random}`.slice(0, 40);
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

