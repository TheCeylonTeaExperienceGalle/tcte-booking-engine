import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jsonAuthError, requireAdmin } from "@/lib/security/auth";

export const dynamic = "force-dynamic";

function deriveStatus(lastSessionDate, sessionsCount) {
  if (!sessionsCount || !lastSessionDate) {
    return "No Sessions";
  }

  const now = new Date();
  const lastSession = new Date(lastSessionDate);

  if (Number.isNaN(lastSession.getTime())) {
    return "No Sessions";
  }

  const diffMilliseconds = lastSession.getTime() - now.getTime();
  const diffDays = diffMilliseconds / (1000 * 60 * 60 * 24);

  if (diffDays >= 1) {
    return "Upcoming";
  }

  const pastDays = Math.abs(diffDays);

  if (pastDays <= 7) {
    return "Active";
  }

  if (pastDays <= 21) {
    return "Paused";
  }

  return "At Risk";
}

export async function GET(request) {
  const auth = requireAdmin(request);
  if (!auth.ok) return jsonAuthError(auth);

  try {
    const customers = await prisma.customer.findMany({
      where: {
        deletedAt: null,
        leader: {
          deletedAt: null,
        },
      },
      include: {
        leader: true,
        bookingItems: {
          where: {
            booking: {
              deletedAt: null,
            },
            session: {
              deletedAt: null,
              program: {
                deletedAt: null,
              },
            },
          },
          include: {
            session: {
              include: {
                program: true,
              },
            },
          },
          orderBy: {
            date: "desc",
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    const leaderGroups = new Map();

    customers.forEach((customer) => {
      const leader = customer.leader;
      if (!leader) {
        return;
      }

      const resolvedLeaderName =
        (leader.name && leader.name.trim()) || leader.email || `Leader #${leader.id}`;

      const entry = leaderGroups.get(leader.id) || {
        leaderId: leader.id,
        leaderName: resolvedLeaderName,
        leaderEmail: leader.email,
        leaderRole: leader.role,
        totalSessions: 0,
        latestSessionDate: null,
        customers: [],
      };

      if (!entry.leaderName) {
        entry.leaderName = resolvedLeaderName;
      }
      if (!entry.leaderEmail) {
        entry.leaderEmail = leader.email;
      }
      if (!entry.leaderRole) {
        entry.leaderRole = leader.role;
      }

      const { bookingItems } = customer;
      const sessionsCount = bookingItems.length;
      const lastBookingItem = bookingItems[0];
      const lastSessionDate = lastBookingItem?.date ?? null;
      const programTitle = lastBookingItem?.session?.program?.title ?? null;

      entry.customers.push({
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        sessionsCount,
        programTitle,
        lastSessionDate,
        status: deriveStatus(lastSessionDate, sessionsCount),
      });

      entry.totalSessions += sessionsCount;

      if (lastSessionDate) {
        const currentLatest = entry.latestSessionDate
          ? new Date(entry.latestSessionDate)
          : null;
        const candidate = new Date(lastSessionDate);

        if (!Number.isNaN(candidate.getTime())) {
          if (!currentLatest || candidate > currentLatest) {
            entry.latestSessionDate = lastSessionDate;
          }
        }
      }

      leaderGroups.set(leader.id, entry);
    });

    const leaders = Array.from(leaderGroups.values())
      .map((entry) => {
        const leaderName =
          (entry.leaderName && entry.leaderName.trim()) ||
          entry.leaderEmail ||
          `Leader #${entry.leaderId}`;

        return {
          leaderId: entry.leaderId,
          leaderName,
          leaderEmail: entry.leaderEmail,
          leaderRole: entry.leaderRole,
          totalCustomers: entry.customers.length,
          totalSessions: entry.totalSessions,
          latestSessionDate: entry.latestSessionDate,
          status: deriveStatus(entry.latestSessionDate, entry.totalSessions),
          customers: entry.customers.sort((a, b) =>
            a.customerName.localeCompare(b.customerName)
          ),
        };
      })
      .sort((a, b) => a.leaderName.localeCompare(b.leaderName));

    return NextResponse.json({ leaders });
  } catch (error) {
    console.error("Get customers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}
