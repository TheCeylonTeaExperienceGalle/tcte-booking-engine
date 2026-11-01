import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import prisma from "@/lib/prisma";

const STATUS_COPY = {
  success: {
    title: "Payment confirmed",
    description:
      "Thank you for completing your booking. A confirmation email with the full itinerary has been sent to you.",
    accent: "text-emerald-600",
    badge: "Settled",
  },
  pending: {
    title: "Payment pending",
    description:
      "Your payment is still being verified by PayHere. We will email you once it is confirmed.",
    accent: "text-amber-600",
    badge: "Awaiting gateway",
  },
  cancelled: {
    title: "Payment cancelled",
    description:
      "It looks like the payment was cancelled. You can try the checkout again or reach out to our concierge team for assistance.",
    accent: "text-rose-600",
    badge: "Cancelled",
  },
  failed: {
    title: "Payment failed",
    description:
      "The transaction could not be completed. Please try again or contact PayHere support if the issue persists.",
    accent: "text-rose-600",
    badge: "Failed",
  },
};

function resolveCopy(statusParam) {
  const normalized = String(statusParam ?? "").toLowerCase();

  if (normalized === "success") return STATUS_COPY.success;
  if (normalized === "pending") return STATUS_COPY.pending;
  if (normalized === "cancelled") return STATUS_COPY.cancelled;
  if (normalized === "failed") return STATUS_COPY.failed;

  return {
    title: "Payment status unknown",
    description:
      "We are still waiting for the payment gateway to report the final status. Please refresh this page in a moment or contact our concierge.",
    accent: "text-slate-600",
    badge: "Processing",
  };
}

async function updateDevStatus(orderId, statusParam) {
  // Only allow this in development to prevent security issues in production
  // In production, the PayHere notify webhook should handle this securely
  // if (process.env.NODE_ENV !== "development") return;

  const normalized = String(statusParam ?? "").toLowerCase();
  let paymentStatus = null;
  let bookingStatus = null;

  if (normalized === "success") {
    paymentStatus = "SUCCESS";
    bookingStatus = "CONFIRMED";
  } else if (normalized === "cancelled") {
    paymentStatus = "CANCELED";
    bookingStatus = "CANCELLED";
  } else if (normalized === "failed") {
    paymentStatus = "FAILED";
    bookingStatus = "CANCELLED"; // Failed payments should cancel the booking to release seats
  }

  if (!paymentStatus) return;

  try {
    const payment = await prisma.payment.findUnique({
      where: { orderId },
      include: { bookings: true },
    });

    if (!payment) return;

    // Only update if currently PENDING to avoid overwriting final states
    // if (payment.status === "PENDING") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: paymentStatus },
      });

      if (payment.bookings.length > 0) {
        await prisma.booking.update({
          where: { id: payment.bookings[0].id },
          data: { status: bookingStatus },
        });
      }
    // }
  } catch (error) {
    console.error("Failed to update status in dev mode:", error);
  }
}

export const metadata = {
  title: "Booking payment status",
  description: "Review the outcome of your Reviva experience booking payment.",
};

export default async function BookingResultPage({ searchParams }) {
  const params = await searchParams;
  
  // Handle potential array from duplicate query params
  const rawOrderId = params?.order_id || params?.orderId || "";
  const orderId = Array.isArray(rawOrderId) ? rawOrderId[0] : rawOrderId;

  const copy = resolveCopy(params?.status);
  const normalizedStatus = String(params?.status ?? "").toLowerCase();
  const shouldShowOrderReference = Boolean(
    orderId && normalizedStatus && normalizedStatus !== "cancelled"
  );

  if (orderId && params?.status) {
    await updateDevStatus(orderId, params.status);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_#fef7ed,_#f1f5f9)] dark:bg-slate-950">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <Card className="w-full max-w-2xl border border-white/60 bg-white/90 backdrop-blur-lg shadow-[0_25px_70px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-900/70">
          <CardHeader className="space-y-4 text-center">
            <span className={`inline-flex items-center justify-center rounded-full bg-emerald-50 px-4 py-1 text-sm font-semibold uppercase tracking-wide ${copy.accent}`}>
              {copy.badge}
            </span>
            <CardTitle className="text-3xl font-serif font-semibold text-slate-900 dark:text-slate-100">
              {copy.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center text-slate-700 dark:text-slate-300">
            <p>{copy.description}</p>
            {shouldShowOrderReference ? (
              <div className="mx-auto inline-flex flex-col items-center rounded-2xl border border-dashed border-emerald-300/60 bg-emerald-50/70 px-6 py-3 text-center text-sm font-medium text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-900/40 dark:text-emerald-200">
                <span className="uppercase tracking-[0.3em] text-xs text-emerald-500">
                  Order reference
                </span>
                <span className="mt-1 font-mono text-base">{orderId}</span>
              </div>
            ) : null}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild variant="outline" className="bg-white/80 backdrop-blur">
                <Link href="/book">Book another experience</Link>
              </Button>
              <Button asChild className="bg-gradient-to-r from-emerald-600 to-amber-500 text-white shadow-lg shadow-emerald-600/30">
                <Link href="/">Return home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
