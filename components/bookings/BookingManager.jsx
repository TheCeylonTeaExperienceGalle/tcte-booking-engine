"use client";

import { useState } from "react";
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
  Banknote,
  LayoutGrid,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function BookingManager({ booking, onUpdate }) {
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

  // Cancel State
  const [reason, setReason] = useState("");
  const [refundAmount, setRefundAmount] = useState(booking.amount);

  // Mark Paid State
  const [paymentAmount, setPaymentAmount] = useState(booking.balance);

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

      if (res.ok) {
        setOpen(false);
        setSuccessMessage("Booking rescheduled successfully!");
        setSuccessDialogOpen(true);
      } else {
        const data = await res.json();
        setErrorMessage(data.error || "Failed to reschedule");
        setErrorDialogOpen(true);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("An error occurred");
      setErrorDialogOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/bookings/${booking.id}/manage`, {
        method: "POST",
        body: JSON.stringify({
          action: "cancel",
          reason: reason,
          refundAmount: refundAmount
        })
      });

      if (res.ok) {
        setOpen(false);
        setSuccessMessage("Booking cancelled successfully!");
        setSuccessDialogOpen(true);
      } else {
        const data = await res.json();
        setErrorMessage(data.error || "Failed to cancel");
        setErrorDialogOpen(true);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("An error occurred");
      setErrorDialogOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/bookings/${booking.id}/manage`, {
        method: "POST",
        body: JSON.stringify({
          action: "mark_paid",
          amount: paymentAmount
        })
      });

      if (res.ok) {
        setOpen(false);
        setSuccessMessage("Payment recorded successfully!");
        setSuccessDialogOpen(true);
      } else {
        const data = await res.json();
        setErrorMessage(data.error || "Failed to record payment");
        setErrorDialogOpen(true);
      }
    } catch (error) {
       console.error(error);
      setErrorMessage("An error occurred");
      setErrorDialogOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setMode("menu");
    setNewDate(null);
    setReason("");
    setRefundAmount(booking.amount);
    setPaymentAmount(booking.balance);
  };


  return (
    <>
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if(!val) resetState(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Manage</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Booking #{booking.id}</DialogTitle>
          <DialogDescription>
            {mode === "menu" && "Select an action to perform on this booking."}
            {mode === "reschedule" && "Select a new date for this booking."}
            {mode === "cancel" && "Cancel this booking and process refund."}
          </DialogDescription>
        </DialogHeader>

        {mode === "menu" && (
          <div className="grid gap-4 py-4">
            {booking.balance > 0 && booking.status !== "CANCELLED" && (
               <Button
                variant="outline"
                className="h-20 justify-start px-4 hover:bg-green-50 hover:text-green-600 hover:border-green-200"
                onClick={() => setMode("payment")}
              >
                <Banknote className="mr-4 h-6 w-6 text-green-500" />
                <div className="text-left">
                  <div className="font-semibold">Settle Balance</div>
                  <div className="text-xs text-muted-foreground">Mark remaining balance as paid</div>
                </div>
              </Button>
            )}

            <Button
              variant="outline"
              className="h-20 justify-start px-4"
              onClick={() => setMode("reschedule")}
              disabled={booking.status === "CANCELLED"}
            >
              <RefreshCw className="mr-4 h-6 w-6 text-blue-500" />
              <div className="text-left">
                <div className="font-semibold">Reschedule Date</div>
                <div className="text-xs text-muted-foreground">Move booking to a different day</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-20 justify-start px-4 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
              onClick={() => setMode("cancel")}
              disabled={booking.status === "CANCELLED"}
            >
              <XCircle className="mr-4 h-6 w-6 text-red-500" />
              <div className="text-left">
                <div className="font-semibold">Cancel Booking</div>
                <div className="text-xs text-muted-foreground">Cancel and issue refund</div>
              </div>
            </Button>
          </div>
        )}

        {mode === "payment" && (
           <div className="space-y-4 py-4">
            <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm flex items-start gap-2">
              <Banknote className="h-5 w-5 shrink-0" />
              <div>
                <span className="font-semibold">Update Payment:</span> Confirm that the customer has paid the remaining balance.
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Amount (USD)</Label>
              <Input
                type="number"
                // value={paymentAmount}
                // onChange={(e) => setPaymentAmount(e.target.value)}
                value={booking.balance}
                disabled
              />
              <p className="text-xs text-muted-foreground">Current balance due. This action will mark the booking as fully paid.</p>
            </div>
          </div>
        )}

        {mode === "reschedule" && (
          <div className="space-y-4 py-4">
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={newDate}
                onSelect={setNewDate}
                className="rounded-md border"
                disabled={(date) => date < new Date()}
              />
            </div>
            {newDate && (
              <div className="bg-blue-50 text-blue-700 p-3 rounded-md text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Selected: {format(newDate, "PPP")}
              </div>
            )}
          </div>
        )}

        {mode === "cancel" && (
          <div className="space-y-4 py-4">
            <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div>
                <span className="font-semibold">Warning:</span> This action cannot be undone. The booking will be marked as cancelled.
              </div>
            </div>

            <div className="space-y-2">
              <Label>Refund Amount (USD)</Label>
              <Input
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
            </div>

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
            <Button onClick={handleReschedule} disabled={!newDate || loading}>
              {loading ? "Updating..." : "Confirm Reschedule"}
            </Button>
          )}

          {mode === "payment" && (
            <Button onClick={handleMarkPaid} disabled={loading} className="bg-green-600 hover:bg-green-700">
              {loading ? "Processing..." : "Confirm Payment"}
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
