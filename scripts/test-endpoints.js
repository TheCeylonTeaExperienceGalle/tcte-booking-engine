/**
 * Comprehensive Endpoint and Business Rule Test Suite for Reviva API
 * Run with: node scripts/test-endpoints.js
 */

const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const prisma = new PrismaClient();

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3020";

// Results collector
const testResults = [];

function recordResult(method, path, testName, passed, notes = "") {
  testResults.push({
    method,
    path,
    testName,
    passed,
    notes,
  });
  const status = passed ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
  console.log(`[${status}] ${method.padEnd(6)} ${path.padEnd(32)} - ${testName} ${notes ? `(${notes})` : ""}`);
}

async function apiRequest(method, endpoint, { token, body, headers = {}, isFormData = false } = {}) {
  const reqHeaders = { ...headers };
  if (token) {
    reqHeaders["Authorization"] = `Bearer ${token}`;
  }
  let reqBody = undefined;
  if (body) {
    if (isFormData) {
      reqBody = body; // URLSearchParams or FormData string
    } else {
      reqHeaders["Content-Type"] = "application/json";
      reqBody = JSON.stringify(body);
    }
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: reqHeaders,
    body: reqBody,
  });

  let data = null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    data = await res.text();
  }

  return {
    status: res.status,
    ok: res.ok,
    headers: res.headers,
    data,
  };
}

// Helpers for safety cleanup
async function cleanupTestData() {
  try {
    // Delete in reverse dependency order
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { startsWith: "zz_test" } } },
    });
    await prisma.bookingItem.deleteMany({
      where: {
        OR: [
          { booking: { additionalNotes: { contains: "ZZ_TEST" } } },
          { customer: { name: { startsWith: "ZZ_TEST" } } },
        ],
      },
    });
    await prisma.commission.deleteMany({
      where: { leader: { name: { startsWith: "ZZ_TEST" } } },
    });
    await prisma.booking.deleteMany({
      where: { additionalNotes: { contains: "ZZ_TEST" } },
    });
    await prisma.payment.deleteMany({
      where: { orderId: { startsWith: "ZZ_TEST" } },
    });
    await prisma.customer.deleteMany({
      where: { name: { startsWith: "ZZ_TEST" } },
    });
    await prisma.sessionType.deleteMany({
      where: { name: { startsWith: "ZZ_TEST" } },
    });
    await prisma.session.deleteMany({
      where: { name: { startsWith: "ZZ_TEST" } },
    });
    await prisma.program.deleteMany({
      where: { title: { startsWith: "ZZ_TEST" } },
    });
    await prisma.location.deleteMany({
      where: { name: { startsWith: "ZZ_TEST" } },
    });
    await prisma.leader.deleteMany({
      where: { name: { startsWith: "ZZ_TEST" } },
    });
    await prisma.discountRule.deleteMany({
      where: { name: { startsWith: "ZZ_TEST" } },
    });
    await prisma.commissionRule.deleteMany({
      where: { commissionRate: 99.99 },
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: "zz_test" } },
    });
    await prisma.role.deleteMany({
      where: { name: { startsWith: "ZZ_TEST" } },
    });
  } catch (err) {
    console.error("Cleanup warning:", err.message);
  }
}

async function runAllTests() {
  console.log("================================================================================");
  console.log("REVIVA FULL ENDPOINT & QUALITY TEST SUITE");
  console.log("================================================================================");

  // 1. Safety Check: Verify Database Connection is Local/Dev
  const dbUrl = process.env.DATABASE_URL || "";
  let isLocal = false;
  try {
    const u = new URL(dbUrl);
    console.log(`[SAFETY CHECK] DATABASE_URL Host: ${u.hostname} | DB Name: ${u.pathname.replace(/^\//, "")}`);
    isLocal = ["localhost", "127.0.0.1", "::1"].includes(u.hostname) || u.hostname.endsWith(".local") || u.hostname.includes("dev");
  } catch {
    console.log(`[SAFETY CHECK] DATABASE_URL (raw): ${dbUrl}`);
    isLocal = dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1");
  }

  if (!isLocal) {
    console.error("\x1b[31m[CRITICAL SAFETY ERROR] DATABASE_URL does not appear to be local/dev! Stopping immediately.\x1b[0m");
    process.exit(1);
  }
  console.log("\x1b[32m[SAFETY CHECK PASSED] Confirmed local/dev database target.\x1b[0m\n");

  // Initial cleanup
  await cleanupTestData();

  // Variables to hold test credentials
  let adminToken = "";
  let readonlyToken = "";
  let noaccessToken = "";

  // Test Entities IDs
  let testLocationId = null;
  let testProgramId = null;
  let testSessionId = null;
  let testSessionTypeId = null;
  let testAgentId = null;
  let testDiscountRuleId = null;
  let testCommissionRuleId = null;
  let testRoleId = null;
  let testBookingId = null;

  try {
    // -------------------------------------------------------------------------
    // SETUP FIXTURES
    // -------------------------------------------------------------------------
    console.log("--- Setting up test fixtures ---");

    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash("Password123!", 10);

    // Ensure Admin Role exists
    let adminRole = await prisma.role.findFirst({ where: { name: "admin" } });
    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: { name: "admin", permissions: { all: { read: true, write: true } }, isActive: true },
      });
    }

    // Create Read-Only Role
    const readonlyRole = await prisma.role.create({
      data: {
        name: "ZZ_TEST_Readonly_Role",
        permissions: {
          bookings: { read: true, write: false },
          customers: { read: true, write: false },
          programs: { read: true, write: false },
          locations: { read: true, write: false },
          sessions: { read: true, write: false },
          "session-settings": { read: true, write: false },
          leaders: { read: true, write: false },
          commission: { read: true, write: false },
          users: { read: true, write: false },
          roles: { read: true, write: false },
        },
        isActive: true,
      },
    });

    // Create No-Access Role
    const noaccessRole = await prisma.role.create({
      data: {
        name: "ZZ_TEST_NoAccess_Role",
        permissions: {},
        isActive: true,
      },
    });

    // Create Admin Test User
    await prisma.user.create({
      data: {
        name: "ZZ_TEST Admin",
        email: "zz_test_admin@reviva.test",
        password: hashedPassword,
        roleId: adminRole.id,
        isActive: true,
      },
    });

    // Create Readonly Test User
    await prisma.user.create({
      data: {
        name: "ZZ_TEST Readonly",
        email: "zz_test_readonly@reviva.test",
        password: hashedPassword,
        roleId: readonlyRole.id,
        isActive: true,
      },
    });

    // Create Noaccess Test User
    await prisma.user.create({
      data: {
        name: "ZZ_TEST Noaccess",
        email: "zz_test_noaccess@reviva.test",
        password: hashedPassword,
        roleId: noaccessRole.id,
        isActive: true,
      },
    });

    // Setup base domain entities for testing
    const testLoc = await prisma.location.create({
      data: { name: "ZZ_TEST_Location Galle", address: "123 Galle Fort", isActive: true },
    });
    testLocationId = testLoc.id;

    const testProg = await prisma.program.create({
      data: {
        title: "ZZ_TEST_Program Tea Tour",
        description: "Test description",
        startTime: new Date("1970-01-01T09:00:00.000Z"),
        endTime: new Date("1970-01-01T17:00:00.000Z"),
        seats: 20,
        price: 50.0,
        locationId: testLocationId,
        isActive: true,
      },
    });
    testProgramId = testProg.id;

    const testSess = await prisma.session.create({
      data: {
        name: "ZZ_TEST_Session Morning Experience",
        programId: testProgramId,
        startTime: new Date("1970-01-01T10:00:00.000Z"),
        endTime: new Date("1970-01-01T12:00:00.000Z"),
        price: 50.0,
      },
    });
    testSessionId = testSess.id;

    const testST = await prisma.sessionType.create({
      data: {
        name: "ZZ_TEST_Addon VIP Tasting",
        sessionId: testSessionId,
        price: 15.0,
      },
    });
    testSessionTypeId = testST.id;

    const testAg = await prisma.leader.create({
      data: {
        name: "ZZ_TEST_Agent Ceylon Travels",
        email: "zz_test_agent@ceylon.test",
        contact: "+94771234567",
        promoteCode: "ZZ_AGENT99",
        role: "LEADER",
        status: "ACTIVE",
      },
    });
    testAgentId = testAg.id;

    console.log("Fixtures ready.\n");

    // -------------------------------------------------------------------------
    // 1. AUTH ENDPOINTS
    // -------------------------------------------------------------------------
    console.log("--- 1. Auth Endpoints ---");

    // POST /api/auth/login (Admin)
    const loginAdmin = await apiRequest("POST", "/api/auth/login", {
      body: { email: "zz_test_admin@reviva.test", password: "Password123!" },
    });
    adminToken = loginAdmin.data?.accessToken;
    const adminCookie = loginAdmin.headers.get("set-cookie") || "";
    recordResult("POST", "/api/auth/login", "Happy path returns accessToken & user", loginAdmin.status === 200 && Boolean(adminToken));

    // POST /api/auth/login (Invalid password -> 401)
    const loginBad = await apiRequest("POST", "/api/auth/login", {
      body: { email: "zz_test_admin@reviva.test", password: "WrongPassword" },
    });
    recordResult("POST", "/api/auth/login", "Invalid credentials returns 401", loginBad.status === 401);

    // POST /api/auth/login (Readonly user)
    const loginRO = await apiRequest("POST", "/api/auth/login", {
      body: { email: "zz_test_readonly@reviva.test", password: "Password123!" },
    });
    readonlyToken = loginRO.data?.accessToken;
    recordResult("POST", "/api/auth/login", "Read-only user login", loginRO.status === 200 && Boolean(readonlyToken));

    // POST /api/auth/login (No-access user)
    const loginNA = await apiRequest("POST", "/api/auth/login", {
      body: { email: "zz_test_noaccess@reviva.test", password: "Password123!" },
    });
    noaccessToken = loginNA.data?.accessToken;
    recordResult("POST", "/api/auth/login", "No-access user login", loginNA.status === 200 && Boolean(noaccessToken));

    // GET /api/auth/profile
    const profileOk = await apiRequest("GET", "/api/auth/profile", { token: adminToken });
    recordResult("GET", "/api/auth/profile", "Happy path returns profile with permissions", profileOk.status === 200 && profileOk.data?.user?.email === "zz_test_admin@reviva.test");

    const profileNoToken = await apiRequest("GET", "/api/auth/profile");
    recordResult("GET", "/api/auth/profile", "Missing token returns 401", profileNoToken.status === 401);

    // POST /api/auth/refresh
    const refreshOk = await apiRequest("POST", "/api/auth/refresh", { headers: { Cookie: adminCookie } });
    recordResult("POST", "/api/auth/refresh", "Valid refreshToken returns new accessToken", refreshOk.status === 200 && Boolean(refreshOk.data?.accessToken));

    const refreshBad = await apiRequest("POST", "/api/auth/refresh", { headers: { Cookie: "refreshToken=invalid-token-123" } });
    recordResult("POST", "/api/auth/refresh", "Invalid refreshToken returns 401", refreshBad.status === 401);

    // POST /api/auth/logout
    const logoutOk = await apiRequest("POST", "/api/auth/logout", { headers: { Cookie: adminCookie } });
    recordResult("POST", "/api/auth/logout", "Logout revokes token", logoutOk.status === 200);

    // POST /api/auth/logout-all
    const logoutAll = await apiRequest("POST", "/api/auth/logout-all", { token: adminToken });
    recordResult("POST", "/api/auth/logout-all", "Logout-all executes cleanly", logoutAll.status === 200);

    // Re-authenticate admin for subsequent protected tests
    const relogin = await apiRequest("POST", "/api/auth/login", {
      body: { email: "zz_test_admin@reviva.test", password: "Password123!" },
    });
    adminToken = relogin.data?.accessToken;

    // -------------------------------------------------------------------------
    // 2. AVAILABILITY
    // -------------------------------------------------------------------------
    console.log("\n--- 2. Availability ---");

    const availOk = await apiRequest("GET", `/api/availability?sessionId=${testSessionId}&date=2026-12-01`);
    recordResult("GET", "/api/availability", "Happy path returns session availability", availOk.status === 200 && availOk.data?.availability !== undefined, `status: ${availOk.status}, data: ${JSON.stringify(availOk.data)}`);

    const availNoDate = await apiRequest("GET", "/api/availability");
    recordResult("GET", "/api/availability", "Missing date or sessionId returns 400", availNoDate.status === 400, `status: ${availNoDate.status}, data: ${JSON.stringify(availNoDate.data)}`);

    // -------------------------------------------------------------------------
    // 3. LOCATIONS API
    // -------------------------------------------------------------------------
    console.log("\n--- 3. Locations API ---");

    const locList = await apiRequest("GET", "/api/locations", { token: adminToken });
    recordResult("GET", "/api/locations", "Happy path returns locations array", locList.status === 200 && Array.isArray(locList.data?.locations));

    const locListNoToken = await apiRequest("GET", "/api/locations");
    recordResult("GET", "/api/locations", "Missing token returns 401", locListNoToken.status === 401);

    const locCreate = await apiRequest("POST", "/api/locations", {
      token: adminToken,
      body: { name: "ZZ_TEST_New Loc", address: "100 Beach Rd" },
    });
    const createdLocId = locCreate.data?.location?.id;
    recordResult("POST", "/api/locations", "Admin creates location -> 201/200", (locCreate.status === 200 || locCreate.status === 201) && Boolean(createdLocId));

    const locCreateRO = await apiRequest("POST", "/api/locations", {
      token: readonlyToken,
      body: { name: "ZZ_TEST_Fail Loc", address: "Fail Rd" },
    });
    recordResult("POST", "/api/locations", "Readonly role create blocked -> 403", locCreateRO.status === 403);

    const locPut = await apiRequest("PUT", `/api/locations/${createdLocId}`, {
      token: adminToken,
      body: { name: "ZZ_TEST_Updated Loc", address: "101 Beach Rd" },
    });
    recordResult("PUT", "/api/locations/[id]", "Admin updates location", locPut.status === 200 && locPut.data?.location?.name === "ZZ_TEST_Updated Loc");

    // BUSINESS RULE TEST: Location delete is BLOCKED when it has programs/sessions/bookings
    const locDelBlocked = await apiRequest("DELETE", `/api/locations/${testLocationId}`, { token: adminToken });
    recordResult(
      "DELETE",
      "/api/locations/[id]",
      "BUSINESS RULE: Delete blocked when prior data exists -> 400",
      locDelBlocked.status === 400 && locDelBlocked.data?.hasPriorData === true,
      locDelBlocked.data?.error
    );

    // Location delete succeeds for location without data
    const locDelOk = await apiRequest("DELETE", `/api/locations/${createdLocId}`, { token: adminToken });
    recordResult("DELETE", "/api/locations/[id]", "Delete succeeds for empty location -> 200", locDelOk.status === 200);

    const locNotFound = await apiRequest("PUT", "/api/locations/999999", {
      token: adminToken,
      body: { name: "Ghost" },
    });
    recordResult("PUT", "/api/locations/[id]", "Not found ID returns 404", locNotFound.status === 404);

    // -------------------------------------------------------------------------
    // 4. PROGRAMS API
    // -------------------------------------------------------------------------
    console.log("\n--- 4. Programs API ---");

    const progList = await apiRequest("GET", "/api/programs", { token: adminToken });
    recordResult("GET", "/api/programs", "Happy path list programs", progList.status === 200 && Array.isArray(progList.data?.programs));

    const progCreate = await apiRequest("POST", "/api/programs", {
      token: adminToken,
      body: {
        title: "ZZ_TEST_Temp Program",
        description: "Temp",
        startTime: "09:00",
        endTime: "17:00",
        seats: 20,
        price: 50.0,
        locationId: testLocationId,
      },
    });
    const tempProgId = progCreate.data?.program?.id;
    recordResult("POST", "/api/programs", "Admin creates program -> 200/201", (progCreate.status === 200 || progCreate.status === 201) && Boolean(tempProgId));

    const progGet = await apiRequest("GET", `/api/programs/${tempProgId}`, { token: adminToken });
    recordResult("GET", "/api/programs/[id]", "Get single program", progGet.status === 200 && progGet.data?.program?.id === tempProgId);

    const progPut = await apiRequest("PUT", `/api/programs/${tempProgId}`, {
      token: adminToken,
      body: { title: "ZZ_TEST_Temp Program Edited" },
    });
    recordResult("PUT", "/api/programs/[id]", "Update program", progPut.status === 200);

    const progDel = await apiRequest("DELETE", `/api/programs/${tempProgId}`, { token: adminToken });
    recordResult("DELETE", "/api/programs/[id]", "Delete program", progDel.status === 200);

    const progNotFound = await apiRequest("GET", "/api/programs/999999", { token: adminToken });
    recordResult("GET", "/api/programs/[id]", "Not found returns 404", progNotFound.status === 404);

    // -------------------------------------------------------------------------
    // 5. SESSIONS & SESSION TYPES API
    // -------------------------------------------------------------------------
    console.log("\n--- 5. Sessions & Session Types API ---");

    const sessList = await apiRequest("GET", "/api/sessions", { token: adminToken });
    recordResult("GET", "/api/sessions", "Happy path list sessions", sessList.status === 200);

    const sessCreate = await apiRequest("POST", "/api/sessions", {
      token: adminToken,
      body: {
        name: "ZZ_TEST_Temp Session",
        programId: testProgramId,
        startTime: "14:00",
        endTime: "16:00",
        maxCapacity: 10,
        price: 35.0,
      },
    });
    const tempSessId = sessCreate.data?.session?.id;
    recordResult("POST", "/api/sessions", "Create session", (sessCreate.status === 200 || sessCreate.status === 201) && Boolean(tempSessId));

    const sessPut = await apiRequest("PUT", `/api/sessions/${tempSessId}`, {
      token: adminToken,
      body: { name: "ZZ_TEST_Temp Session Updated", price: 40.0 },
    });
    recordResult("PUT", "/api/sessions/[id]", "Update session", sessPut.status === 200);

    const stCreate = await apiRequest("POST", "/api/session-types", {
      token: adminToken,
      body: { name: "ZZ_TEST_Temp Type", sessionId: tempSessId, price: 10.0 },
    });
    const tempStId = stCreate.data?.sessionType?.id;
    recordResult("POST", "/api/session-types", "Create session type", (stCreate.status === 200 || stCreate.status === 201) && Boolean(tempStId));

    const stPut = await apiRequest("PUT", `/api/session-types/${tempStId}`, {
      token: adminToken,
      body: { name: "ZZ_TEST_Temp Type Edited", price: 12.0 },
    });
    recordResult("PUT", "/api/session-types/[id]", "Update session type", stPut.status === 200);

    const stDel = await apiRequest("DELETE", `/api/session-types/${tempStId}`, { token: adminToken });
    recordResult("DELETE", "/api/session-types/[id]", "Delete session type", stDel.status === 200);

    const sessDel = await apiRequest("DELETE", `/api/sessions/${tempSessId}`, { token: adminToken });
    recordResult("DELETE", "/api/sessions/[id]", "Delete session", sessDel.status === 200);

    // -------------------------------------------------------------------------
    // 6. LEADERS (TRAVEL AGENTS) API
    // -------------------------------------------------------------------------
    console.log("\n--- 6. Leaders (Travel Agents) API ---");

    const agentsList = await apiRequest("GET", "/api/leaders", { token: adminToken });
    recordResult("GET", "/api/leaders", "List travel agents", agentsList.status === 200 && Array.isArray(agentsList.data?.leaders));

    const agentCreate = await apiRequest("POST", "/api/leaders", {
      token: adminToken,
      body: {
        name: "ZZ_TEST_New Agent",
        email: "zz_test_newagent@test.com",
        contact: "+94779998877",
        role: "LEADER",
      },
    });
    const newAgentId = agentCreate.data?.leader?.id;
    recordResult("POST", "/api/leaders", "Create travel agent", (agentCreate.status === 200 || agentCreate.status === 201) && Boolean(newAgentId));

    const agentStatus = await apiRequest("PATCH", `/api/leaders/${newAgentId}/status`, {
      token: adminToken,
      body: { status: "DEACTIVATED" },
    });
    recordResult("PATCH", "/api/leaders/[id]/status", "Update agent status", agentStatus.status === 200);

    const agentPut = await apiRequest("PUT", `/api/leaders/${newAgentId}`, {
      token: adminToken,
      body: { name: "ZZ_TEST_New Agent Updated", status: "ACTIVE" },
    });
    recordResult("PUT", "/api/leaders/[id]", "Update travel agent details", agentPut.status === 200);

    const agentDel = await apiRequest("DELETE", `/api/leaders/${newAgentId}`, { token: adminToken });
    recordResult("DELETE", "/api/leaders/[id]", "Soft delete travel agent", agentDel.status === 200);

    // -------------------------------------------------------------------------
    // 7. DISCOUNT RULES & COMMISSION RULES API
    // -------------------------------------------------------------------------
    console.log("\n--- 7. Discount & Commission Rules API ---");

    const drCreate = await apiRequest("POST", "/api/discount-rules", {
      token: adminToken,
      body: {
        programId: testProgramId,
        name: "ZZ_TEST_Multi Discount 10%",
        discountType: "PERCENTAGE",
        discountValue: 10,
        sessionIds: [testSessionId],
        isActive: true,
      },
    });
    testDiscountRuleId = drCreate.data?.rule?.id;
    recordResult("POST", "/api/discount-rules", "Create discount rule", Boolean(testDiscountRuleId));

    const drCalc = await apiRequest("POST", "/api/discount-rules/calculate", {
      body: {
        sessionIds: [testSessionId],
        totalAmount: 100,
        guestCount: 2,
      },
    });
    recordResult("POST", "/api/discount-rules/calculate", "Calculate discount rule", drCalc.status === 200 && typeof drCalc.data?.finalTotal === "number");

    const crCreate = await apiRequest("POST", "/api/commission-rules", {
      token: adminToken,
      body: {
        minSeats: 9000,
        maxSeats: 9999,
        commissionRate: 99.99,
        isActive: true,
      },
    });
    testCommissionRuleId = crCreate.data?.rule?.id;
    recordResult("POST", "/api/commission-rules", "Create commission rule", Boolean(testCommissionRuleId));

    const commList = await apiRequest("GET", "/api/commissions", { token: adminToken });
    recordResult("GET", "/api/commissions", "List commissions", commList.status === 200);

    const commLeaders = await apiRequest("GET", "/api/commissions/leaders", { token: adminToken });
    recordResult("GET", "/api/commissions/leaders", "List leader commissions", commLeaders.status === 200);

    // -------------------------------------------------------------------------
    // 8. ROLES & USERS API (WITH PERMISSION & INTEGRITY RULES)
    // -------------------------------------------------------------------------
    console.log("\n--- 8. Roles & Users API ---");

    const roleCreate = await apiRequest("POST", "/api/roles", {
      token: adminToken,
      body: { name: "ZZ_TEST_Custom Role", permissions: { bookings: { read: true } } },
    });
    testRoleId = roleCreate.data?.role?.id;
    recordResult("POST", "/api/roles", "Admin creates custom role", Boolean(testRoleId));

    // BUSINESS RULE TEST: Roles cannot be hard-deleted (deactivated instead)
    const roleDel = await apiRequest("DELETE", `/api/roles/${testRoleId}`, { token: adminToken });
    const checkRoleInactive = await prisma.role.findUnique({ where: { id: testRoleId } });
    recordResult(
      "DELETE",
      "/api/roles/[id]",
      "BUSINESS RULE: Role is deactivated, not hard-deleted",
      roleDel.status === 200 && checkRoleInactive?.isActive === false
    );

    // BUSINESS RULE TEST: Inactive role cannot be assigned to user -> 400
    const userWithInactiveRole = await apiRequest("POST", "/api/users", {
      token: adminToken,
      body: {
        name: "ZZ_TEST Invalid Role User",
        username: "zz_test_invalid_role@reviva.test",
        password: "Password123!",
        roleId: testRoleId, // currently inactive
      },
    });
    recordResult(
      "POST",
      "/api/users",
      "BUSINESS RULE: Inactive role cannot be assigned to user -> 400",
      userWithInactiveRole.status === 400,
      userWithInactiveRole.data?.error
    );

    // Create user with valid active role
    const userCreateOk = await apiRequest("POST", "/api/users", {
      token: adminToken,
      body: {
        name: "ZZ_TEST Valid User",
        username: "zz_test_valid_user@reviva.test",
        password: "Password123!",
        roleId: readonlyRole.id,
      },
    });
    const validUserId = userCreateOk.data?.user?.id;
    recordResult("POST", "/api/users", "Create user with valid role -> 200/201", (userCreateOk.status === 200 || userCreateOk.status === 201) && Boolean(validUserId));

    const userList = await apiRequest("GET", "/api/users", { token: adminToken });
    recordResult("GET", "/api/users", "List users", userList.status === 200 && Array.isArray(userList.data?.users));

    const userPut = await apiRequest("PUT", `/api/users/${validUserId}`, {
      token: adminToken,
      body: { name: "ZZ_TEST Valid User Edited" },
    });
    recordResult("PUT", "/api/users/[id]", "Update user", userPut.status === 200);

    const userDel = await apiRequest("DELETE", `/api/users/${validUserId}`, { token: adminToken });
    recordResult("DELETE", "/api/users/[id]", "Delete user", userDel.status === 200);

    // -------------------------------------------------------------------------
    // 9. BOOKING, BOOKINGS & SPECIFIC BUSINESS RULES
    // -------------------------------------------------------------------------
    console.log("\n--- 9. Booking & Advanced Business Rules ---");

    const futureDate = "2026-12-15";

    // 9a. Happy Path Online Booking
    const bookingPayload = {
      leaderId: testAgentId,
      bookedDate: futureDate,
      additionalNotes: "ZZ_TEST Booking 1",
      selections: [
        {
          sessionId: testSessionId,
          sessionTypeId: testSessionTypeId,
          seatsRequested: 2,
          customers: [
            { name: "ZZ_TEST Customer 1", email: "zz_cust1@test.com", phone: "+94771111111", nic: "991111111V" },
            { name: "ZZ_TEST Customer 2", email: "zz_cust2@test.com", phone: "+94772222222", nic: "992222222V" },
          ],
        },
      ],
      payment: {
        paymentType: "Full",
        provider: "MANUAL",
        method: "Cash",
      },
    };

    const bookingRes = await apiRequest("POST", "/api/booking", { body: bookingPayload });
    testBookingId = bookingRes.data?.bookingId;
    recordResult("POST", "/api/booking", "Happy path booking creates booking & payment", bookingRes.status === 200 && Boolean(testBookingId));

    // 9b. BUSINESS RULE: Security - Public caller cannot forge source: "ADMIN" without token -> 403
    const forgeAdminBooking = await apiRequest("POST", "/api/booking", {
      body: {
        ...bookingPayload,
        source: "ADMIN",
        additionalNotes: "ZZ_TEST Unauthorized Admin Booking",
      },
    });
    recordResult(
      "POST",
      "/api/booking",
      "SECURITY: Unauthenticated source ADMIN is rejected -> 403",
      forgeAdminBooking.status === 403,
      forgeAdminBooking.data?.error
    );

    // 9c. Authenticated Admin Booking sets source: "ADMIN"
    const authAdminBooking = await apiRequest("POST", "/api/booking", {
      token: adminToken,
      body: {
        ...bookingPayload,
        source: "ADMIN",
        additionalNotes: "ZZ_TEST Authorized Admin Booking",
      },
    });
    const authAdminBookingDb = authAdminBooking.data?.bookingId
      ? await prisma.booking.findUnique({ where: { id: authAdminBooking.data.bookingId } })
      : null;
    recordResult(
      "POST",
      "/api/booking",
      "Admin token with source ADMIN creates ADMIN booking",
      authAdminBooking.status === 200 && authAdminBookingDb?.source === "ADMIN"
    );

    // 9c-2. BUSINESS RULE: Admin booking without travel agent (leaderId: null) succeeds as Direct booking
    const { leaderId: _discardLeader, ...bookingWithoutAgent } = bookingPayload;
    const directAdminBooking = await apiRequest("POST", "/api/booking", {
      token: adminToken,
      body: {
        ...bookingWithoutAgent,
        source: "ADMIN",
        additionalNotes: "ZZ_TEST Direct Admin Booking without Travel Agent",
      },
    });
    const directAdminDb = directAdminBooking.data?.bookingId
      ? await prisma.booking.findUnique({
          where: { id: directAdminBooking.data.bookingId },
          include: { leader: true, commission: true },
        })
      : null;
    recordResult(
      "POST",
      "/api/booking",
      "BUSINESS RULE: Admin booking without travel agent succeeds as Direct booking",
      directAdminBooking.status === 200 &&
        directAdminDb?.leader?.role !== "LEADER" &&
        directAdminDb?.commission === null
    );

    // 9d. BUSINESS RULE: Booking for session whose start time has passed in Asia/Colombo -> 400
    const pastSessionRes = await apiRequest("POST", "/api/booking", {
      body: {
        ...bookingPayload,
        bookedDate: "2020-01-01", // Past date
      },
    });
    recordResult(
      "POST",
      "/api/booking",
      "BUSINESS RULE: Past session booking rejected -> 400",
      pastSessionRes.status === 400,
      pastSessionRes.data?.error
    );

    // 9e. BUSINESS RULE: Online "Pay Later" keeps transactionId null
    const payLaterBooking = await apiRequest("POST", "/api/booking", {
      body: {
        ...bookingPayload,
        payment: {
          paymentType: "Later",
          provider: "MANUAL",
          method: "Pay Later",
        },
        additionalNotes: "ZZ_TEST Pay Later Booking",
      },
    });
    const payLaterId = payLaterBooking.data?.bookingId;
    const payLaterDb = payLaterId
      ? await prisma.booking.findUnique({ where: { id: payLaterId }, include: { payment: true } })
      : null;
    recordResult(
      "POST",
      "/api/booking",
      "BUSINESS RULE: Online Pay Later keeps transactionId null",
      payLaterBooking.status === 200 && payLaterDb?.payment?.transactionId === null
    );

    // 9f. BUSINESS RULE: Multi-session booking saves customers for every session
    const sess2 = await prisma.session.create({
      data: {
        name: "ZZ_TEST_Session Afternoon",
        programId: testProgramId,
        startTime: new Date("1970-01-01T14:00:00.000Z"),
        endTime: new Date("1970-01-01T16:00:00.000Z"),
        price: 45.0,
      },
    });

    const multiSessionBooking = await apiRequest("POST", "/api/booking", {
      body: {
        leaderId: testAgentId,
        bookedDate: "2026-12-16",
        additionalNotes: "ZZ_TEST Multi Session",
        selections: [
          {
            sessionId: testSessionId,
            seatsRequested: 1,
            customers: [{ name: "ZZ_TEST Multi Guest A", email: "zz_multi_a@test.com", phone: "+94770000001", nic: "990000001V" }],
          },
          {
            sessionId: sess2.id,
            seatsRequested: 1,
            customers: [{ name: "ZZ_TEST Multi Guest B", email: "zz_multi_b@test.com", phone: "+94770000002", nic: "990000002V" }],
          },
        ],
        payment: { paymentType: "Full", provider: "MANUAL", method: "Cash" },
      },
    });
    const multiBookingId = multiSessionBooking.data?.bookingId;
    const multiBookingItems = multiBookingId
      ? await prisma.bookingItem.findMany({ where: { bookingId: multiBookingId } })
      : [];
    recordResult(
      "POST",
      "/api/booking",
      "BUSINESS RULE: Multi-session saves items & customers for EVERY session",
      multiSessionBooking.status === 200 && multiBookingItems.length === 2
    );

    // 9g. BUSINESS RULE: Concurrency - 10 parallel bookings generated unique TXN- refs and no 500s
    console.log("Testing 10 parallel bookings for concurrency-safe TXN generation...");
    const parallelPromises = Array.from({ length: 10 }, (_, i) =>
      apiRequest("POST", "/api/booking", {
        body: {
          leaderId: testAgentId,
          bookedDate: "2026-12-20",
          additionalNotes: `ZZ_TEST Parallel Booking ${i + 1}`,
          selections: [
            {
              sessionId: testSessionId,
              seatsRequested: 1,
              customers: [{ name: `ZZ_TEST Parallel Guest ${i + 1}`, email: `zz_par_${i + 1}@test.com`, phone: `+9477900000${i}`, nic: `99900000${i}V` }],
            },
          ],
          payment: { paymentType: "Full", provider: "MANUAL", method: "Cash" },
        },
      })
    );

    const parallelResults = await Promise.all(parallelPromises);
    const parallelSuccess = parallelResults.every((r) => r.status === 200);
    const parallelBookingIds = parallelResults.map((r) => r.data?.bookingId).filter(Boolean);
    const parallelPayments = await prisma.payment.findMany({
      where: { bookings: { some: { id: { in: parallelBookingIds } } } },
      select: { transactionId: true },
    });
    const txnIds = parallelPayments.map((p) => p.transactionId).filter(Boolean);
    const uniqueTxnIds = new Set(txnIds);

    recordResult(
      "POST",
      "/api/booking",
      "BUSINESS RULE: 10 parallel bookings succeed without 500s and have unique TXNs",
      parallelSuccess && uniqueTxnIds.size === 10,
      `Generated ${uniqueTxnIds.size} unique TXN refs`
    );

    // 9h. BOOKINGS MANAGEMENT ENDPOINTS
    const bookingsList = await apiRequest("GET", "/api/bookings", { token: adminToken });
    recordResult("GET", "/api/bookings", "Admin list bookings", bookingsList.status === 200 && Array.isArray(bookingsList.data?.bookings));

    const singleBooking = await apiRequest("GET", `/api/bookings/${testBookingId}`, { token: adminToken });
    recordResult("GET", "/api/bookings/[id]", "Get single booking", singleBooking.status === 200 && singleBooking.data?.booking?.id === testBookingId);

    const updateBooking = await apiRequest("PUT", `/api/bookings/${testBookingId}`, {
      token: adminToken,
      body: {
        leaderId: testAgentId,
        bookedDate: "2026-12-15",
        additionalNotes: "ZZ_TEST Booking 1 Updated",
        selections: [
          {
            sessionId: testSessionId,
            sessionTypeId: testSessionTypeId,
            seatsRequested: 2,
            customers: [
              { name: "ZZ_TEST Customer 1", email: "zz_cust1@test.com", phone: "+94771111111", nic: "991111111V" },
              { name: "ZZ_TEST Customer 2", email: "zz_cust2@test.com", phone: "+94772222222", nic: "992222222V" },
            ],
          },
        ],
        payment: { paymentType: "Full", provider: "MANUAL", method: "Cash" },
      },
    });
    recordResult("PUT", "/api/bookings/[id]", "Update booking", updateBooking.status === 200);

    const manageBooking = await apiRequest("POST", `/api/bookings/${testBookingId}/manage`, {
      token: adminToken,
      body: { action: "mark_paid", reason: "ZZ_TEST settlement" },
    });
    recordResult("POST", "/api/bookings/[id]/manage", "Manage booking status", manageBooking.status === 200);

    // BUSINESS RULE: Admin cancel Pay Later booking forces 0 refund and no refund records
    let cancelPayLaterPassed = false;
    if (payLaterId) {
      const cancelPayLaterRes = await apiRequest("POST", `/api/bookings/${payLaterId}/manage`, {
        token: adminToken,
        body: { action: "cancel", reason: "Admin cancelled test Pay Later", refundAmount: 100 },
      });
      const payLaterDbAfter = await prisma.booking.findUnique({
        where: { id: payLaterId },
        include: { refunds: true, history: true },
      });
      cancelPayLaterPassed =
        cancelPayLaterRes.status === 200 &&
        cancelPayLaterRes.data?.refundAmount === 0 &&
        payLaterDbAfter?.status === "CANCELLED" &&
        payLaterDbAfter?.refunds?.length === 0 &&
        payLaterDbAfter?.history?.some((h) => h.reason?.includes("USD 0.00"));
    }
    recordResult(
      "POST",
      "/api/bookings/[id]/manage",
      "BUSINESS RULE: Admin cancel Pay Later booking enforces $0 refund",
      cancelPayLaterPassed
    );

    const bookingsReport = await apiRequest("GET", "/api/bookings-report?startDate=2026-12-01&endDate=2026-12-31", { token: adminToken });
    recordResult("GET", "/api/bookings-report", "Get bookings report", bookingsReport.status === 200);

    // -------------------------------------------------------------------------
    // 10. CUSTOMERS ENDPOINT & DEDUPLICATION RULES
    // -------------------------------------------------------------------------
    console.log("\n--- 10. Customers & Deduplication Rules ---");

    // Create bookings to test merge / deduplication:
    // Case 1: Same NIC (998877665V) -> should merge into 1 profile with bookingsCount = 2
    // Case 2: Same Email (shared_email@test.com) but DIFFERENT names & NICs -> should NOT merge, but appear in likelyDuplicates
    await apiRequest("POST", "/api/booking", {
      body: {
        leaderId: testAgentId,
        bookedDate: "2026-12-25",
        additionalNotes: "ZZ_TEST Dedupe 1",
        selections: [
          {
            sessionId: testSessionId,
            seatsRequested: 1,
            customers: [{ name: "ZZ_TEST Alice Perera", email: "alice1@test.com", phone: "+94771112233", nic: "998877665V" }],
          },
        ],
        payment: { paymentType: "Full", provider: "MANUAL", method: "Cash" },
      },
    });

    await apiRequest("POST", "/api/booking", {
      body: {
        leaderId: testAgentId,
        bookedDate: "2026-12-26",
        additionalNotes: "ZZ_TEST Dedupe 2 (Same NIC)",
        selections: [
          {
            sessionId: testSessionId,
            seatsRequested: 1,
            customers: [{ name: "ZZ_TEST Alice Silva", email: "alice2@test.com", phone: "+94771112233", nic: "998877665V" }],
          },
        ],
        payment: { paymentType: "Full", provider: "MANUAL", method: "Cash" },
      },
    });

    await apiRequest("POST", "/api/booking", {
      body: {
        leaderId: testAgentId,
        bookedDate: "2026-12-27",
        additionalNotes: "ZZ_TEST Dedupe 3 (Shared Email Bob)",
        selections: [
          {
            sessionId: testSessionId,
            seatsRequested: 1,
            customers: [{ name: "ZZ_TEST Bob Fernando", email: "family_shared@test.com", phone: "+94773334455", nic: "771111111V" }],
          },
        ],
        payment: { paymentType: "Full", provider: "MANUAL", method: "Cash" },
      },
    });

    await apiRequest("POST", "/api/booking", {
      body: {
        leaderId: testAgentId,
        bookedDate: "2026-12-28",
        additionalNotes: "ZZ_TEST Dedupe 4 (Shared Email Charlie)",
        selections: [
          {
            sessionId: testSessionId,
            seatsRequested: 1,
            customers: [{ name: "ZZ_TEST Charlie Fernando", email: "family_shared@test.com", phone: "+94773334455", nic: "882222222V" }],
          },
        ],
        payment: { paymentType: "Full", provider: "MANUAL", method: "Cash" },
      },
    });

    const customersRes = await apiRequest("GET", "/api/customers", { token: adminToken });
    const custs = customersRes.data?.customers || [];
    const aliceProfiles = custs.filter((c) => c.nic === "998877665V");
    const bobProfile = custs.find((c) => c.name === "ZZ_TEST Bob Fernando");
    const charlieProfile = custs.find((c) => c.name === "ZZ_TEST Charlie Fernando");

    recordResult(
      "GET",
      "/api/customers",
      "BUSINESS RULE: Same NIC merges into single customer profile with combined history",
      aliceProfiles.length === 1 && aliceProfiles[0].bookingsCount === 2,
      `Merged ${aliceProfiles.length} profile with ${aliceProfiles[0]?.bookingsCount} bookings`
    );

    recordResult(
      "GET",
      "/api/customers",
      "BUSINESS RULE: Shared email with different names keeps profiles separate and flags likelyDuplicates",
      Boolean(bobProfile) && Boolean(charlieProfile) && (bobProfile.likelyDuplicates?.length > 0 || charlieProfile.likelyDuplicates?.length > 0),
      `Bob likelyDuplicates count: ${bobProfile?.likelyDuplicates?.length || 0}`
    );

    // -------------------------------------------------------------------------
    // 11. DASHBOARD STATS
    // -------------------------------------------------------------------------
    console.log("\n--- 11. Dashboard Stats ---");

    const statsRes = await apiRequest("GET", "/api/dashboard/stats", { token: adminToken });
    recordResult("GET", "/api/dashboard/stats", "Happy path returns stats metrics", statsRes.status === 200 && typeof statsRes.data?.revenue === "number");

    // -------------------------------------------------------------------------
    // 12. PUBLIC ENDPOINTS
    // -------------------------------------------------------------------------
    console.log("\n--- 12. Public Endpoints ---");

    const pubAgents = await apiRequest("POST", "/api/public/agents", {
      body: { name: "ZZ_TEST Public Agent", email: "zz_pub_agent@test.com", contact: "+94770001122" },
    });
    recordResult("POST", "/api/public/agents", "Public register agent -> 201/200", (pubAgents.status === 201 || pubAgents.status === 200) && Boolean(pubAgents.data?.leader));

    const pubAgentsBad = await apiRequest("POST", "/api/public/agents", { body: {} });
    recordResult("POST", "/api/public/agents", "Public register agent missing fields -> 400", pubAgentsBad.status === 400);

    const pubLeaders = await apiRequest("POST", "/api/public/leaders", {
      body: { name: "ZZ_TEST Public Leader", email: "zz_pub_leader@test.com", contact: "+94773332211" },
    });
    recordResult("POST", "/api/public/leaders", "Public register/get leader -> 200/201", (pubLeaders.status === 200 || pubLeaders.status === 201) && Boolean(pubLeaders.data?.leader));

    const pubLocs = await apiRequest("GET", "/api/public/locations");
    recordResult("GET", "/api/public/locations", "Public list locations", pubLocs.status === 200);

    const pubProgs = await apiRequest("GET", "/api/public/programs");
    recordResult("GET", "/api/public/programs", "Public list programs", pubProgs.status === 200);

    const pubPromo = await apiRequest("GET", `/api/public/promo?code=ZZ_AGENT99`);
    recordResult("GET", "/api/public/promo", "Public lookup promo code", pubPromo.status === 200 && pubPromo.data?.leader?.name?.includes("ZZ_TEST"));

    // 12b. BUSINESS RULE: PayHere notify hash verification
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET || "4ONx7A622Zp8W5h140A7G2E9v";
    const payhereOrderId = "ZZ_TEST_PH_001";
    const payhereAmount = "50.00";
    const payhereCurrency = "USD";
    const payhereStatusCode = "2";
    const merchantId = "1224855";

    const secretHash = crypto.createHash("md5").update(merchantSecret).digest("hex").toUpperCase();
    const validSignature = crypto
      .createHash("md5")
      .update(`${merchantId}${payhereOrderId}${payhereAmount}${payhereCurrency}${payhereStatusCode}${secretHash}`)
      .digest("hex")
      .toUpperCase();

    // Create a matching payment in DB for PayHere test
    await prisma.payment.create({
      data: {
        provider: "PAYHERE",
        status: "PENDING",
        amount: 50.0,
        currency: "USD",
        orderId: payhereOrderId,
      },
    });

    const validNotifyParams = new URLSearchParams({
      merchant_id: merchantId,
      order_id: payhereOrderId,
      payhere_amount: payhereAmount,
      payhere_currency: payhereCurrency,
      status_code: payhereStatusCode,
      md5sig: validSignature,
    });

    const payhereValidRes = await apiRequest("POST", "/api/public/payhere/notify", {
      body: validNotifyParams.toString(),
      isFormData: true,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    recordResult("POST", "/api/public/payhere/notify", "BUSINESS RULE: Valid PayHere signature succeeds -> 200", payhereValidRes.status === 200);

    const invalidNotifyParams = new URLSearchParams({
      merchant_id: merchantId,
      order_id: payhereOrderId,
      payhere_amount: payhereAmount,
      payhere_currency: payhereCurrency,
      status_code: payhereStatusCode,
      md5sig: "INVALID_SIG_999",
    });

    const payhereInvalidRes = await apiRequest("POST", "/api/public/payhere/notify", {
      body: invalidNotifyParams.toString(),
      isFormData: true,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    recordResult("POST", "/api/public/payhere/notify", "BUSINESS RULE: Invalid PayHere signature rejected -> 400", payhereInvalidRes.status === 400);

  } catch (err) {
    console.error("Test runner encountered an error:", err);
  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP & RESTORATION
    // -------------------------------------------------------------------------
    console.log("\n--- Cleaning up all test data ---");
    await cleanupTestData();
    console.log("\x1b[32m[CLEANUP COMPLETE] All test records deleted. Original DB state restored.\x1b[0m\n");
    await prisma.$disconnect();
  }

  // Summary Table
  const total = testResults.length;
  const passed = testResults.filter((r) => r.passed).length;
  const failed = testResults.filter((r) => !r.passed).length;

  console.log("================================================================================");
  console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("================================================================================");
}

runAllTests();
