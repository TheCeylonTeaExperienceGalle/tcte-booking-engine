import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import prisma from "@/lib/prisma";
import { MAIN_WEBSITE_URL } from "@/lib/site";
import {
  normalizeOrderId,
  readPaymentDisplay,
} from "@/lib/payments/order-status";

export const metadata = {
  title: "Booking payment status",
  description: "Review the outcome of your Ceylon Tea Experience booking payment.",
};

export const dynamic = "force-dynamic";

export default async function BookingResultPage({ searchParams }) {
  const params = await searchParams;
  const orderId = normalizeOrderId(params?.order_id || params?.orderId);
  const display = await readPaymentDisplay(prisma, orderId);
  const copy = display.copy;
  const shouldShowOrderReference = Boolean(display.orderId);

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
                <span className="mt-1 font-mono text-base">{display.orderId}</span>
              </div>
            ) : null}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild variant="outline" className="bg-white/80 backdrop-blur">
                <Link href="/book">Book another experience</Link>
              </Button>
              <Button asChild variant="outline" className="bg-white/80 backdrop-blur">
                <a href="mailto:reservations@theceylonteaexperience.com">
                  Contact TCTE
                </a>
              </Button>
              <Button asChild className="bg-gradient-to-r from-emerald-600 to-amber-500 text-white shadow-lg shadow-emerald-600/30">
                <a href={MAIN_WEBSITE_URL}>Return to main website</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
