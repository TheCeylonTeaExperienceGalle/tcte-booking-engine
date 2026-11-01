"use client";

import { useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { useBooking } from "./BookingContext";
import { formatSessionTime } from "@/lib/dateUtils";

export default function PaymentSummary() {
  const {
    programSelections, programOptions, formData, setFormData,
    discountInfo, setDiscountInfo, discountLoading, setDiscountLoading,
    costBreakdown, totalSeatsRequested, currentStage, guestDetails,
    verifiedLeader, setVerifiedLeader, promoStatus, setPromoStatus,
    isAgentBooking
  } = useBooking();

  const handleVerifyPromoCode = async () => {
    if (verifiedLeader) {
      // Remove promo
      setVerifiedLeader(null);
      setFormData(prev => ({ ...prev, promoCode: "" }));
      setPromoStatus({ state: "idle", message: "" });
      return;
    }

    if (!formData.promoCode) return;

    setPromoStatus({ state: "loading", message: "Verifying..." });
    try {
      const res = await fetch(`/api/public/promo?code=${encodeURIComponent(formData.promoCode)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Invalid promo code");
      }

      setVerifiedLeader(data.leader);
      setPromoStatus({ state: "success", message: `Code applied for ${data.leader.name}!` });
    } catch (err) {
      setPromoStatus({ state: "error", message: err.message });
      setVerifiedLeader(null);
    }
  };

  const formatPrice = (val) => {
    if (val == null || val === "") return "Included";
    const n = Number(val);
    if (isNaN(n) || n <= 0) return "Included";
    return `USD ${n.toLocaleString()}`;
  };

  const bookedSessionSummary = useMemo(() => {
    const items = [];
    Object.entries(programSelections).forEach(([programId, selection]) => {
      if (!selection || selection.seatsRequested <= 0) return;
      const program = programOptions.find((p) => String(p.id) === String(programId));
      if (!program) return;

      Object.entries(selection.activities || {}).forEach(([sessionId, actState]) => {
        if (!actState?.selected) return;
        const session = program.sessions?.find((s) => String(s.id) === String(sessionId));
        if (!session) return;

        // Gather all selected activity types for this session
        const activityTypeNames = [];
        (guestDetails || []).forEach((guest) => {
          Object.keys(guest.selectedSessionTypes || {}).forEach((typeId) => {
            const st = session.sessionTypes?.find((t) => String(t.id) === String(typeId));
            if (st && !activityTypeNames.includes(st.name)) {
              activityTypeNames.push(st.name);
            }
          });
        });

        const activityLabel =
          activityTypeNames.length > 0
            ? activityTypeNames.join(", ")
            : "Standard Activity";

        const sessionPrice =
          session.specialPrice != null && session.specialPrice !== ""
            ? Number(session.specialPrice)
            : Number(session.price || 0);

        items.push({
          sessionId: session.id,
          sessionName: session.name,
          startTime: session.startTime,
          endTime: session.endTime,
          programTitle: program.title,
          activityName: activityLabel,
          seats: selection.seatsRequested,
          price: sessionPrice * selection.seatsRequested,
        });
      });
    });
    return items;
  }, [programSelections, programOptions, guestDetails]);

  // Group selected activities under session headings (Item 13)
  const activitiesBySession = useMemo(() => {
    const groups = new Map();
    (costBreakdown.selectedActivities || []).forEach((act) => {
      let heading = act.name || "Scheduled Activity";
      const lower = (act.name || "").toLowerCase();
      if (lower.includes("morning")) heading = "Morning Session";
      else if (lower.includes("afternoon")) heading = "Afternoon Session";
      else if (lower.includes("evening")) heading = "Evening Session";

      if (!groups.has(heading)) {
        groups.set(heading, []);
      }
      groups.get(heading).push(act);
    });
    return Array.from(groups.entries()).map(([heading, items]) => ({ heading, items }));
  }, [costBreakdown.selectedActivities]);

  useEffect(() => {
    const fetchDiscount = async () => {
      const selectedSessionIds = [];
      const programIds = [];

      Object.entries(programSelections).forEach(([programId, selection]) => {
        if (!selection || selection.seatsRequested <= 0) return;
        const pId = parseInt(programId);
        if (!programIds.includes(pId)) programIds.push(pId);
        Object.entries(selection.activities || {}).forEach(([sessionId, state]) => {
          if (!state.selected) return;
          const sId = parseInt(sessionId);
          if (!selectedSessionIds.includes(sId)) {
            selectedSessionIds.push(sId);
          }
        });
      });

      if (selectedSessionIds.length === 0 || programIds.length === 0) {
        setDiscountInfo(null);
        return;
      }

      setDiscountLoading(true);
      try {
        const res = await fetch('/api/discount-rules/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            programId: programIds[0],
            programIds: programIds,
            sessionIds: selectedSessionIds,
            sessionTypeSelections: {} 
          })
        });
        if (res.ok) {
          const data = await res.json();
          setDiscountInfo(data);
        } else {
          setDiscountInfo(null);
        }
      } catch (err) {
        setDiscountInfo(null);
      } finally {
        setDiscountLoading(false);
      }
    };
    fetchDiscount();
  }, [programSelections, guestDetails, currentStage, setDiscountInfo, setDiscountLoading]);

  // Calculate discount consistently with the backend API
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
      // FIXED_AMOUNT (Flat Deduction per seat)
      calculatedDiscount = rule.discountValue * totalSeatsRequested;
    }
  }

  const discountedTotal = Math.max(0, costBreakdown.total - calculatedDiscount);

  const selectedProgram = programOptions.find(p => programSelections[p.id]?.seatsRequested > 0);
  const displayLocation = formData.location || selectedProgram?.location?.name || null;

  if (totalSeatsRequested === 0) return null;

  return (
    <div className="space-y-6 animate-fade-in border-t pt-8">
      <h2 className="text-2xl font-serif font-bold text-primary">Payment Summary</h2>
      
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="space-y-4">
          {!isAgentBooking && (
            <div className="grid gap-2">
              <Label htmlFor="promo">Promo Code (Optional)</Label>
              <div className="flex gap-2">
                <Input 
                  id="promo"
                  placeholder="Enter promo code"
                  value={formData.promoCode || ""}
                  onChange={(e) => setFormData(prev => ({...prev, promoCode: e.target.value}))}
                  disabled={promoStatus.state === "loading" || verifiedLeader}
                />
                <Button 
                  type="button"
                  variant={verifiedLeader ? "destructive" : "secondary"}
                  disabled={promoStatus.state === "loading" || (!formData.promoCode && !verifiedLeader)}
                  onClick={handleVerifyPromoCode}
                >
                  {promoStatus.state === "loading" ? "..." : verifiedLeader ? "Remove" : "Apply"}
                </Button>
              </div>
              {promoStatus.message && (
                <p className={`text-xs ${promoStatus.state === "success" ? "text-emerald-600" : "text-red-500"}`}>
                  {promoStatus.message}
                </p>
              )}
            </div>
          )}

          {displayLocation && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                Location:
              </span>
              <span className="font-semibold text-foreground">{displayLocation}</span>
            </div>
          )}

          {/* Program, Session & Activity Breakdown */}
          {bookedSessionSummary.length > 0 && (
            <div className="space-y-3 pt-3 border-t mt-3">
              <div className="text-xs font-bold uppercase tracking-wider text-primary">
                Program, Session & Activities:
              </div>
              <div className="space-y-2.5">
                {bookedSessionSummary.map((item, idx) => (
                  <div
                    key={`${item.sessionId}-${idx}`}
                    className="rounded-lg bg-muted/40 p-3 border border-border/70 text-xs space-y-1.5 shadow-2xs"
                  >
                    <div className="flex justify-between items-center font-bold text-foreground">
                      <span className="flex items-center gap-1.5 text-sm">
                        <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                        Program: {item.programTitle}
                      </span>
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        {item.seats} {item.seats === 1 ? "seat" : "seats"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                      <div>
                        <span className="font-medium text-foreground">Session: </span>
                        <span className="text-foreground">
                          {item.sessionName}
                          {(item.startTime || item.endTime) && (
                            <span className="text-muted-foreground ml-1">
                              ({formatSessionTime(item.startTime)} – {formatSessionTime(item.endTime)})
                            </span>
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Activity: </span>
                        <span className="font-semibold text-primary">{item.activityName}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {costBreakdown.programBaseTotal > 0 && (
            <div className="flex justify-between items-center pt-2 border-t mt-2 text-sm">
              <span className="text-muted-foreground">
                Program Admission ({totalSeatsRequested} {totalSeatsRequested === 1 ? "seat" : "seats"}):
              </span>
              <span className="font-semibold">{formatPrice(costBreakdown.programBaseTotal)}</span>
            </div>
          )}

          {costBreakdown.typeTotal > 0 && (
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Ticket / Option Add-ons:</span>
                <span className="font-semibold text-primary">{formatPrice(costBreakdown.typeTotal)}</span>
              </div>
              <div className="space-y-1 pl-2">
                {guestDetails.map((guest, gIdx) => {
                  return Object.keys(guest.selectedSessionTypes || {}).map(typeId => {
                    let stFound = null;
                    programOptions.forEach(p => {
                      p.sessions?.forEach(s => {
                        const found = s.sessionTypes?.find(t => String(t.id) === String(typeId));
                        if (found) stFound = found;
                      });
                    });
                    if (!stFound) return null;
                    const optPrice = (stFound.specialPrice != null && stFound.specialPrice !== "")
                      ? Number(stFound.specialPrice)
                      : Number(stFound.price || 0);
                    const gName = guest.name?.trim() || `Guest ${gIdx + 1}`;
                    return (
                      <div key={`${gIdx}-${typeId}`} className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>• {gName}: {stFound.name}</span>
                        <span>+{formatPrice(optPrice)}</span>
                      </div>
                    );
                  });
                })}
              </div>
            </div>
          )}

          {discountInfo?.appliedRule && (
            <div className="flex justify-between items-center text-emerald-600">
              <span>Discount ({discountInfo.appliedRule.name}):</span>
              <span>-{formatPrice(calculatedDiscount)}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-3 border-t">
            <span className="font-bold">Total to Pay:</span>
            <span className="text-xl font-bold text-primary">{formatPrice(discountedTotal)}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label>Payment Type *</Label>
          <Select 
            value={formData.payment} 
            onValueChange={(val) => setFormData(prev => ({...prev, payment: val, partialAmount: val === 'Full' ? '' : prev.partialAmount}))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Full">Full Payment ({formatPrice(discountedTotal)})</SelectItem>
              <SelectItem value="Partial">Partial Payment</SelectItem>
              <SelectItem value="Later">Pay Later</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.payment === "Partial" && (
          <div className="grid gap-2 p-4 bg-secondary/20 rounded-lg">
            <Label>Enter Amount to Pay Now (USD)</Label>
            <Input 
              type="number" min="0" max={discountedTotal} 
              value={formData.partialAmount} 
              onChange={e => setFormData(prev => ({...prev, partialAmount: e.target.value}))}
            />
          </div>
        )}
      </div>
    </div>
  );
}
