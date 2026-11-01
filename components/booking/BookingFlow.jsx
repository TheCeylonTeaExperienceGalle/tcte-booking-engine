"use client";

import { useState } from "react";
import { format } from "date-fns";
import BookingHeader from "@/components/booking/BookingHeader";
import BookingFooter from "@/components/booking/BookingFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FaCheck } from "react-icons/fa";
import { Download, FileText, AlertCircle, Loader2 } from "lucide-react";
import { downloadSingleBookingPDF } from "@/lib/reportExport";
import { BookingProvider, useBooking } from "./BookingContext";
import DateProgramSelector from "./DateProgramSelector";
import GuestDetailsForm from "./GuestDetailsForm";
import PaymentSummary from "./PaymentSummary";
import { formatSessionTime } from "@/lib/dateUtils";

function BookingForm() {
  const {
    selectedDate, totalSeatsRequested, programSelections, programOptions,
    guestDetails, formData, costBreakdown, discountInfo,
    isAgentBooking, verifiedLeader
  } = useBooking();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [referenceCode, setReferenceCode] = useState("");
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (e.target !== e.currentTarget) return;
    setSubmitError("");

    if (!selectedDate || totalSeatsRequested === 0) {
      setSubmitError("Please select a date, a program, and seats needed.");
      return;
    }

    const primaryGuest = guestDetails[0];
    if (!primaryGuest?.name || !primaryGuest?.email) {
      setSubmitError("Please provide at least a name and email for the first guest.");
      return;
    }

    if (isAgentBooking && !verifiedLeader) {
      setSubmitError("Please verify your Travel Agent code, or uncheck 'Are you a Travel Agent?' to continue as a direct guest.");
      return;
    }

    // Double-submit prevention lock
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // 1. Resolve Travel Agent (Only if booked through a verified travel agent)
      const finalLeaderId = verifiedLeader ? verifiedLeader.id : null;

      // 2. Format Selections with sessionTypeId and attendee mapping per session (Item 15)
      const bookingSelections = [];
      Object.entries(programSelections).forEach(([programId, selection]) => {
        if (!selection || selection.seatsRequested <= 0) return;
        const program = programOptions.find(p => String(p.id) === String(programId));
        
        Object.entries(selection.activities || {}).forEach(([sessionId, state]) => {
          if (!state.selected) return;
          const sessId = parseInt(sessionId);
          const session = program?.sessions?.find(s => String(s.id) === String(sessionId));

          // Group guests by their selected sessionTypeId for this session
          const groups = new Map();
          guestDetails.forEach(guest => {
            let chosenTypeId = null;
            if (session?.sessionTypes?.length > 0 && guest.selectedSessionTypes) {
              const matchedType = session.sessionTypes.find(st => !!guest.selectedSessionTypes[st.id]);
              if (matchedType) {
                chosenTypeId = matchedType.id;
              }
            }
            if (!groups.has(chosenTypeId)) {
              groups.set(chosenTypeId, []);
            }
            groups.get(chosenTypeId).push(guest);
          });

          groups.forEach((guests, typeId) => {
            bookingSelections.push({
              sessionId: sessId,
              sessionTypeId: typeId || null,
              seatsRequested: guests.length,
              customers: guests.map(g => ({
                name: g.name || primaryGuest.name,
                email: g.email || primaryGuest.email,
                phone: g.phone || primaryGuest.phone || null,
                nic: g.idNumber || null
              }))
            });
          });
        });
      });

      if (bookingSelections.length === 0) throw new Error("No activities selected. Please select at least one activity to proceed.");

      let calculatedDiscount = 0;
      if (discountInfo?.appliedRules?.length > 0) {
        calculatedDiscount = discountInfo.appliedRules.reduce((sum, rule) => {
          const progSeats =
            programSelections[rule.programId]?.seatsRequested || totalSeatsRequested;
          if (rule.discountType === "PERCENTAGE") {
            const prog = programOptions.find((p) => String(p.id) === String(rule.programId));
            let progTotal = 0;
            (prog?.sessions || []).forEach((s) => {
              if (rule.sessionIds?.includes(s.id)) {
                const price = s.specialPrice != null ? Number(s.specialPrice) : Number(s.price || 0);
                progTotal += price * progSeats;
              }
            });
            return sum + (progTotal * rule.discountValue) / 100;
          } else {
            return sum + rule.discountValue * progSeats;
          }
        }, 0);
      } else if (discountInfo?.appliedRule) {
        const rule = discountInfo.appliedRule;
        if (rule.discountType === "PERCENTAGE") {
          calculatedDiscount = (costBreakdown.total * rule.discountValue) / 100;
        } else {
          calculatedDiscount = rule.discountValue * totalSeatsRequested;
        }
      }
      const discountedTotal = Math.max(0, costBreakdown.total - calculatedDiscount);

      const payload = {
        leaderId: finalLeaderId,
        bookedDate: format(selectedDate, "yyyy-MM-dd"),
        selections: bookingSelections,
        payment: {
          paymentType: formData.payment,
          full_payment_price: discountedTotal,
          amount: formData.payment === "Partial" ? Number(formData.partialAmount) : formData.payment === "Later" ? 0 : discountedTotal,
          provider: "MANUAL", // Complete immediately without third-party redirect
          currency: "USD",
          method: formData.payment === "Later" ? "Pay Later" : "Direct / Manual",
          transactionId: formData.payment === "Later" ? null : null,
        },
        customer: {
          name: primaryGuest.name,
          email: primaryGuest.email,
          phone: primaryGuest.phone || "",
          address: "N/A", city: "Colombo", country: "Sri Lanka"
        }
      };

      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Booking failed.");
      
      if (result.paymentRedirect) {
        submitPayHereRedirect(result.paymentRedirect);
        return;
      }

      const paymentMethodLabel =
        formData.payment === "Later"
          ? "Pay Later (Pay on Arrival)"
          : formData.payment === "Partial"
          ? "Partial Payment"
          : "Full Payment";

      // Build booked items across all programs and sessions
      const bookedItemsList = [];
      bookingSelections.forEach((sel) => {
        let matchedSession = null;
        let matchedProgram = null;
        for (const prog of programOptions) {
          const s = prog.sessions?.find((sess) => sess.id === sel.sessionId);
          if (s) {
            matchedSession = s;
            matchedProgram = prog;
            break;
          }
        }

        const st = matchedSession?.sessionTypes?.find((t) => t.id === sel.sessionTypeId);
        bookedItemsList.push({
          sessionId: sel.sessionId,
          sessionName: matchedSession?.name || "Activity",
          sessionTypeName: st?.name || null,
          programTitle: matchedProgram?.title || "Tea Experience",
          locationName: matchedProgram?.location?.name || null,
          startTime: matchedSession?.startTime,
          endTime: matchedSession?.endTime,
          seats: sel.seatsRequested || 1,
          customers: sel.customers || [],
        });
      });

      const allProgramTitles = Array.from(new Set(bookedItemsList.map(i => i.programTitle))).join(", ");
      const allLocations = Array.from(new Set(bookedItemsList.map(i => i.locationName).filter(Boolean))).join(", ");

      const confirmedData = {
        bookingId: result.bookingId,
        referenceCode: result.referenceCode || `RV-${result.bookingId}`,
        guestName: primaryGuest.name,
        guestEmail: primaryGuest.email,
        guestPhone: primaryGuest.phone || "",
        programTitle: allProgramTitles || "Tea Experience",
        location: (allLocations && allLocations !== "All Locations" ? allLocations : "") || (formData.location && formData.location !== "All Locations" ? formData.location : "") || "Sri Lanka",
        bookedDate: selectedDate,
        items: bookedItemsList,
        guestDetails: guestDetails,
        paymentType: formData.payment,
        paymentMethod: paymentMethodLabel,
        totalPrice: discountedTotal,
        paidAmount:
          formData.payment === "Partial"
            ? Number(formData.partialAmount || 0)
            : formData.payment === "Later"
            ? 0
            : discountedTotal,
        balance:
          formData.payment === "Later"
            ? discountedTotal
            : formData.payment === "Partial"
            ? Math.max(0, discountedTotal - Number(formData.partialAmount || 0))
            : 0,
      };

      setConfirmedBooking(confirmedData);
      setReferenceCode(result.referenceCode || `RV-${result.bookingId}`);
      setBookingConfirmed(true);
    } catch (err) {
      setSubmitError(err.message || "An unexpected error occurred while placing the booking.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitPayHereRedirect = (redirect) => {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = redirect.actionUrl;
    Object.entries(redirect.params).forEach(([key, value]) => {
      if (value == null) return;
      const input = document.createElement("input");
      input.type = "hidden"; input.name = key; input.value = String(value);
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  };

  if (bookingConfirmed) {
    const refCode = confirmedBooking?.referenceCode || referenceCode;

    return (
      <div className="max-w-2xl mx-auto my-12 px-4 animate-in fade-in duration-500">
        <Card className="border-2 shadow-2xl bg-card overflow-hidden">
          <div className="bg-[#1A3D1A] text-white p-6 text-center">
            <div className="inline-flex p-3 bg-white/20 rounded-full mb-3">
              <FaCheck className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Booking Confirmed!</h1>
            <p className="text-[#F9F6F0] text-sm mt-1">
              Thank you! Your reservation has been successfully placed.
              {confirmedBooking?.guestEmail && (
                <> A confirmation email was sent to <strong>{confirmedBooking.guestEmail}</strong>.</>
              )}
            </p>
          </div>

          <CardContent className="p-6 space-y-6">
            <div className="bg-muted/40 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-center sm:text-left">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Booking Reference
                </p>
                <p className="text-xl font-mono font-bold text-primary mt-0.5">
                  {refCode}
                </p>
              </div>
              {confirmedBooking && (
                <Button
                  size="lg"
                  className="bg-[#2D6A2D] hover:bg-[#1A3D1A] text-white gap-2 h-11"
                  onClick={() => downloadSingleBookingPDF(confirmedBooking)}
                >
                  <Download className="h-4 w-4" />
                  Download PDF Voucher
                </Button>
              )}
            </div>

            {/* Summary details */}
            {confirmedBooking && (
              <>
                <div className="space-y-4 text-sm">
                  <h3 className="font-semibold text-foreground border-b pb-1.5 text-base">Reservation Details</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                    <span className="text-muted-foreground">Guest Name:</span>
                    <span className="font-medium text-right text-foreground">{confirmedBooking.guestName}</span>

                    <span className="text-muted-foreground">Program:</span>
                    <span className="font-medium text-right text-foreground">{confirmedBooking.programTitle}</span>

                    {confirmedBooking.items && confirmedBooking.items.length > 0 && (
                      <>
                        <span className="text-muted-foreground">Session:</span>
                        <span className="font-medium text-right text-foreground">
                          {Array.from(new Set(confirmedBooking.items.map(i => i.sessionName).filter(Boolean))).join(", ") || "Standard Session"}
                        </span>

                        <span className="text-muted-foreground">Activity:</span>
                        <span className="font-medium text-right text-primary">
                          {Array.from(new Set(confirmedBooking.items.map(i => i.sessionTypeName || i.sessionName).filter(Boolean))).join(", ") || "Standard Activity"}
                        </span>
                      </>
                    )}

                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-medium text-right text-foreground">
                      {new Date(confirmedBooking.bookedDate).toLocaleDateString("en-US", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>

                    <span className="text-muted-foreground">Location:</span>
                    <span className="font-medium text-right text-foreground">{confirmedBooking.location}</span>

                    <span className="text-muted-foreground">Payment Method:</span>
                    <span className="font-semibold text-right text-primary">{confirmedBooking.paymentMethod}</span>
                  </div>

                  {/* Program, Session & Activity Breakdown */}
                  {confirmedBooking.items && confirmedBooking.items.length > 0 && (
                    <div className="pt-2 border-t space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A3D1A]">
                          Program, Session & Activities
                        </h4>
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {confirmedBooking.items.reduce((acc, i) => acc + (i.seats || 1), 0)} Total Seats
                        </span>
                      </div>
                      <div className="space-y-2.5">
                        {confirmedBooking.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg bg-muted/40 p-3.5 border border-border/80 text-xs space-y-2 shadow-xs"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
                              <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[#1A3D1A] inline-block" />
                                Program: {item.programTitle}
                              </span>
                              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                {item.seats} {item.seats === 1 ? "Seat" : "Seats"}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-0.5">
                              <div>
                                <span className="text-muted-foreground block text-[11px] font-medium">Session:</span>
                                <span className="font-semibold text-foreground">
                                  {item.sessionName}
                                  {(item.startTime || item.endTime) && (
                                    <span className="text-muted-foreground font-normal ml-1">
                                      ({formatSessionTime(item.startTime)} – {formatSessionTime(item.endTime)})
                                    </span>
                                  )}
                                </span>
                              </div>

                              <div>
                                <span className="text-muted-foreground block text-[11px] font-medium">Activity:</span>
                                <span className="font-semibold text-primary">
                                  {item.sessionTypeName || item.sessionName || "Standard Activity"}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Price breakdown / Payment Summary */}
                <div className="bg-muted/30 p-4 rounded-lg space-y-3 text-xs sm:text-sm border">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground pb-1.5 border-b flex justify-between items-center">
                    <span>Payment Summary</span>
                    <span className="font-semibold text-primary text-[11px]">{confirmedBooking.paymentMethod}</span>
                  </div>

                  {/* Program, Session & Activity list inside Payment Summary */}
                  {confirmedBooking.items && confirmedBooking.items.length > 0 && (
                    <div className="space-y-2 pb-2 border-b">
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Booked Experiences & Activities:
                      </div>
                      {confirmedBooking.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start gap-2 text-xs bg-background/60 p-2.5 rounded border border-border/50">
                          <div className="space-y-0.5">
                            <div className="font-bold text-foreground flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                              Program: {item.programTitle}
                            </div>
                            <div className="text-muted-foreground text-[11px]">
                              <span className="font-medium text-foreground">Session:</span> {item.sessionName}
                              {(item.startTime || item.endTime) && (
                                <span className="ml-1">({formatSessionTime(item.startTime)} – {formatSessionTime(item.endTime)})</span>
                              )}
                            </div>
                            <div className="text-[11px]">
                              <span className="text-muted-foreground font-medium">Activity:</span>{" "}
                              <span className="font-semibold text-primary">
                                {item.sessionTypeName || item.sessionName || "Standard Activity"}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted text-foreground shrink-0">
                            {item.seats} {item.seats === 1 ? "Seat" : "Seats"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between pt-1">
                    <span className="text-muted-foreground">Total Price:</span>
                    <span className="font-bold text-foreground">${confirmedBooking.totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Paid Now:</span>
                    <span>${confirmedBooking.paidAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-bold text-foreground">
                    <span>Balance Due on Arrival:</span>
                    <span className="text-amber-700">${confirmedBooking.balance.toFixed(2)}</span>
                  </div>
                </div>
              </>
            )}

            {/* Action buttons (Item 17: high-contrast visible buttons) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {confirmedBooking && (
                <Button
                  className="w-full gap-2 bg-[#2D6A2D] hover:bg-[#1A3D1A] text-white font-bold h-12 text-sm shadow-md"
                  onClick={() => downloadSingleBookingPDF(confirmedBooking)}
                >
                  <FileText className="h-4 w-4" />
                  Save PDF Voucher
                </Button>
              )}
              <Button
                variant="outline"
                className={`w-full gap-2 border-2 border-primary text-primary hover:bg-primary/10 font-bold h-12 text-sm bg-background shadow-xs ${
                  !confirmedBooking ? "sm:col-span-2" : ""
                }`}
                onClick={() => window.location.reload()}
              >
                Make Another Booking
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] px-4 mx-auto mt-10">
      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Date & Program Selector */}
        <div className="w-full space-y-6">
          <Card className="border-2 shadow-xl bg-card">
            <CardContent className="p-6">
              <DateProgramSelector />
            </CardContent>
          </Card>
        </div>
        
        {/* Middle Column: Guest Details */}
        <div className="w-full lg:sticky lg:top-24 space-y-6">
          {totalSeatsRequested > 0 ? (
            <Card className="border-2 shadow-xl bg-card">
              <CardContent className="p-6">
                <GuestDetailsForm />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2 shadow-xl bg-card h-full flex flex-col justify-center">
              <CardContent className="p-12 text-center text-muted-foreground text-sm">
                <p>Select a date and seats to enter guest details.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Payment Summary */}
        <div className="w-full lg:sticky lg:top-24 space-y-6">
          <Card className="border-2 shadow-xl bg-card">
            <CardContent className="p-6">
              {totalSeatsRequested > 0 ? (
                <>
                  <PaymentSummary />
                  <div className="pt-6 mt-6 border-t space-y-4">
                    {submitError && (
                      <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm font-medium flex items-start gap-2.5 animate-in fade-in">
                        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-destructive" />
                        <div className="flex-1">
                          <p className="font-semibold text-xs uppercase tracking-wider">Submission Error</p>
                          <p className="text-xs leading-relaxed mt-0.5">{submitError}</p>
                        </div>
                      </div>
                    )}
                    <Button 
                      type="submit" 
                      size="lg" 
                      className="w-full h-14 text-lg font-bold shadow-md cursor-pointer transition-all" 
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Processing Booking...
                        </span>
                      ) : (
                        <><FaCheck className="mr-2"/> Confirm Booking</>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  <p>Select a date, programs, and seats to view your payment summary.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </form>
    </div>
  );
}

export default function BookingFlow() {
  return (
    <>
      <BookingHeader />
      <main id="main-content" className="min-h-screen py-16 bg-gradient-to-b from-background to-secondary/10">
        <div className="container mx-auto px-4">
          <BookingProvider>
            <BookingForm />
          </BookingProvider>
        </div>
      </main>
      <BookingFooter />
    </>
  );
}
