import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawCode = searchParams.get("code");

    if (!rawCode) {
      return NextResponse.json(
        { error: "Promo code is required" },
        { status: 400 }
      );
    }

    const code = rawCode.trim();
    if (!code) {
      return NextResponse.json(
        { error: "Promo code is required" },
        { status: 400 }
      );
    }

    const leader = await prisma.leader.findFirst({
      where: {
        deletedAt: null,
        promoteCode: code,
      },
      select: {
        id: true,
        name: true,
        email: true,
        contact: true,
        promoteCode: true,
        status: true,
      },
    });

    if (!leader) {
      return NextResponse.json(
        { error: "Promo code not found" },
        { status: 404 }
      );
    }

    if (leader.status === "PENDING") {
      return NextResponse.json(
        { error: "This Travel Agent account is pending admin verification." },
        { status: 403 }
      );
    }

    if (leader.status === "DEACTIVATED") {
      return NextResponse.json(
        { error: "This Agent account has been locked. Please contact support." },
        { status: 403 }
      );
    }

    return NextResponse.json({ leader });
  } catch (error) {
    console.error("Promo code lookup error", error);
    return NextResponse.json(
      { error: "Failed to verify promo code" },
      { status: 500 }
    );
  }
}
