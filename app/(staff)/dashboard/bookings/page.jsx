"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { format, isSameDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { fetchWithAuth } from "@/lib/apiClient";
import { useDashboard } from "@/components/dashboard/dashboard-context";
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
  LayoutGrid,
  List,
  Layers,
  Pencil as Edit,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Globe,
  ShieldCheck,
  Tag,
} from "lucide-react";
import BookingForm from "@/components/bookings/BookingForm";
import BookingManager from "@/components/bookings/BookingManager";
import { usePermissions } from "@/lib/usePermissions";

function parseBookingDate(rawDate) {
  if (!rawDate) return null;
  if (typeof rawDate === "string") {
    const match = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, y, m, d] = match;
      return new Date(Number(y), Number(m) - 1, Number(d));
    }
  }
  const d = new Date(rawDate);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatBookingDate(rawDate, formatStr = "dd MMM yyyy") {
  const d = parseBookingDate(rawDate);
  return d ? format(d, formatStr) : "-";
}

export default function BookingsPage() {
  useDashboard();
  const { canRead, canWrite, isAdmin } = usePermissions("bookings");
  const { canWrite: canEditPermission } = usePermissions("bookings-edit");
  const canEdit = isAdmin || canEditPermission;
  const today = useMemo(() => new Date(new Date().setHours(0, 0, 0, 0)), []);
  const [date, setDate] = useState(() => new Date(new Date().setHours(0, 0, 0, 0)));
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);

  // View state: 'list' (flat list, default), 'grouped', or 'calendar'
  const [viewMode, setViewMode] = useState("list");

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [groupBy, setGroupBy] = useState("agent"); // 'agent', 'customer', 'reference'

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("start", startDate);
      if (endDate) params.set("end", endDate);
      if (statusFilter && statusFilter !== "ALL") params.set("status", statusFilter);
      if (sourceFilter && sourceFilter !== "ALL") params.set("source", sourceFilter);

      const url = `/api/bookings${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetchWithAuth(url);
      const data = await res.json();
      if (res.ok) {
        setBookings(data.bookings || []);
      }
    } catch (error) {
      console.error("Failed to load bookings:", error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, statusFilter, sourceFilter]);

  useEffect(() => {
    if (!isCreating && !editingBooking) {
      fetchBookings();
    }
  }, [isCreating, editingBooking, fetchBookings]);

  // Filter bookings client-side for search query
  const filteredBookings = useMemo(() => {
    if (!searchQuery.trim()) return bookings;
    const q = searchQuery.trim().toLowerCase();

    return bookings.filter((b) => {
      const refCode = (b.payment?.orderId || `RV-${b.id}`).toLowerCase();
      const isAgent = b.leader?.role === "LEADER";
      const agentName = isAgent ? (b.leader?.name || "").toLowerCase() : "";
      const agentEmail = isAgent ? (b.leader?.email || "").toLowerCase() : "";
      const customerMatches = (b.items || []).some((item) => {
        const cName = (item.customer?.name || "").toLowerCase();
        const cEmail = (item.customer?.email || "").toLowerCase();
        const cPhone = (item.customer?.phone || "").toLowerCase();
        const cNic = (item.customer?.nic || "").toLowerCase();
        return (
          cName.includes(q) ||
          cEmail.includes(q) ||
          cPhone.includes(q) ||
          cNic.includes(q)
        );
      });

      return (
        refCode.includes(q) ||
        (isAgent && (agentName.includes(q) || agentEmail.includes(q))) ||
        customerMatches
      );
    });
  }, [bookings, searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, startDate, endDate, statusFilter, sourceFilter, viewMode]);

  // Calendar view selected bookings
  const selectedDateBookings = useMemo(() => {
    if (!date) return [];
    return filteredBookings.filter((b) => {
      const bDate = parseBookingDate(b.bookedDate);
      return bDate ? isSameDay(bDate, date) : false;
    });
  }, [date, filteredBookings]);

  const bookedDays = useMemo(() => {
    return bookings.map((b) => parseBookingDate(b.bookedDate)).filter(Boolean);
  }, [bookings]);

  // Pagination for Flat List
  const totalPages = Math.ceil(filteredBookings.length / pageSize) || 1;
  const paginatedBookings = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredBookings.slice(startIdx, startIdx + pageSize);
  }, [filteredBookings, currentPage, pageSize]);

  // Grouped View Structure
  const groupedData = useMemo(() => {
    if (viewMode !== "grouped") return [];

    // Map: PrimaryKey -> { primaryLabel, primarySubLabel, bookings: Map<SessionKey, { sessionInfo, items, bookingsList }> }
    const primaryGroups = new Map();

    filteredBookings.forEach((booking) => {
      let primaryKey = "";
      let primaryLabel = "";
      let primarySubLabel = "";

      if (groupBy === "agent") {
        const isAgent = booking.leader?.role === "LEADER";
        primaryKey = isAgent && booking.leaderId ? `agent-${booking.leaderId}` : "direct-booking";
        primaryLabel = isAgent ? (booking.leader?.name || "Travel Agent") : "Direct Booking (No Travel Agent)";
        primarySubLabel = isAgent
          ? (booking.leader?.email || "Travel Agent") + (booking.leader?.promoteCode ? ` • Code: ${booking.leader.promoteCode}` : "")
          : "Online direct or counter (No Travel Agent)";
      } else if (groupBy === "customer") {
        // Find main customer or attendees
        const customers = (booking.items || [])
          .map((i) => i.customer?.name)
          .filter(Boolean);
        const mainCust = customers[0] || "Guest Customer";
        primaryKey = `cust-${mainCust.toLowerCase()}`;
        primaryLabel = mainCust;
        primarySubLabel = `${booking.items?.[0]?.customer?.email || booking.items?.[0]?.customer?.phone || ""}`;
      } else {
        // By Booking Reference
        const ref = booking.payment?.orderId || `RV-${booking.id}`;
        primaryKey = `ref-${booking.id}`;
        primaryLabel = `Booking Ref: ${ref}`;
        primarySubLabel = `Booked for ${formatBookingDate(booking.bookedDate)}`;
      }

      if (!primaryGroups.has(primaryKey)) {
        primaryGroups.set(primaryKey, {
          key: primaryKey,
          label: primaryLabel,
          subLabel: primarySubLabel,
          bookingsSet: new Set(),
          allBookings: [],
          sessionsMap: new Map(),
        });
      }

      const group = primaryGroups.get(primaryKey);
      group.bookingsSet.add(booking.id);
      group.allBookings.push(booking);

      // Subgroup by Session
      (booking.items || []).forEach((item) => {
        const sName = item.session?.name || "Session";
        const pTitle = item.session?.program?.title || "";
        const sDate = item.date ? formatBookingDate(item.date) : formatBookingDate(booking.bookedDate);
        const sTime = formatSessionTime(item.session?.startTime);
        const sessionKey = `${item.sessionId || sName}-${sDate}-${sTime}`;

        if (!group.sessionsMap.has(sessionKey)) {
          group.sessionsMap.set(sessionKey, {
            sessionKey,
            sessionName: sName,
            programTitle: pTitle,
            dateStr: sDate,
            timeStr: sTime,
            locationName: item.session?.program?.location?.name || "Galle",
            totalSessionGuests: 0,
            items: [],
          });
        }

        const sessionGroup = group.sessionsMap.get(sessionKey);
        sessionGroup.totalSessionGuests += item.quantity || 1;
        sessionGroup.items.push({
          booking,
          item,
        });
      });
    });

    // Convert map to array with calculated subtotals
    return Array.from(primaryGroups.values()).map((g) => {
      const uniqueBookings = g.allBookings;
      const totalGuests = uniqueBookings.reduce(
        (sum, b) => sum + (b.items || []).reduce((iSum, item) => iSum + (item.quantity || 1), 0),
        0
      );
      const totalAmount = uniqueBookings.reduce((sum, b) => sum + (b.amount || 0), 0);

      return {
        key: g.key,
        label: g.label,
        subLabel: g.subLabel,
        totalBookings: g.bookingsSet.size,
        totalGuests,
        totalAmount,
        sessions: Array.from(g.sessionsMap.values()),
        bookings: uniqueBookings,
      };
    });
  }, [filteredBookings, viewMode, groupBy]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setStatusFilter("ALL");
    setSourceFilter("ALL");
  };

  if (isCreating) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => setIsCreating(false)}
            className="hover:bg-transparent hover:text-primary"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Bookings
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">New Booking</h1>
        </div>
        <BookingForm onSuccess={() => setIsCreating(false)} />
      </div>
    );
  }

  if (editingBooking) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => setEditingBooking(null)}
            className="hover:bg-transparent hover:text-primary"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Bookings
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            Edit Booking #{editingBooking.payment?.orderId || editingBooking.id}
          </h1>
        </div>
        <BookingForm
          initialBooking={editingBooking}
          onCancel={() => setEditingBooking(null)}
          onSuccess={() => {
            setEditingBooking(null);
            fetchBookings();
          }}
        />
      </div>
    );
  }

  if (!canRead && !isAdmin) {
    return (
      <div className="p-8">
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" /> Access Restricted
            </CardTitle>
            <CardDescription className="text-red-600">
              You do not have permission to view the Bookings management module. Please contact your system administrator.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "#767014" }}>
            Bookings
          </h1>
          <p className="text-muted-foreground mt-1">
            View, track, and manage all public online and admin reservations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border p-1 bg-muted/40" style={{ borderColor: "#C5BF81" }}>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className={`gap-1.5 h-8 text-xs font-semibold ${viewMode === "list" ? "shadow-sm bg-white text-[#767014]" : ""}`}
            >
              <List className="h-4 w-4" />
              Flat List
            </Button>
            <Button
              variant={viewMode === "grouped" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grouped")}
              className={`gap-1.5 h-8 text-xs font-semibold ${viewMode === "grouped" ? "shadow-sm bg-white text-[#767014]" : ""}`}
            >
              <Layers className="h-4 w-4" />
              Grouped View
            </Button>
            <Button
              variant={viewMode === "calendar" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("calendar")}
              className={`gap-1.5 h-8 text-xs font-semibold ${viewMode === "calendar" ? "shadow-sm bg-white text-[#767014]" : ""}`}
            >
              <CalendarIcon className="h-4 w-4" />
              Calendar View
            </Button>
          </div>

          {(canWrite || isAdmin) && (
            <Button
              onClick={() => setIsCreating(true)}
              size="sm"
              className="shadow-md hover:shadow-lg transition-all text-white font-semibold"
              style={{ background: "linear-gradient(to right, #767014, #C5BF81)" }}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              New Booking
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border shadow-sm" style={{ borderColor: "#C5BF81" }}>
        <CardContent className="p-4 space-y-3">
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 items-end">
            {/* Search */}
            <div className="space-y-1 lg:col-span-2">
              <Label className="text-xs font-semibold text-[#767014]">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Booking Ref, customer, or travel agent..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-9"
                />
              </div>
            </div>

            {/* Date Range From */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#767014]">From Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs h-9 cursor-pointer"
              />
            </div>

            {/* Date Range To */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#767014]">To Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs h-9 cursor-pointer"
              />
            </div>

            {/* Status Filter */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#767014]">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="CONFIRMED">CONFIRMED</SelectItem>
                  <SelectItem value="PENDING">PENDING</SelectItem>
                  <SelectItem value="PAID">PAID</SelectItem>
                  <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Source Filter */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#767014]">Source</Label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Sources</SelectItem>
                  <SelectItem value="ONLINE">Online (Web)</SelectItem>
                  <SelectItem value="ADMIN">Admin (Back-office)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sub-bar: Active filters indicator, Group-By selector, and Reset */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">
                Found <strong className="text-foreground">{filteredBookings.length}</strong> booking{filteredBookings.length !== 1 ? "s" : ""}
              </span>
              {(searchQuery || startDate || endDate || statusFilter !== "ALL" || sourceFilter !== "ALL") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>

            {viewMode === "grouped" && (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#767014]">Group by:</span>
                <Select value={groupBy} onValueChange={setGroupBy}>
                  <SelectTrigger className="text-xs h-7 w-[180px] bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">Travel Agent</SelectItem>
                    <SelectItem value="customer">Customer Name</SelectItem>
                    <SelectItem value="reference">Booking Reference</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area Based on View Mode */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#767014]" />
          <p className="text-muted-foreground font-medium">Loading bookings...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <Card className="border-dashed border-2 bg-muted/10">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="p-4 bg-muted rounded-full">
              <CalendarIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">No bookings found</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                No reservations match the specified search or filter criteria. Try clearing filters or create a new booking.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleClearFilters}
              style={{ borderColor: "#767014", color: "#767014" }}
            >
              Reset Filters
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === "list" ? (
        /* ================= 1. FLAT LIST VIEW ================= */
        <div className="space-y-4">
          <div className="grid gap-4">
            {paginatedBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onUpdate={fetchBookings}
                onEdit={(b) => setEditingBooking(b)}
                canEdit={canEdit}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between pt-4 border-t px-2">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, filteredBookings.length)} of{" "}
              {filteredBookings.length} bookings
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 text-xs"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-xs font-medium px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 text-xs"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      ) : viewMode === "grouped" ? (
        /* ================= 2. GROUPED & COLLATED VIEW ================= */
        <div className="space-y-6">
          {groupedData.map((group) => (
            <Card key={group.key} className="border-2 shadow-sm overflow-hidden" style={{ borderColor: "#C5BF81" }}>
              {/* Group Header & Subtotals */}
              <CardHeader className="bg-muted/30 pb-4 border-b">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded uppercase tracking-wider bg-[#767014]/10 text-[#767014]">
                        {groupBy === "agent" ? "Travel Agent" : groupBy === "customer" ? "Customer" : "Reference"}
                      </span>
                      <CardTitle className="text-lg font-bold" style={{ color: "#767014" }}>
                        {group.label}
                      </CardTitle>
                    </div>
                    {group.subLabel && (
                      <p className="text-xs text-muted-foreground mt-1 ml-0.5">{group.subLabel}</p>
                    )}
                  </div>

                  {/* Group Subtotals Banner */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="bg-white px-3 py-1.5 rounded-md border shadow-xs text-center">
                      <div className="text-xs text-muted-foreground uppercase font-semibold">Bookings</div>
                      <div className="text-base font-bold text-foreground">{group.totalBookings}</div>
                    </div>
                    <div className="bg-white px-3 py-1.5 rounded-md border shadow-xs text-center">
                      <div className="text-xs text-muted-foreground uppercase font-semibold">Total Guests</div>
                      <div className="text-base font-bold text-blue-600">{group.totalGuests}</div>
                    </div>
                    <div className="bg-white px-3 py-1.5 rounded-md border shadow-xs text-center">
                      <div className="text-xs text-muted-foreground uppercase font-semibold">Total Amount</div>
                      <div className="text-base font-bold text-emerald-700">
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(group.totalAmount)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>

              {/* Sub-groups by Session */}
              <CardContent className="p-4 space-y-4">
                {group.sessions.map((sess) => (
                  <div key={sess.sessionKey} className="rounded-lg border p-3.5 space-y-3 bg-muted/15" style={{ borderColor: "#E2DFC2" }}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-[#767014]" />
                        <span className="font-semibold text-sm text-[#767014]">
                          {sess.programTitle ? `${sess.programTitle} — ` : ""}{sess.sessionName}
                        </span>
                        <Badge variant="outline" className="text-xs bg-white">
                          <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                          {sess.dateStr} at {sess.timeStr}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {sess.locationName}
                        </span>
                        <Badge className="bg-[#767014] text-white text-xs">
                          {sess.totalSessionGuests} Attendee{sess.totalSessionGuests !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </div>

                    {/* Bookings under this session */}
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {sess.items.map(({ booking, item }) => (
                        <div
                          key={`sess-item-${item.id}`}
                          className="p-2.5 rounded bg-white border text-xs space-y-1 shadow-2xs hover:border-[#767014] transition-colors"
                        >
                          <div className="flex items-center justify-between font-medium">
                            <span className="font-semibold text-[#767014]">
                              {booking.payment?.orderId || `RV-${booking.id}`}
                            </span>
                            <Badge
                              variant="outline"
                              className={
                                booking.source === "ADMIN"
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : "bg-sky-50 text-sky-700 border-sky-200"
                              }
                            >
                              {booking.source === "ADMIN" ? "Admin" : "Online"}
                            </Badge>
                          </div>
                          <div className="text-muted-foreground flex items-center justify-between">
                            <span>Guest: <strong className="text-foreground">{item.customer?.name || "Attendee"}</strong></span>
                            <span>{item.quantity} seat(s)</span>
                          </div>
                          {item.sessionType && (
                            <div className="text-blue-600 font-medium">
                              Type: {item.sessionType.name}
                            </div>
                          )}
                          <div className="flex items-center justify-between text-muted-foreground pt-1 border-t text-[11px]">
                            <span>Status: {booking.status}</span>
                            <span className="font-bold text-foreground">
                              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(booking.amount)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* ================= 3. CALENDAR VIEW ================= */
        <div className="grid gap-8 lg:grid-cols-[380px_1fr] items-start">
          {/* Left Column: Calendar Picker */}
          <div className="space-y-6">
            <Card className="border-none shadow-lg overflow-hidden">
              <CardHeader className="bg-[#767014]/10 pb-4">
                <CardTitle className="text-[#767014] flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Calendar Schedule
                  </span>
                  <Badge variant="outline" className="bg-white text-xs">
                    {filteredBookings.length} Total
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex justify-center bg-card">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => {
                    if (newDate) setDate(newDate);
                  }}
                  className="rounded-md"
                  modifiers={{ booked: bookedDays }}
                  modifiersClassNames={{
                    booked: "bg-[#767014]/20 text-[#767014] font-bold hover:bg-[#767014]/30 rounded-md",
                  }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Selected Date Bookings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: "#767014" }}>
                  {date ? format(date, "EEEE, MMMM do, yyyy") : "Select a date"}
                </h2>
                <p className="text-muted-foreground">
                  {selectedDateBookings.length === 0
                    ? "No bookings scheduled for this date."
                    : `Showing ${selectedDateBookings.length} booking${selectedDateBookings.length !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>

            {selectedDateBookings.length === 0 ? (
              <Card className="border-dashed border-2 bg-muted/10 p-8 text-center">
                <p className="text-muted-foreground">No bookings recorded for this day.</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {selectedDateBookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onUpdate={fetchBookings}
                    onEdit={(b) => setEditingBooking(b)}
                    canEdit={canEdit}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatSessionTime(raw) {
  if (!raw) return "--:--";
  if (typeof raw === "string") {
    if (/^\d{2}:\d{2}/.test(raw)) return raw.slice(0, 5);
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(11, 16);
    return "--:--";
  }
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString().slice(11, 16);
  }
  return "--:--";
}

function BookingCard({ booking, onUpdate, onEdit, canEdit = true }) {
  const statusColor = {
    PENDING: "text-amber-700 bg-amber-50 border-amber-300",
    PAID: "text-emerald-700 bg-emerald-50 border-emerald-300",
    CONFIRMED: "text-blue-700 bg-blue-50 border-blue-300",
    CANCELLED: "text-red-700 bg-red-50 border-red-300",
  };

  const StatusIcon = {
    PENDING: AlertCircle,
    PAID: CheckCircle2,
    CONFIRMED: CheckCircle2,
    CANCELLED: XCircle,
  }[booking.status] || AlertCircle;

  const isOnline = booking.source !== "ADMIN";
  const refCode = booking.payment?.orderId || `RV-${booking.id}`;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-all duration-200 border-l-4" style={{ borderLeftColor: "#767014" }}>
      <div className="p-5 space-y-4">
        {/* Header: Travel Agent, Reference, Source & Status */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0 bg-[#767014]/15 text-[#767014]">
              {booking.leader?.role === "LEADER"
                ? (booking.leader?.name?.charAt(0).toUpperCase() || "A")
                : (isOnline ? "O" : "A")}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-mono font-bold text-sm bg-muted px-2 py-0.5 rounded border">
                  {refCode}
                </span>

                {/* Source Badge (Online vs Admin) */}
                <Badge
                  className={
                    isOnline
                      ? "bg-sky-100 text-sky-800 border-sky-300 font-semibold"
                      : "bg-purple-100 text-purple-800 border-purple-300 font-semibold"
                  }
                  variant="outline"
                >
                  {isOnline ? (
                    <>
                      <Globe className="h-3 w-3 mr-1 text-sky-600" /> Online
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-3 w-3 mr-1 text-purple-600" /> Admin
                    </>
                  )}
                </Badge>

                {/* Date Badge */}
                <Badge variant="secondary" className="text-xs">
                  {formatBookingDate(booking.bookedDate)}
                </Badge>

                {/* Transaction Ref Badge */}
                {booking.payment?.transactionId && (
                  <Badge variant="outline" className="text-xs font-mono bg-amber-50 text-amber-900 border-amber-300 font-semibold">
                    {booking.payment.transactionId}
                  </Badge>
                )}
              </div>

              <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <span style={{ color: "#767014" }}>Travel Agent:</span>
                {booking.leader?.role === "LEADER" ? (
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <span>{booking.leader.name}</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      ({booking.leader.email})
                    </span>
                    {booking.leader.promoteCode && (
                      <Badge variant="outline" className="text-[10px] font-mono bg-primary/5 text-[#767014] border-[#C5BF81]">
                        {booking.leader.promoteCode}
                      </Badge>
                    )}
                  </span>
                ) : (
                  <span className="text-muted-foreground font-normal">Direct Booking (No Agent)</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusColor[booking.status]}`}>
              <StatusIcon className="h-3.5 w-3.5" />
              {booking.status}
            </div>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={() => onEdit?.(booking)}
                disabled={booking.status === "CANCELLED"}
              >
                <Edit className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
            <BookingManager booking={booking} onUpdate={onUpdate} onEdit={onEdit} canEdit={canEdit} />
          </div>
        </div>

        <Separator />

        {/* Booking Items / Sessions */}
        <div className="space-y-3">
          {booking.items?.map((item) => (
            <div key={item.id} className="bg-muted/30 rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium text-sm">
                  {item.session?.program?.title}
                  <span className="text-muted-foreground mx-1">•</span>
                  <span className="text-[#767014] font-semibold">{item.session?.name}</span>
                  {item.sessionType && (
                    <>
                      <span className="text-muted-foreground mx-1">•</span>
                      <span className="text-blue-600 font-semibold">{item.sessionType.name}</span>
                    </>
                  )}
                </div>
                <Badge variant="outline" className="bg-background shrink-0 font-medium">
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
                  {item.session?.program?.location?.name || "Galle"}
                </div>
                {item.customer && (
                  <div className="flex items-center gap-1.5 text-foreground font-medium bg-background px-2 py-0.5 rounded border">
                    <User className="h-3 w-3 text-[#767014]" />
                    {item.customer.name}
                    {item.customer.phone && (
                      <span className="text-muted-foreground text-[11px] font-normal">
                        ({item.customer.phone})
                      </span>
                    )}
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
              <span>
                {booking.paymentType === "Later"
                  ? "Pay Later"
                  : booking.paymentType === "Partial"
                  ? "Partial Payment"
                  : "Full Payment"}
                {booking.payment?.method ? ` (${booking.payment.method})` : ""}
              </span>
            </div>
            <div className="font-bold text-lg text-foreground">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(booking.amount - booking.balance)}
              <span className="text-xs text-muted-foreground font-normal ml-1">paid</span>
            </div>
          </div>

          {["Partial", "Later"].includes(booking.paymentType) && (
            <div className="flex items-center justify-between bg-secondary/20 p-2 rounded text-xs">
              <div className="flex gap-4">
                <span className="text-muted-foreground">
                  Total:{" "}
                  <span className="font-medium text-foreground">
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(booking.amount)}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  Remaining Balance:{" "}
                  <span className="font-bold text-red-600">
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(booking.balance)}
                  </span>
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
