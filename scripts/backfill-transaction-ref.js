/**
 * One-time backfill script to ensure all existing bookings/payments have a proper transaction reference:
 * Replaces dummy "TEST-*" references or nulls on existing bookings with clean, sequential "TXN-000001", "TXN-000002", etc.
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function backfillTransactionRefs() {
  console.log("=== Starting Transaction Reference Backfill ===");

  const payments = await prisma.payment.findMany({
    orderBy: { id: "asc" },
  });

  console.log(`Found ${payments.length} payment record(s) to inspect.\n`);

  let updatedCount = 0;
  const auditReport = [];

  // Determine current highest TXN sequence number
  let currentMax = 0;
  for (const p of payments) {
    if (p.transactionId && p.transactionId.startsWith("TXN-")) {
      const match = p.transactionId.match(/^TXN-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > currentMax) currentMax = num;
      }
    }
  }

  for (const p of payments) {
    const oldTxn = p.transactionId;
    let newTxn = oldTxn;
    let rationale = "";

    // If transactionId is missing or has a placeholder like TEST-
    if (!oldTxn || oldTxn.startsWith("TEST-") || oldTxn.startsWith("Auto-generated")) {
      currentMax += 1;
      newTxn = `TXN-${String(currentMax).padStart(6, "0")}`;
      rationale = oldTxn?.startsWith("TEST-")
        ? `Replaced public test stub (${oldTxn}) with formal sequential sequence`
        : "Assigned sequential reference for existing payment lacking TXN ref";

      await prisma.payment.update({
        where: { id: p.id },
        data: { transactionId: newTxn },
      });
      updatedCount++;
    } else {
      rationale = `Already has valid transaction reference (${oldTxn})`;
    }

    auditReport.push({
      paymentId: p.id,
      orderId: p.orderId,
      oldTxn: oldTxn || "(null)",
      newTxn,
      updated: oldTxn !== newTxn ? "YES" : "NO",
      rationale,
    });
  }

  console.table(auditReport);
  console.log(`\n=== Backfill Completed: ${updatedCount} payment(s) updated out of ${payments.length} ===\n`);
}

backfillTransactionRefs()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
