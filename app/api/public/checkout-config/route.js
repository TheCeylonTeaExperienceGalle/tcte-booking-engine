import { NextResponse } from "next/server";
import { isPayHereEnabled } from "@/lib/payments/payhere-enabled";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    payHereEnabled: isPayHereEnabled(),
  });
}
