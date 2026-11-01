"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fetchWithAuth } from "@/lib/apiClient";
import {
  Loader2,
  Calendar as CalendarIcon,
  Users,
  MapPin,
  Clock,
  User,
  Plus,
  ArrowLeft,
  CreditCard,
  CheckCircle2,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Banknote,
  LayoutGrid,
  RefreshCw,
  Edit,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function BookingManager({ booking, onUpdate, onEdit, canEdit = true }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("menu"); // menu, reschedule, cancel, payment
  const [loading, setLoading] = useState(false);
  
  // Alert Dialog State
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Reschedule State
  const [newDate, setNewDate] = useState(null);
  const [checkingRescheduleAvailability, setCheckingRescheduleAvailability] = useState(false);
  const [rescheduleAvailabilityError, setRescheduleAvailabilityError] = useState("");
  
  // Financial computations
  const paidAmount = Math.max(0, (booking.amount || 0) - (booking.balance || 0));
  const isPayLater = booking.paymentType === "Later";
  const hasPaid = paidAmount > 0;

  // Cancel State
  const [reason, setReason] = useState("");
  const [refundAmount, setRefundAmount] = useState(() => (isPayLater || !hasPaid ? 0 : paidAmount));

  useEffect(() => {
    setRefundAmount(isPayLater || !hasPaid ? 0 : paidAmount);
  }, [booking.id, booking.amount, booking.balance, booking.paymentType, isPayLater, hasPaid, paidAmount]);

  // Status & Payment Management State
  const [paymentSubMode, setPaymentSubMode] = useState("full"); // full, installment, status
  const [installmentAmount, setInstallmentAmount] = useState("");
  const [statusSelection, setStatusSelection] = useState(booking.status || "PENDING");
  const [paymentNote, setPaymentNote] = useState("");

  const checkRescheduleDateAvailability = async (selectedDate) => {
    setCheckingRescheduleAvailability(true);
    setRescheduleAvailabilityError("");
    try {
      const dateString = format(selectedDate, "yyyy-MM-dd");
      const sessionTotals = new Map();
      for (const item of (booking.items || [])) {
        const qty = item.quantity ?? 1;
        sessionTotals.set(item.sessionId, (sessionTotals.get(item.sessionId) || 0) + qty);
      }

      for (const [sessionId, seatsNeeded] of sessionTotals) {
        const res = await fetchWithAuth(`/api/availability?sessionId=${sessionId}&date=${dateString}`);
        if (res.ok) {
          const data = await res.json();
          const available = data.availability?.availableSeats;
          if (available != null && available < seatsNeeded) {
            setRescheduleAvailabilityError("Day fully booked / No available seats for this date");
            return;
          }
        }
      }
    } catch (err) {
      console.error("Error checking date availability:", err);
    } finally {
      setCheckingRescheduleAvailability(false);
    }
  };

  const handleReschedule = async () => {
    if (!newDate) return;
    setLoading(true);
    try {
      const newDateString = format(newDate, "yyyy-MM-dd");
      const res = await fetchWithAuth(`/api/bookings/${booking.id}/manage`, {
        method: "POST",
        body: JSON.stringify({
          action: "reschedule",
          newDate: newDateString,
          reason: "User requested reschedule"
        })
      });
      
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setOpen(false);
        setSuccessMessage("Booking rescheduled successfully!");
        setSuccessDialogOpen(true);
      } else {
        setErrorMessage(data.error || "Failed to reschedule");
        setErrorDialogOpen(true);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("An error occurred while rescheduling");
      setErrorDialogOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    const finalRefund = isPayLater || !hasPaid ? 0 : parseFloat(refundAmount || 0);
    if (hasPaid && !isPayLater && (isNaN(finalRefund) || finalRefund < 0 || finalRefund > paidAmount)) {
      setErrorMessage(`Refund amount must be between $0.00 and $${paidAmount.toFixed(2)}`);
      setErrorDialogOpen(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/bookings/${booking.id}/manage`, {
        method: "POST",
        body: JSON.stringify({
          action: "cancel",
          reason: reason,
          refundAmount: finalRefund
        })
      });
      
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setOpen(false);
        const refundNote = isPayLater
          ? " (Pay Later reservation - Refund Amount: $0.00)"
          : (data.refundAmount > 0 ? ` (Refund: $${Number(data.refundAmount).toFixed(2)})` : "");
        setSuccessMessage(`Booking cancelled successfully!${refundNote}`);
        setSuccessDialogOpen(true);
      } else {
        setErrorMessage(data.error || "Failed to cancel");
        setErrorDialogOpen(true);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("An error occurred while cancelling");
      setErrorDialogOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleFullPayment = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/bookings/${booking.id}/manage`, {
        method: "POST",
        body: JSON.stringify({
          action: "mark_paid",
          amount: booking.balance,
          note: paymentNote
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setOpen(false);
        setSuccessMessage(data.message || "Payment recorded successfully!");
        setSuccessDialogOpen(true);
      } else {
        setErrorMessage(data.error || "Failed to record payment");
        setErrorDialogOpen(true);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("An error occurred while recording payment");
      setErrorDialogOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordInstallment = async () => {
    const amt = parseFloat(installmentAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMessage("Please enter a valid installment amount greater than 0");
      setErrorDialogOpen(true);
      return;
    }
    if (amt > booking.balance) {
      setErrorMessage(`Installment amount cannot exceed the remaining balance ($${booking.balance.toFixed(2)})`);
      setErrorDialogOpen(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/bookings/${booking.id}/manage`, {
        method: "POST",
        body: JSON.stringify({
          action: "installment_payment",
          amount: amt,
          note: paymentNote
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setOpen(false);
        setSuccessMessage(data.message || `Installment of $${amt.toFixed(2)} recorded successfully!`);
        setSuccessDialogOpen(true);
      } else {
        setErrorMessage(data.error || "Failed to record installment");
        setErrorDialogOpen(true);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("An error occurred while recording installment");
      setErrorDialogOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!statusSelection) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/bookings/${booking.id}/manage`, {
        method: "POST",
        body: JSON.stringify({
          action: "update_status",
          newStatus: statusSelection,
          reason: paymentNote
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setOpen(false);
        setSuccessMessage(data.message || `Booking status updated to ${statusSelection}!`);
        setSuccessDialogOpen(true);
      } else {
        setErrorMessage(data.error || "Failed to update status");
        setErrorDialogOpen(true);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("An error occurred while updating status");
      setErrorDialogOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setMode("menu");
    setPaymentSubMode(booking.balance > 0 ? "full" : "status");
    setInstallmentAmount("");
    setStatusSelection(booking.status || "PENDING");
    setPaymentNote("");
    setNewDate(null);
    setCheckingRescheduleAvailability(false);
    setRescheduleAvailabilityError("");
    setReason("");
    setRefundAmount(isPayLater || !hasPaid ? 0 : paidAmount);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if(!val) resetState(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Manage</Button>
      </DialogTrigger>
      <DialogContent className={cn("sm:max-w-[440px]", mode === "payment" && "sm:max-w-[500px]")}>
        <DialogHeader>
          <DialogTitle>Manage Booking #{booking.id}</DialogTitle>
          <DialogDescription>
            {mode === "menu" && "Select an action to perform on this booking."}
            {mode === "reschedule" && "Select a new date for this booking."}
            {mode === "cancel" && (
              isPayLater
                ? "Cancel Pay Later booking. No refund required."
                : hasPaid
                ? "Cancel this booking and process refund."
                : "Cancel this booking. No payments have been recorded."
            )}
            {mode === "payment" && "Manage payment settlement, record installments, or update status."}
          </DialogDescription>
        </DialogHeader>

        {mode === "menu" && (
          <div className="grid gap-3 py-3">
            {canEdit && (
              <Button 
                variant="outline" 
                className="h-18 justify-start px-4 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200" 
                onClick={() => {
                  setOpen(false);
                  onEdit?.(booking);
                }}
                disabled={booking.status === "CANCELLED"}
              >
                <Edit className="mr-3 h-5 w-5 text-amber-600 shrink-0" />
                <div className="text-left">
                  <div className="font-semibold text-sm">Edit Booking Details</div>
                  <div className="text-xs text-muted-foreground">Modify seats, sessions, attendees or payment</div>
                </div>
              </Button>
            )}

            {booking.status !== "CANCELLED" && (
              <Button 
                variant="outline" 
                className="h-18 justify-start px-4 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200" 
                onClick={() => {
                  setPaymentSubMode(booking.balance > 0 ? "full" : "status");
                  setStatusSelection(booking.status);
                  setMode("payment");
                }}
              >
                <Banknote className="mr-3 h-5 w-5 text-emerald-600 shrink-0" />
                <div className="text-left">
                  <div className="font-semibold text-sm">Status & Payments</div>
                  <div className="text-xs text-muted-foreground">
                    {booking.balance > 0 
                      ? `Balance: $${booking.balance.toFixed(2)} • Settle full or installment`
                      : `Status: ${booking.status} • Settle or change status`}
                  </div>
                </div>
              </Button>
            )}

            {canEdit && (
              <Button 
                variant="outline" 
                className="h-18 justify-start px-4" 
                onClick={() => setMode("reschedule")}
                disabled={booking.status === "CANCELLED"}
              >
                <RefreshCw className="mr-3 h-5 w-5 text-blue-500 shrink-0" />
                <div className="text-left">
                  <div className="font-semibold text-sm">Reschedule Date</div>
                  <div className="text-xs text-muted-foreground">Move booking to a different day</div>
                </div>
              </Button>
            )}
            <Button 
              variant="outline" 
              className="h-18 justify-start px-4 hover:bg-red-50 hover:text-red-600 hover:border-red-200" 
              onClick={() => {
                setRefundAmount(isPayLater || !hasPaid ? 0 : paidAmount);
                setMode("cancel");
              }}
              disabled={booking.status === "CANCELLED"}
            >
              <XCircle className="mr-3 h-5 w-5 text-red-500 shrink-0" />
              <div className="text-left">
                <div className="font-semibold text-sm">Cancel Booking</div>
                <div className="text-xs text-muted-foreground">
                  {isPayLater ? "Cancel Pay Later booking (Refund: $0.00)" : (hasPaid ? "Cancel and issue refund" : "Cancel booking without refund")}
                </div>
              </div>
            </Button>
          </div>
        )}

        {mode === "payment" && (
          <div className="space-y-4 py-2">
            {/* Booking Financial Overview */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-muted-foreground block text-[11px]">Total Price</span>
                <span className="font-bold text-slate-800 text-sm">
                  ${booking.amount != null ? Number(booking.amount).toFixed(2) : "0.00"}
                </span>
              </div>
              <div className="border-x border-slate-200">
                <span className="text-muted-foreground block text-[11px]">Paid to Date</span>
                <span className="font-bold text-emerald-600 text-sm">
                  ${Math.max(0, (booking.amount || 0) - (booking.balance || 0)).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Remaining Due</span>
                <span className={cn("font-bold text-sm", booking.balance > 0 ? "text-amber-600" : "text-slate-500")}>
                  ${booking.balance != null ? Number(booking.balance).toFixed(2) : "0.00"}
                </span>
              </div>
            </div>

            {/* Current Status Indicator */}
            <div className="flex items-center justify-between px-1 text-xs">
              <span className="text-muted-foreground">Current Booking Status:</span>
              <Badge variant={booking.status === "PAID" || booking.status === "CONFIRMED" ? "default" : "secondary"} className="uppercase font-semibold text-[11px]">
                {booking.status}
              </Badge>
            </div>

            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setPaymentSubMode("full")}
                disabled={booking.balance <= 0}
                className={cn(
                  "text-xs font-semibold py-1.5 px-2 rounded-md transition-all",
                  paymentSubMode === "full"
                    ? "bg-white text-emerald-700 shadow-sm border border-slate-200"
                    : "text-slate-600 hover:text-slate-900",
                  booking.balance <= 0 && "opacity-40 cursor-not-allowed"
                )}
              >
                Full Settle
              </button>
              <button
                type="button"
                onClick={() => setPaymentSubMode("installment")}
                disabled={booking.balance <= 0}
                className={cn(
                  "text-xs font-semibold py-1.5 px-2 rounded-md transition-all",
                  paymentSubMode === "installment"
                    ? "bg-white text-blue-700 shadow-sm border border-slate-200"
                    : "text-slate-600 hover:text-slate-900",
                  booking.balance <= 0 && "opacity-40 cursor-not-allowed"
                )}
              >
                Installment
              </button>
              <button
                type="button"
                onClick={() => setPaymentSubMode("status")}
                className={cn(
                  "text-xs font-semibold py-1.5 px-2 rounded-md transition-all",
                  paymentSubMode === "status"
                    ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Change Status
              </button>
            </div>

            {/* SUB-MODE: FULL SETTLE */}
            {paymentSubMode === "full" && (
              <div className="space-y-3 pt-1">
                {booking.balance <= 0 ? (
                  <div className="bg-emerald-50 text-emerald-800 p-3 rounded-md text-xs flex items-center gap-2 border border-emerald-200">
                    <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>This booking already has no outstanding balance.</span>
                  </div>
                ) : (
                  <>
                    <div className="bg-emerald-50 text-emerald-800 p-3 rounded-md text-xs flex items-start gap-2 border border-emerald-200">
                      <Banknote className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                      <div>
                        <span className="font-semibold block">Full Balance Settlement</span>
                        Confirm receipt of the remaining balance <span className="font-bold">${booking.balance.toFixed(2)}</span>. This will set balance to $0.00 and mark the booking as confirmed and paid.
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Settle Amount (USD)</Label>
                      <Input
                        type="text"
                        value={`$${booking.balance.toFixed(2)}`}
                        disabled
                        className="bg-muted font-bold text-slate-800 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Note / Reference (Optional)</Label>
                      <Input
                        placeholder="e.g. Paid in cash at reception, bank wire ref..."
                        value={paymentNote}
                        onChange={(e) => setPaymentNote(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* SUB-MODE: INSTALLMENT */}
            {paymentSubMode === "installment" && (
              <div className="space-y-3 pt-1">
                <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-xs flex items-start gap-2 border border-blue-200">
                  <CreditCard className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Record Installment Payment</span>
                    Enter a partial amount paid. The balance and payment record will be updated immediately.
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Installment Amount (USD)</Label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setInstallmentAmount((booking.balance * 0.25).toFixed(2))}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded border border-slate-300"
                      >
                        25%
                      </button>
                      <button
                        type="button"
                        onClick={() => setInstallmentAmount((booking.balance * 0.5).toFixed(2))}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded border border-slate-300"
                      >
                        50%
                      </button>
                      <button
                        type="button"
                        onClick={() => setInstallmentAmount(booking.balance.toFixed(2))}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded border border-slate-300"
                      >
                        100%
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={booking.balance}
                      placeholder={`0.00 (Max: $${booking.balance.toFixed(2)})`}
                      value={installmentAmount}
                      onChange={(e) => setInstallmentAmount(e.target.value)}
                      className="pl-7 text-xs font-semibold"
                    />
                  </div>
                </div>

                {/* Live installment calculation preview */}
                {parseFloat(installmentAmount) > 0 && (
                  <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Installment payment:</span>
                      <span className="font-semibold text-blue-600">+${parseFloat(installmentAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>New total paid:</span>
                      <span className="font-semibold text-emerald-600">
                        ${Math.min(booking.amount, (booking.amount - booking.balance) + parseFloat(installmentAmount)).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between font-medium pt-1 border-t border-slate-200">
                      <span>New remaining balance:</span>
                      <span className={cn(
                        "font-bold",
                        Math.max(0, booking.balance - parseFloat(installmentAmount)) === 0 ? "text-emerald-600" : "text-amber-600"
                      )}>
                        ${Math.max(0, booking.balance - parseFloat(installmentAmount)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs">Payment Note / Receipt (Optional)</Label>
                  <Input
                    placeholder="e.g. Installment 1 via bank wire, ref #..."
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
            )}

            {/* SUB-MODE: CHANGE STATUS DIRECTLY */}
            {paymentSubMode === "status" && (
              <div className="space-y-3 pt-1">
                <div className="bg-amber-50 text-amber-800 p-3 rounded-md text-xs flex items-start gap-2 border border-amber-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Change Lifecycle Status</span>
                    Directly change the booking state. This logs an audit record in the booking history.
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Select New Status</Label>
                  <Select value={statusSelection} onValueChange={setStatusSelection}>
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                          PENDING - Awaiting payment / confirmation
                        </span>
                      </SelectItem>
                      <SelectItem value="CONFIRMED">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          CONFIRMED - Confirmed booking
                        </span>
                      </SelectItem>
                      <SelectItem value="PAID">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          PAID - Fully paid
                        </span>
                      </SelectItem>
                      <SelectItem value="CANCELLED">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500"></span>
                          CANCELLED - Cancelled booking
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Reason / Note for Status Change (Optional)</Label>
                  <Input
                    placeholder="e.g. Admin verified payment receipt, customer confirmed..."
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {mode === "reschedule" && (
          <div className="space-y-4 py-4">
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={newDate}
                onSelect={(date) => {
                  setNewDate(date);
                  if (date) {
                    checkRescheduleDateAvailability(date);
                  } else {
                    setRescheduleAvailabilityError("");
                  }
                }}
                className="rounded-md border"
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              />
            </div>
            {rescheduleAvailabilityError ? (
              <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm flex items-center gap-2 border border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <span className="font-semibold">{rescheduleAvailabilityError}</span>
              </div>
            ) : checkingRescheduleAvailability ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking availability for selected date...
              </div>
            ) : newDate ? (
              <div className="bg-blue-50 text-blue-700 p-3 rounded-md text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Selected: {format(newDate, "PPP")}
              </div>
            ) : null}
          </div>
        )}

        {mode === "cancel" && (
          <div className="space-y-4 py-4">
            <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm flex items-start gap-2 border border-red-200">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div>
                <span className="font-semibold">Warning:</span> This action cannot be undone. The booking will be marked as cancelled.
              </div>
            </div>
            
            {isPayLater ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3.5 space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium text-xs">Payment Option:</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                    Pay Later (Pay on Arrival)
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-amber-200/60">
                  <span className="text-muted-foreground">Amount Paid by Guest:</span>
                  <span className="font-semibold text-slate-800">$0.00</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Refund Amount:</span>
                  <span className="font-bold text-emerald-700">$0.00 (No refund required)</span>
                </div>
                <div className="text-[11px] text-amber-800/90 bg-amber-100/60 rounded p-2 mt-1">
                  Guest selected <strong>Pay Later</strong>. No payment was collected, so the refund amount is <strong>$0.00</strong>.
                </div>
              </div>
            ) : !hasPaid ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium text-xs">Payment Option:</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-200 text-slate-700">
                    {booking.paymentType || "Unpaid"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200">
                  <span className="text-muted-foreground">Amount Paid by Guest:</span>
                  <span className="font-semibold text-slate-800">$0.00</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Refund Amount:</span>
                  <span className="font-bold text-slate-700">$0.00 (No refund required)</span>
                </div>
                <div className="text-[11px] text-muted-foreground bg-slate-100 rounded p-2 mt-1">
                  No payment was collected for this booking. Refund amount is <strong>$0.00</strong>.
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-xs flex justify-between items-center">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Total Paid to Date</span>
                    <span className="font-bold text-emerald-700 text-sm">${paidAmount.toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground block text-[11px]">Max Refundable</span>
                    <span className="font-semibold text-slate-700 text-xs">${paidAmount.toFixed(2)}</span>
                  </div>
                </div>
                <Label htmlFor="refund-amount">Refund Amount (USD)</Label>
                <Input 
                  id="refund-amount"
                  type="number" 
                  step="0.01"
                  min="0"
                  max={paidAmount}
                  value={refundAmount} 
                  onChange={(e) => setRefundAmount(e.target.value)} 
                  placeholder={`0.00 - ${paidAmount.toFixed(2)}`}
                />
                <p className="text-[11px] text-muted-foreground">
                  Enter the refund amount to process (maximum: ${paidAmount.toFixed(2)}).
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Reason for Cancellation</Label>
              <Textarea 
                placeholder="Customer requested cancellation..." 
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {mode !== "menu" && (
            <Button variant="ghost" onClick={() => setMode("menu")} disabled={loading}>
              Back
            </Button>
          )}
          
          {mode === "reschedule" && (
            <Button 
              onClick={handleReschedule} 
              disabled={!newDate || loading || Boolean(rescheduleAvailabilityError) || checkingRescheduleAvailability}
            >
              {loading ? "Updating..." : "Confirm Reschedule"}
            </Button>
          )}

          {mode === "payment" && paymentSubMode === "full" && (
            <Button
              onClick={handleFullPayment}
              disabled={loading || booking.balance <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Banknote className="mr-2 h-4 w-4" />}
              Confirm Settle (${booking.balance != null ? Number(booking.balance).toFixed(2) : "0.00"})
            </Button>
          )}

          {mode === "payment" && paymentSubMode === "installment" && (
            <Button
              onClick={handleRecordInstallment}
              disabled={
                loading ||
                !installmentAmount ||
                parseFloat(installmentAmount) <= 0 ||
                parseFloat(installmentAmount) > booking.balance
              }
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
              Record Installment {installmentAmount && !isNaN(parseFloat(installmentAmount)) ? `($${parseFloat(installmentAmount).toFixed(2)})` : ""}
            </Button>
          )}

          {mode === "payment" && paymentSubMode === "status" && (
            <Button
              onClick={handleUpdateStatus}
              disabled={loading || statusSelection === booking.status}
              className="bg-slate-900 hover:bg-slate-800 text-white"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Update to {statusSelection}
            </Button>
          )}

          {mode === "cancel" && (
            <Button variant="destructive" onClick={handleCancel} disabled={loading}>
              {loading ? "Processing..." : "Confirm Cancellation"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
      <AlertDialogContent className="border-2" style={{ borderColor: '#C5BF81' }}>
        <AlertDialogHeader>
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, #767014, #C5BF81)' }}>
            <CheckCircle className="h-8 w-8" style={{ color: '#ffffff' }} />
          </div>
          <AlertDialogTitle className="text-center text-xl" style={{ color: '#767014' }}>
            Success!
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-base" style={{ color: '#000000', opacity: 0.8 }}>
            {successMessage}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogAction
            onClick={() => {
              setSuccessDialogOpen(false);
              if (onUpdate) onUpdate();
            }}
            style={{ background: 'linear-gradient(135deg, #767014, #C5BF81)', color: '#ffffff' }}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Ok
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
      <AlertDialogContent className="border-2" style={{ borderColor: '#C5BF81' }}>
        <AlertDialogHeader>
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(197, 191, 129, 0.3)' }}>
            <XCircle className="h-8 w-8" style={{ color: '#767014' }} />
          </div>
          <AlertDialogTitle className="text-center text-xl" style={{ color: '#767014' }}>
            Oops! Something went wrong
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-base" style={{ color: '#000000', opacity: 0.8 }}>
            {errorMessage}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogAction
            onClick={() => setErrorDialogOpen(false)}
            style={{ backgroundColor: '#767014', color: '#ffffff' }}
          >
            Try Again
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
