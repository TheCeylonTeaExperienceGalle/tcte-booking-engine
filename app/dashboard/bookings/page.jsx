"use client";

import { useState, useEffect, useMemo } from "react";
import { format, isSameDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { fetchWithAuth } from "@/lib/apiClient";
import { useDashboard } from "../layout";
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
  XCircle,
  AlertCircle,
  Banknote,
  LayoutGrid
} from "lucide-react";
import BookingForm from "@/components/bookings/BookingForm";
import BookingManager from "@/components/bookings/BookingManager";

export default function BookingsPage() {
  useDashboard();
  const [date, setDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!isCreating) {
      fetchBookings();
    }
  }, [isCreating]);

  async function fetchBookings() {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/bookings");
      const data = await res.json();
      if (res.ok) {
        setBookings(data.bookings || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }


  const selectedDateBookings = useMemo(() => {
    if (!date) return [];
    return bookings.filter(b => isSameDay(new Date(b.bookedDate), date));
  }, [date, bookings]);

  const bookedDays = useMemo(() => {
    return bookings.map(b => new Date(b.bookedDate));
  }, [bookings]);

  const dayStats = useMemo(() => {
    const count = selectedDateBookings.length;
    const guests = selectedDateBookings.reduce((acc, b) => acc + b.items.reduce((sum, i) => sum + i.quantity, 0), 0);
    const revenue = selectedDateBookings.reduce((acc, b) => acc + b.amount, 0);
    return { count, guests, revenue };
  }, [selectedDateBookings]);

  if (isCreating) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setIsCreating(false)} className="hover:bg-transparent hover:text-primary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Calendar
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">New Booking</h1>
        </div>
        <BookingForm />
      </div>
    );
  }

  return (
    <div className="space-y-8 h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Bookings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your schedule and view booking details.
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)} size="lg" className="shadow-md hover:shadow-lg transition-all">
          <Plus className="mr-2 h-5 w-5" />
          New Booking
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[380px_1fr] items-start">
        {/* Left Column: Calendar & Quick Stats */}
        <div className="space-y-6">
          <Card className="border-none shadow-lg overflow-hidden">
            <CardHeader className="bg-primary/5 pb-4">
              <CardTitle className="text-primary flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Calendar
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex justify-center bg-card">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md"
                modifiers={{ booked: bookedDays }}
                modifiersClassNames={{
                  booked: "bg-primary/10 text-primary font-bold hover:bg-primary/20 rounded-md"
                }}
              />
            </CardContent>
          </Card>

          {/* Day Stats Summary */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-full mb-2">
                  <LayoutGrid className="h-5 w-5" />
                </div>
                <div className="text-2xl font-bold">{dayStats.count}</div>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Bookings</div>
              </CardContent>
            </Card>
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <div className="p-2 bg-green-100 text-green-600 rounded-full mb-2">
                  <Users className="h-5 w-5" />
                </div>
                <div className="text-2xl font-bold">{dayStats.guests}</div>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Guests</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column: Detailed List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                {date ? format(date, "EEEE, MMMM do, yyyy") : "Select a date"}
              </h2>
              <p className="text-muted-foreground">
                {selectedDateBookings.length === 0
                  ? "No bookings scheduled for this day."
                  : `Showing ${selectedDateBookings.length} booking${selectedDateBookings.length !== 1 ? 's' : ''}`
                }
              </p>
            </div>
            {dayStats.revenue > 0 && (
              <Badge variant="secondary" className="text-lg px-3 py-1 font-medium">
                <span className="flex flex-col items-end leading-tight">
                  <span>
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(dayStats.revenue)}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider opacity-80">
                    Booking value
                  </span>
                </span>
              </Badge>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading bookings...</p>
            </div>
          ) : selectedDateBookings.length === 0 ? (
            <Card className="border-dashed border-2 bg-muted/10">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                <div className="p-4 bg-muted rounded-full">
                  <CalendarIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg">No bookings found</h3>
                  <p className="text-muted-foreground max-w-xs mx-auto">
                    There are no bookings scheduled for this date. Select another date or create a new booking.
                  </p>
                </div>
                <Button variant="outline" onClick={() => setIsCreating(true)}>
                  Create Booking
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {selectedDateBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} onUpdate={fetchBookings} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatSessionTime(raw) {
  if (!raw) {
    return "--:--";
  }

  if (typeof raw === "string") {
    if (/^\d{2}:\d{2}/.test(raw)) {
      return raw.slice(0, 5);
    }

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(11, 16);
    }

    return "--:--";
  }

  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString().slice(11, 16);
  }

  return "--:--";
}

function BookingCard({ booking, onUpdate }) {
  const statusColor = {
    PENDING: "text-yellow-600 bg-yellow-50 border-yellow-200",
    PAID: "text-green-600 bg-green-50 border-green-200",
    CONFIRMED: "text-blue-600 bg-blue-50 border-blue-200",
    CANCELLED: "text-red-600 bg-red-50 border-red-200",
  };

  const StatusIcon = {
    PENDING: AlertCircle,
    PAID: CheckCircle2,
    CONFIRMED: CheckCircle2,
    CANCELLED: XCircle,
  }[booking.status] || AlertCircle;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-all duration-200 border-l-4 border-l-primary">
      <div className="p-5 space-y-4">
        {/* Header: Leader & Status */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
              {booking.leader?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div>
              <h3 className="font-semibold text-lg leading-none mb-1">
                {booking.leader?.name || "Unknown Leader"}
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-3 w-3" />
                {booking.leader?.email}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusColor[booking.status]}`}>
              <StatusIcon className="h-3.5 w-3.5" />
              {booking.status}
            </div>
            <BookingManager booking={booking} onUpdate={onUpdate} />
          </div>
        </div>

        <Separator />

        {/* Booking Items */}
        <div className="space-y-3">
          {booking.items?.map((item) => (
            <div key={item.id} className="bg-muted/30 rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium text-sm">
                  {item.session?.program?.title}
                  <span className="text-muted-foreground mx-1">•</span>
                  <span className="text-primary">{item.session?.name}</span>
                  {item.sessionType && (
                    <>
                       <span className="text-muted-foreground mx-1">•</span>
                       <span className="text-blue-600 font-semibold">{item.sessionType.name}</span>
                    </>
                  )}
                </div>
                <Badge variant="outline" className="bg-background shrink-0">
                  {item.quantity} Seat{item.quantity !== 1 ? "s" : ""}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {formatSessionTime(item.session?.startTime)}
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {item.session?.program?.location?.name || "No Location"}
                </div>
                {item.customer && (
                  <div className="flex items-center gap-1.5 text-foreground font-medium bg-background px-2 py-0.5 rounded border">
                    <User className="h-3 w-3" />
                    {item.customer.name}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer: Payment */}
        <div className="flex flex-col gap-2 pt-2 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              <span>{booking.paymentType} Payment</span>
            </div>
            <div className="font-bold text-lg">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(booking.amount - booking.balance)}
            </div>
          </div>

          {["Partial", "Later"].includes(booking.paymentType) && (
            <div className="flex items-center justify-between bg-secondary/20 p-2 rounded text-xs">
              <div className="flex gap-4">
                <span className="text-muted-foreground">
                  Total Amount: <span className="font-medium text-foreground">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(booking.amount)}</span>
                </span>
                <span className="text-muted-foreground">
                  Balance: <span className="font-bold text-red-600">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(booking.balance)}</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {booking.additionalNotes && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Additional Notes:</p>
            <p className="text-sm bg-muted/30 p-2 rounded-md whitespace-pre-wrap">{booking.additionalNotes}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
