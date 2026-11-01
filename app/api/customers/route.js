import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const authCheck = await requirePermission(request, "customers", "read");
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    // Fetch all customers who are not soft-deleted
    const rawCustomers = await prisma.customer.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        leader: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            promoteCode: true,
          },
        },
        bookingItems: {
          where: {
            booking: {
              deletedAt: null,
            },
          },
          include: {
            booking: {
              select: {
                id: true,
                bookedDate: true,
                status: true,
                amount: true,
                source: true,
                payment: {
                  select: {
                    orderId: true,
                  },
                },
              },
            },
            session: {
              include: {
                program: {
                  select: {
                    title: true,
                  },
                },
              },
            },
          },
          orderBy: {
            date: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    /**
     * Deduplication Rules:
     * - Do NOT merge on email alone!
     * - Merge ONLY on matching ID/Passport (excluding "AGENT" placeholder)
     * - OR merge on (email + name) matching together
     * - Keep distinct otherwise
     */
    const customerMap = new Map();

    for (const cust of rawCustomers) {
      const cleanName = (cust.name || "").trim();
      const cleanEmail = (cust.email || "").trim().toLowerCase();
      const cleanNic = (cust.nic || "").trim().toUpperCase();
      const cleanPhone = (cust.phone || "").trim();

      let dedupKey = "";
      if (cleanNic && cleanNic !== "AGENT") {
        // Merge on matching ID/Passport (excluding the "AGENT" placeholder)
        dedupKey = `nic:${cleanNic}`;
      } else if (cleanEmail && cleanName) {
        // Merge on matching email PLUS name
        dedupKey = `email_name:${cleanEmail}::${cleanName.toLowerCase()}`;
      } else {
        // Distinct record
        dedupKey = `id:${cust.id}`;
      }

      if (!customerMap.has(dedupKey)) {
        customerMap.set(dedupKey, {
          id: cust.id,
          name: cleanName,
          email: cust.email || "",
          phone: cleanPhone,
          nic: cust.nic || "",
          leader: cust.leader || null,
          bookingIds: new Set(),
          bookingHistory: [],
          lastBookingDate: null,
        });
      }

      const profile = customerMap.get(dedupKey);

      // Keep latest non-empty contact info
      if (!profile.name && cleanName) profile.name = cleanName;
      if (!profile.phone && cleanPhone) profile.phone = cleanPhone;
      if (!profile.nic && cust.nic) profile.nic = cust.nic;
      if (!profile.leader && cust.leader) profile.leader = cust.leader;

      // Aggregate bookings from bookingItems
      for (const item of cust.bookingItems) {
        if (!item.booking) continue;
        const bId = item.booking.id;

        const bookingDate = item.booking.bookedDate || item.date;
        if (bookingDate) {
          const d = new Date(bookingDate);
          if (!Number.isNaN(d.getTime())) {
            if (!profile.lastBookingDate || d > new Date(profile.lastBookingDate)) {
              profile.lastBookingDate = d.toISOString();
            }
          }
        }

        if (!profile.bookingIds.has(bId)) {
          profile.bookingIds.add(bId);
          profile.bookingHistory.push({
            bookingId: bId,
            orderId: item.booking.payment?.orderId || `RV-${bId}`,
            date: bookingDate ? new Date(bookingDate).toISOString() : null,
            status: item.booking.status,
            source: item.booking.source || "ONLINE",
            amount: item.booking.amount,
            programTitle: item.session?.program?.title || item.session?.name || "Program Session",
            sessionName: item.session?.name || "",
          });
        }
      }
    }

    const profiles = Array.from(customerMap.values());

    /**
     * Likely Duplicates Detection (without auto-merging):
     * Check if different customer profiles share:
     * 1. Same non-empty email (different names/NIC)
     * 2. Same non-empty phone (different names/NIC)
     */
    for (let i = 0; i < profiles.length; i++) {
      const p1 = profiles[i];
      p1.likelyDuplicates = [];

      for (let j = 0; j < profiles.length; j++) {
        if (i === j) continue;
        const p2 = profiles[j];

        const sameEmail =
          p1.email &&
          p2.email &&
          p1.email.trim().toLowerCase() === p2.email.trim().toLowerCase();

        const p1Digits = (p1.phone || "").replace(/\D/g, "");
        const p2Digits = (p2.phone || "").replace(/\D/g, "");
        const samePhone =
          p1Digits.length >= 7 &&
          p2Digits.length >= 7 &&
          (p1Digits === p2Digits ||
            p1Digits.endsWith(p2Digits.slice(-9)) ||
            p2Digits.endsWith(p1Digits.slice(-9)));

        if (sameEmail || samePhone) {
          const reasons = [];
          if (sameEmail) reasons.push(`Shared Email: ${p2.email}`);
          if (samePhone) reasons.push(`Shared Phone: ${p2.phone}`);

          p1.likelyDuplicates.push({
            id: p2.id,
            name: p2.name,
            email: p2.email,
            phone: p2.phone,
            nic: p2.nic,
            reason: reasons.join(", "),
          });
        }
      }
    }

    // Convert to response list
    let customersList = profiles.map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      nic: p.nic,
      bookingsCount: p.bookingIds.size,
      lastBookingDate: p.lastBookingDate,
      leaderId: p.leader?.id || null,
      leaderName: p.leader?.role === "LEADER" ? p.leader.name : "Direct",
      leaderRole: p.leader?.role || "USER",
      leaderPromoteCode: p.leader?.role === "LEADER" ? (p.leader.promoteCode || null) : null,
      affiliatedAgent: p.leader?.role === "LEADER" ? p.leader.name : null,
      likelyDuplicates: p.likelyDuplicates,
      bookingHistory: p.bookingHistory.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }),
    }));

    // Search filter if provided
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      customersList = customersList.filter((c) => {
        return (
          (c.name || "").toLowerCase().includes(q) ||
          (c.email || "").toLowerCase().includes(q) ||
          (c.phone || "").toLowerCase().includes(q) ||
          (c.nic || "").toLowerCase().includes(q) ||
          (c.affiliatedAgent || "").toLowerCase().includes(q)
        );
      });
    }

    // Sort by latest booking date descending, then name
    customersList.sort((a, b) => {
      if (a.lastBookingDate && b.lastBookingDate) {
        return new Date(b.lastBookingDate).getTime() - new Date(a.lastBookingDate).getTime();
      }
      if (a.lastBookingDate) return -1;
      if (b.lastBookingDate) return 1;
      return (a.name || "").localeCompare(b.name || "");
    });

    return NextResponse.json({
      success: true,
      customers: customersList,
      total: customersList.length,
    });
  } catch (error) {
    console.error("Customers GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}
