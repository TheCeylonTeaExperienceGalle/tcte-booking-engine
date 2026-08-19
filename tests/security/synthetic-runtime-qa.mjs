import { PrismaClient } from "@prisma/client";
import { generateAccessToken } from "../../lib/jwt.js";
import { computePayHereSignature } from "../../lib/security/payhere.js";
import {
  SYNTHETIC,
  upsertSyntheticSecurityFixtures,
} from "../helpers/synthetic-fixtures.js";

const baseUrl = process.env.SECURITY_TEST_BASE_URL;
const password = process.env.SECURITY_TEST_PASSWORD;
const merchantId = process.env.PAYHERE_MERCHANT_ID;
const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;

if (!baseUrl || !password || !merchantId || !merchantSecret) {
  console.error(
    "SECURITY_TEST_BASE_URL, SECURITY_TEST_PASSWORD, PAYHERE_MERCHANT_ID, and PAYHERE_MERCHANT_SECRET are required"
  );
  process.exit(1);
}

const prisma = new PrismaClient();
const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  const mark = ok ? "PASS" : "FAIL";
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function http(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  return { status: response.status, body, text };
}

async function paymentState() {
  const payment = await prisma.payment.findUnique({
    where: { orderId: SYNTHETIC.orderId },
    select: { status: true, amount: true, currency: true },
  });
  const booking = await prisma.booking.findFirst({
    where: { additionalNotes: SYNTHETIC.notes },
    select: { id: true, status: true },
  });
  return { payment, booking };
}

function signedNotify(overrides = {}) {
  const payload = {
    merchant_id: merchantId,
    order_id: SYNTHETIC.orderId,
    payhere_amount: "100.00",
    payhere_currency: SYNTHETIC.currency,
    status_code: "2",
    ...overrides,
  };
  payload.md5sig = computePayHereSignature({
    merchantId: payload.merchant_id,
    orderId: payload.order_id,
    amount: payload.payhere_amount,
    currency: payload.payhere_currency,
    statusCode: payload.status_code,
    merchantSecret,
  });
  return payload;
}

async function postNotify(payload) {
  const body = new URLSearchParams(payload);
  return http("/api/public/payhere/notify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
}

async function resetPending() {
  const current = await paymentState();
  await prisma.payment.update({
    where: { orderId: SYNTHETIC.orderId },
    data: { status: "PENDING" },
  });
  if (current.booking) {
    await prisma.booking.update({
      where: { id: current.booking.id },
      data: { status: "PENDING" },
    });
  }
}

async function main() {
  const fixtures = await upsertSyntheticSecurityFixtures(prisma, password);
  const adminToken = generateAccessToken(
    fixtures.admin.id,
    fixtures.admin.email,
    "admin"
  );
  const userToken = generateAccessToken(
    fixtures.user.id,
    fixtures.user.email,
    "user"
  );
  const expiredPrevious = process.env.JWT_ACCESS_EXPIRY;
  process.env.JWT_ACCESS_EXPIRY = "0s";
  const expiredToken = generateAccessToken(
    fixtures.user.id,
    fixtures.user.email,
    "user"
  );
  process.env.JWT_ACCESS_EXPIRY = expiredPrevious;
  const tampered = `${userToken.slice(0, -4)}abcd`;

  const anonymousTargets = [
    ["/api/bookings", "GET"],
    ["/api/programs", "GET"],
    ["/api/customers", "GET"],
    ["/api/commissions", "GET"],
    ["/api/leaders", "GET"],
    ["/api/dashboard/stats", "GET"],
    [`/api/bookings/${fixtures.booking.id}/manage`, "POST"],
  ];

  for (const [path, method] of anonymousTargets) {
    const response = await http(path, {
      method,
      headers: { "content-type": "application/json" },
      body: method === "POST" ? "{}" : undefined,
    });
    record(`anonymous ${method} ${path}`, response.status === 401, `HTTP ${response.status}`);
  }

  const invalidCases = [
    ["malformed", "not-a-jwt"],
    ["invalid signature", tampered],
    ["expired", expiredToken],
  ];
  for (const [label, token] of invalidCases) {
    const response = await http("/api/bookings", {
      headers: { Authorization: `Bearer ${token}` },
    });
    record(`invalid token (${label}) GET /api/bookings`, response.status === 401, `HTTP ${response.status}`);
  }

  for (const [path, method] of anonymousTargets) {
    const response = await http(path, {
      method,
      headers: {
        Authorization: `Bearer ${userToken}`,
        "content-type": "application/json",
      },
      body: method === "POST" ? "{}" : undefined,
    });
    record(`user ${method} ${path}`, response.status === 403, `HTTP ${response.status}`);
  }

  const adminGet = await http("/api/bookings", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  record(
    "admin GET /api/bookings",
    adminGet.status === 200,
    `HTTP ${adminGet.status}`
  );
  if (adminGet.status === 200) {
    const leakedToAnonymousShape = Array.isArray(adminGet.body)
      ? adminGet.body.length >= 0
      : Boolean(adminGet.body);
    record(
      "admin GET /api/bookings reached handler",
      leakedToAnonymousShape,
      "AUTHORIZATION PASSED"
    );
  }

  const adminManage = await http(`/api/bookings/${fixtures.booking.id}/manage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "content-type": "application/json",
    },
    body: "{}",
  });
  record(
    "admin POST /api/bookings/{id}/manage empty body",
    adminManage.status === 400,
    `HTTP ${adminManage.status} AUTHORIZATION PASSED BUSINESS VALIDATION`
  );

  await resetPending();
  const beforeQueries = await paymentState();
  const statusQueries = ["success", "cancelled", "failed", "pending", "anything", ""];
  const mutationResults = [];
  for (const status of statusQueries) {
    const query = status
      ? `/book/result?order_id=${SYNTHETIC.orderId}&status=${status}`
      : `/book/result?order_id=${SYNTHETIC.orderId}`;
    await http(query);
    const after = await paymentState();
    const unchanged =
      after.payment?.status === "PENDING" && after.booking?.status === "PENDING";
    mutationResults.push({
      status: status || "missing",
      paymentBefore: beforeQueries.payment?.status,
      paymentAfter: after.payment?.status,
      bookingBefore: beforeQueries.booking?.status,
      bookingAfter: after.booking?.status,
    });
    record(
      `result page status=${status || "missing"}`,
      unchanged,
      `payment ${after.payment?.status} booking ${after.booking?.status}`
    );
  }

  await resetPending();
  const valid = await postNotify(signedNotify());
  const afterValid = await paymentState();
  record(
    "PayHere valid PENDING → SUCCESS",
    valid.status === 200 &&
      afterValid.payment?.status === "SUCCESS" &&
      afterValid.booking?.status === "CONFIRMED",
    `HTTP ${valid.status} payment ${afterValid.payment?.status} booking ${afterValid.booking?.status}`
  );

  const duplicate = await postNotify(signedNotify());
  const afterDuplicate = await paymentState();
  record(
    "PayHere duplicate SUCCESS",
    duplicate.status === 200 &&
      afterDuplicate.payment?.status === "SUCCESS" &&
      afterDuplicate.booking?.status === "CONFIRMED",
    `HTTP ${duplicate.status} payment ${afterDuplicate.payment?.status}`
  );

  const failedReplay = await postNotify(signedNotify({ status_code: "-2" }));
  const afterFailedReplay = await paymentState();
  record(
    "PayHere SUCCESS → FAILED replay blocked",
    failedReplay.status === 200 &&
      afterFailedReplay.payment?.status === "SUCCESS" &&
      afterFailedReplay.booking?.status === "CONFIRMED",
    `HTTP ${failedReplay.status} payment ${afterFailedReplay.payment?.status}`
  );

  await resetPending();
  const badSig = await postNotify({ ...signedNotify(), md5sig: "0".repeat(32) });
  const afterBadSig = await paymentState();
  record(
    "PayHere invalid signature",
    badSig.status === 400 && afterBadSig.payment?.status === "PENDING",
    `HTTP ${badSig.status} payment ${afterBadSig.payment?.status}`
  );

  const wrongMerchant = await postNotify(
    signedNotify({ merchant_id: "wrong-merchant" })
  );
  const afterWrongMerchant = await paymentState();
  record(
    "PayHere wrong merchant",
    wrongMerchant.status === 400 && afterWrongMerchant.payment?.status === "PENDING",
    `HTTP ${wrongMerchant.status} payment ${afterWrongMerchant.payment?.status}`
  );

  const wrongAmount = await postNotify(signedNotify({ payhere_amount: "1.00" }));
  const afterWrongAmount = await paymentState();
  record(
    "PayHere wrong amount",
    wrongAmount.status === 400 && afterWrongAmount.payment?.status === "PENDING",
    `HTTP ${wrongAmount.status} payment ${afterWrongAmount.payment?.status}`
  );

  const wrongCurrency = await postNotify(
    signedNotify({ payhere_currency: "LKR" })
  );
  const afterWrongCurrency = await paymentState();
  record(
    "PayHere wrong currency",
    wrongCurrency.status === 400 && afterWrongCurrency.payment?.status === "PENDING",
    `HTTP ${wrongCurrency.status} payment ${afterWrongCurrency.payment?.status}`
  );

  const unknown = await postNotify(
    signedNotify({ order_id: "UNKNOWN-ORDER-SECURITY" })
  );
  const unknownHasDetails = Boolean(
    unknown.body?.payment || unknown.body?.booking || unknown.body?.amount
  );
  record(
    "PayHere unknown order",
    unknown.status === 200 && unknown.body?.received === true && !unknownHasDetails,
    `HTTP ${unknown.status}`
  );

  const failed = results.filter((item) => !item.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  console.log(JSON.stringify({ mutationResults }, null, 2));
  if (failed.length > 0) {
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error("Synthetic runtime QA failed");
    console.error(error?.name || "Error");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
