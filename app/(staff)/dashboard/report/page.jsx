"use client";

import { useState, useEffect, useMemo } from "react";
import {
  format,
  isSameDay,
  isAfter,
  isBefore,
  subDays,
  startOfMonth,
  endOfDay,
  startOfDay,
} from "date-fns";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchWithAuth } from "@/lib/apiClient";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import {
  Loader2,
  TrendingUp,
  DollarSign,
  CreditCard,
  AlertCircle,
  Users,
  CheckCircle2,
  XCircle,
  FileText,
  RefreshCw,
  Award,
  Layers,
  MapPin,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  Printer,
  RotateCcw,
  Calendar,
  Briefcase,
  UserCheck,
  User,
  Clock,
} from "lucide-react";
import {
  downloadBookingsCSV,
  downloadBookingsPDF,
  downloadBookingsDoc,
  downloadAgentsCSV,
  downloadAgentsPDF,
  downloadAgentsDoc,
  downloadClientsCSV,
  downloadClientsPDF,
  downloadClientsDoc,
} from "@/lib/reportExport";

export default function ReportsPage() {
  useDashboard();

  // Active Tab: "bookings" | "agents" | "clients"
  const [activeTab, setActiveTab] = useState("bookings");

  // Raw data state
  const [bookings, setBookings] = useState([]);
  const [agents, setAgents] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Bookings Filter States
  const [timeRange, setTimeRange] = useState("all"); // all, today, 7days, 30days, month, custom
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [programFilter, setProgramFilter] = useState("ALL");
  const [leaderFilter, setLeaderFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Agents Filter States
  const [agentSearch, setAgentSearch] = useState("");
  const [agentStatusFilter, setAgentStatusFilter] = useState("ALL");

  // Clients Filter States
  const [clientSearch, setClientSearch] = useState("");
  const [clientStatusFilter, setClientStatusFilter] = useState("ALL");
  const [clientLeaderFilter, setClientLeaderFilter] = useState("ALL");
  const [clientProgramFilter, setClientProgramFilter] = useState("ALL");

  useEffect(() => {
    fetchReportsData();
  }, []);

  async function fetchReportsData() {
    setLoading(true);
    try {
      const [bookingsRes, leadersRes, commissionsRes, customersRes] =
        await Promise.all([
          fetchWithAuth("/api/bookings"),
          fetchWithAuth("/api/leaders"),
          fetchWithAuth("/api/commissions/leaders"),
          fetchWithAuth("/api/customers"),
        ]);

      if (bookingsRes.ok) {
        const data = await bookingsRes.json();
        setBookings(data.bookings || []);
      }

      const leadersData = leadersRes.ok ? await leadersRes.json() : { leaders: [] };
      const commissionsData = commissionsRes.ok ? await commissionsRes.json() : { leaders: [] };

      // Map commissions by leader id
      const commMap = new Map((commissionsData.leaders || []).map((c) => [c.id, c]));

      // Merge leaders & commission metrics
      const mergedAgents = (leadersData.leaders || [])
        .filter((l) => l.role === "LEADER" || l.promoteCode)
        .map((leader) => {
          const comm = commMap.get(leader.id) || {};
          return {
            id: leader.id,
            name: leader.name,
            email: leader.email,
            contact: leader.contact,
            promoteCode: leader.promoteCode,
            role: leader.role,
            status: leader.status,
            customersCount: leader.customersCount ?? comm.totalCustomers ?? 0,
            bookingsCount: leader.bookingsCount ?? comm.totalBookings ?? 0,
            totalSeatsReferred: comm.totalSeatsReferred ?? 0,
            totalCommission: comm.totalCommission ?? 0,
            paidCommission: comm.paidCommission ?? 0,
            pendingCommission: comm.pendingCommission ?? 0,
          };
        });

      setAgents(mergedAgents);

      if (customersRes.ok) {
        const customersData = await customersRes.json();
        setClients(customersData.customers || []);
      }
    } catch (error) {
      console.error("Failed to fetch reports data:", error);
    } finally {
      setLoading(false);
    }
  }

  // Derive unique programs for filter dropdown
  const uniquePrograms = useMemo(() => {
    const set = new Set();
    bookings.forEach((b) => {
      const title = b.items?.[0]?.session?.program?.title;
      if (title) set.add(title);
    });
    return Array.from(set).sort();
  }, [bookings]);

  // Derive unique leaders for filter dropdown
  const uniqueLeaders = useMemo(() => {
    const map = new Map();
    bookings.forEach((b) => {
      if (b.leaderId && b.leader?.name && b.leader?.role === "LEADER") {
        map.set(String(b.leaderId), b.leader.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [bookings]);

  // Check if any booking filters are active
  const isBookingFilterActive = useMemo(() => {
    return (
      timeRange !== "all" ||
      statusFilter !== "ALL" ||
      programFilter !== "ALL" ||
      leaderFilter !== "ALL" ||
      searchQuery.trim().length > 0 ||
      (timeRange === "custom" && (customStartDate || customEndDate))
    );
  }, [timeRange, statusFilter, programFilter, leaderFilter, searchQuery, customStartDate, customEndDate]);

  // Reset booking filters
  const resetBookingFilters = () => {
    setTimeRange("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setStatusFilter("ALL");
    setProgramFilter("ALL");
    setLeaderFilter("ALL");
    setSearchQuery("");
  };

  // Filter Bookings
  const filteredBookings = useMemo(() => {
    const now = new Date();
    const todayMidnight = new Date(now.setHours(0, 0, 0, 0));

    return bookings.filter((b) => {
      const bDate = new Date(b.bookedDate);

      // 1. Time Range
      if (timeRange === "today" && !isSameDay(bDate, todayMidnight)) {
        return false;
      }
      if (timeRange === "7days") {
        const sevenDaysAgo = subDays(todayMidnight, 7);
        if (bDate < sevenDaysAgo) return false;
      }
      if (timeRange === "30days") {
        const thirtyDaysAgo = subDays(todayMidnight, 30);
        if (bDate < thirtyDaysAgo) return false;
      }
      if (timeRange === "month") {
        const firstOfMonth = startOfMonth(todayMidnight);
        if (bDate < firstOfMonth) return false;
      }
      if (timeRange === "custom") {
        if (customStartDate) {
          const s = startOfDay(new Date(customStartDate));
          if (bDate < s) return false;
        }
        if (customEndDate) {
          const e = endOfDay(new Date(customEndDate));
          if (bDate > e) return false;
        }
      }

      // 2. Status Filter
      if (statusFilter !== "ALL" && b.status !== statusFilter) {
        return false;
      }

      // 3. Program Filter
      if (programFilter !== "ALL") {
        const pTitle = b.items?.[0]?.session?.program?.title;
        if (pTitle !== programFilter) return false;
      }

      // 4. Leader Filter
      if (leaderFilter !== "ALL") {
        if (leaderFilter === "direct") {
          if (b.leaderId && b.leader?.role === "LEADER") return false;
        } else if (String(b.leaderId) !== leaderFilter) {
          return false;
        }
      }

      // 5. Search Query
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const refCode = (b.payment?.orderId || `RV-${b.id}`).toLowerCase();
        const firstCust = b.items?.find((i) => i.customer?.name)?.customer;
        const guestName = (firstCust?.name || b.leader?.name || "").toLowerCase();
        const guestEmail = (firstCust?.email || b.leader?.email || "").toLowerCase();
        const guestPhone = (firstCust?.phone || b.leader?.contact || "").toLowerCase();

        const matches =
          refCode.includes(q) ||
          guestName.includes(q) ||
          guestEmail.includes(q) ||
          guestPhone.includes(q) ||
          String(b.id).includes(q);

        if (!matches) return false;
      }

      return true;
    });
  }, [
    bookings,
    timeRange,
    customStartDate,
    customEndDate,
    statusFilter,
    programFilter,
    leaderFilter,
    searchQuery,
  ]);

  // Aggregate Metrics for Bookings
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalCollected = 0;
    let totalBalance = 0;
    let totalGuests = 0;

    const statusCounts = {
      PAID: 0,
      CONFIRMED: 0,
      PENDING: 0,
      CANCELLED: 0,
    };

    const statusRevenue = {
      PAID: 0,
      CONFIRMED: 0,
      PENDING: 0,
      CANCELLED: 0,
    };

    filteredBookings.forEach((b) => {
      const status = b.status || "PENDING";
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      const bRevenue = b.amount || 0;
      const bBalance = b.balance || 0;
      const bCollected = Math.max(0, bRevenue - bBalance);

      if (status !== "CANCELLED") {
        totalRevenue += bRevenue;
        totalCollected += bCollected;
        totalBalance += bBalance;
      }

      statusRevenue[status] = (statusRevenue[status] || 0) + bRevenue;

      if (Array.isArray(b.items)) {
        b.items.forEach((item) => {
          totalGuests += item.quantity || 1;
        });
      }
    });

    return {
      totalBookings: filteredBookings.length,
      totalRevenue,
      totalCollected,
      totalBalance,
      totalGuests,
      statusCounts,
      statusRevenue,
    };
  }, [filteredBookings]);

  // Filter Agents
  const filteredAgents = useMemo(() => {
    return agents.filter((a) => {
      if (agentStatusFilter !== "ALL" && a.status !== agentStatusFilter) {
        return false;
      }
      if (agentSearch.trim().length > 0) {
        const q = agentSearch.toLowerCase();
        const matches =
          (a.name || "").toLowerCase().includes(q) ||
          (a.email || "").toLowerCase().includes(q) ||
          (a.contact || "").toLowerCase().includes(q) ||
          (a.promoteCode || "").toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [agents, agentSearch, agentStatusFilter]);

  // Aggregate Metrics for Agents
  const agentStats = useMemo(() => {
    const totalAgents = filteredAgents.length;
    const totalClients = filteredAgents.reduce(
      (sum, a) => sum + (a.customersCount || 0),
      0
    );
    const totalBookings = filteredAgents.reduce(
      (sum, a) => sum + (a.bookingsCount || 0),
      0
    );
    const totalCommission = filteredAgents.reduce(
      (sum, a) => sum + Number(a.totalCommission || 0),
      0
    );
    const paidCommission = filteredAgents.reduce(
      (sum, a) => sum + Number(a.paidCommission || 0),
      0
    );
    const pendingCommission = filteredAgents.reduce(
      (sum, a) => sum + Number(a.pendingCommission || 0),
      0
    );

    return {
      totalAgents,
      totalClients,
      totalBookings,
      totalCommission,
      paidCommission,
      pendingCommission,
    };
  }, [filteredAgents]);

  // Check if any client filters are active
  const isClientFilterActive = useMemo(() => {
    return (
      clientSearch.trim().length > 0 ||
      clientStatusFilter !== "ALL" ||
      clientLeaderFilter !== "ALL" ||
      clientProgramFilter !== "ALL"
    );
  }, [clientSearch, clientStatusFilter, clientLeaderFilter, clientProgramFilter]);

  const resetClientFilters = () => {
    setClientSearch("");
    setClientStatusFilter("ALL");
    setClientLeaderFilter("ALL");
    setClientProgramFilter("ALL");
  };

  // Filter Clients
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      if (clientStatusFilter !== "ALL" && c.status !== clientStatusFilter) {
        return false;
      }

      if (clientLeaderFilter !== "ALL") {
        if (clientLeaderFilter === "direct") {
          if (
            c.leaderRole === "LEADER" ||
            (c.leaderPromoteCode && c.leaderPromoteCode !== "None")
          ) {
            return false;
          }
        } else if (String(c.leaderId) !== clientLeaderFilter) {
          return false;
        }
      }

      if (clientProgramFilter !== "ALL") {
        if (c.programTitle !== clientProgramFilter) {
          return false;
        }
      }

      if (clientSearch.trim().length > 0) {
        const q = clientSearch.toLowerCase();
        const matches =
          (c.name || "").toLowerCase().includes(q) ||
          (c.email || "").toLowerCase().includes(q) ||
          (c.phone || "").toLowerCase().includes(q) ||
          (c.nic || "").toLowerCase().includes(q) ||
          (c.leaderName || "").toLowerCase().includes(q) ||
          (c.leaderPromoteCode || "").toLowerCase().includes(q) ||
          (c.programTitle || "").toLowerCase().includes(q);

        if (!matches) return false;
      }

      return true;
    });
  }, [clients, clientStatusFilter, clientLeaderFilter, clientProgramFilter, clientSearch]);

  // Metrics for Clients
  const clientStats = useMemo(() => {
    const totalClients = filteredClients.length;
    const activeCount = filteredClients.filter(
      (c) => c.status === "Active" || c.status === "Upcoming"
    ).length;
    const totalSessions = filteredClients.reduce(
      (sum, c) => sum + (c.sessionsCount || 0),
      0
    );
    const agentReferred = filteredClients.filter(
      (c) =>
        c.leaderRole === "LEADER" ||
        (c.leaderPromoteCode && c.leaderPromoteCode !== "None")
    ).length;

    return {
      totalClients,
      activeCount,
      totalSessions,
      agentReferred,
    };
  }, [filteredClients]);

  const currencyFormatter = (val) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
      val || 0
    );

  // Construct readable filter summary object for exports
  const currentFilterSummary = useMemo(() => {
    return {
      timeRange:
        timeRange === "custom"
          ? `${customStartDate || "Start"} to ${customEndDate || "End"}`
          : timeRange === "all"
          ? "All Time"
          : timeRange === "today"
          ? "Today"
          : timeRange === "7days"
          ? "Past 7 Days"
          : timeRange === "30days"
          ? "Past 30 Days"
          : "This Month",
      status: statusFilter !== "ALL" ? statusFilter : null,
      program: programFilter !== "ALL" ? programFilter : null,
      leader:
        leaderFilter !== "ALL"
          ? leaderFilter === "direct"
            ? "Direct Only"
            : uniqueLeaders.find((l) => l.id === leaderFilter)?.name
          : null,
      search: searchQuery || null,
    };
  }, [
    timeRange,
    customStartDate,
    customEndDate,
    statusFilter,
    programFilter,
    leaderFilter,
    searchQuery,
    uniqueLeaders,
  ]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Export booking reports, travel agent performance, and client directories.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Main Tab Switcher */}
          <div className="bg-muted p-1 rounded-lg flex flex-wrap gap-1">
            <Button
              variant={activeTab === "bookings" ? "default" : "ghost"}
              size="sm"
              className="text-xs h-9 gap-1.5"
              onClick={() => setActiveTab("bookings")}
            >
              <Calendar className="h-4 w-4" />
              Bookings & Revenue
            </Button>
            <Button
              variant={activeTab === "agents" ? "default" : "ghost"}
              size="sm"
              className="text-xs h-9 gap-1.5"
              onClick={() => setActiveTab("agents")}
            >
              <Briefcase className="h-4 w-4" />
              Travel Agents ({agents.length})
            </Button>
            <Button
              variant={activeTab === "clients" ? "default" : "ghost"}
              size="sm"
              className="text-xs h-9 gap-1.5"
              onClick={() => setActiveTab("clients")}
            >
              <Users className="h-4 w-4" />
              Clients & Guests ({clients.length})
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchReportsData}
            className="h-9 gap-1"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Generating report data...</p>
        </div>
      ) : activeTab === "bookings" ? (
        /* ========================================================================= */
        /* TAB 1: BOOKINGS & REVENUE REPORTS                                        */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Filter Bar Card */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="h-4 w-4 text-primary" />
                  Filter Bookings
                  {isBookingFilterActive ? (
                    <Badge variant="secondary" className="font-normal text-xs ml-2">
                      Filtered: {filteredBookings.length} of {bookings.length}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="font-normal text-xs ml-2">
                      All {bookings.length} Bookings
                    </Badge>
                  )}
                </CardTitle>

                {isBookingFilterActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetBookingFilters}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 self-start md:self-auto"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset Filters
                  </Button>
                )}
              </div>
              <CardDescription>
                Narrow down bookings by date range, status, program, or search terms before downloading.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search guest, email, ref..."
                    className="pl-9 h-9 text-xs"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Time Range Preset */}
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="7days">Past 7 Days</SelectItem>
                    <SelectItem value="30days">Past 30 Days</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="custom">Custom Date Range</SelectItem>
                  </SelectContent>
                </Select>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="PAID">Fully Paid</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                {/* Program Filter */}
                <Select value={programFilter} onValueChange={setProgramFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Program" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Programs</SelectItem>
                    {uniquePrograms.map((prog) => (
                      <SelectItem key={prog} value={prog}>
                        {prog}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Travel Agent Filter */}
                <Select value={leaderFilter} onValueChange={setLeaderFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Travel Agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Travel Agents / Direct</SelectItem>
                    <SelectItem value="direct">Direct Only (No Travel Agent)</SelectItem>
                    {uniqueLeaders.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date Pickers when 'custom' is selected */}
              {timeRange === "custom" && (
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">From:</span>
                    <Input
                      type="date"
                      className="h-8 w-38 text-xs"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">To:</span>
                    <Input
                      type="date"
                      className="h-8 w-38 text-xs"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Download Actions Bar */}
              <div className="pt-3 border-t flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  {isBookingFilterActive
                    ? `Ready to download ${filteredBookings.length} filtered record${
                        filteredBookings.length !== 1 ? "s" : ""
                      }`
                    : `Ready to download all ${bookings.length} record${
                        bookings.length !== 1 ? "s" : ""
                      }`}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-200"
                    onClick={() => downloadBookingsCSV(filteredBookings, currentFilterSummary)}
                    disabled={filteredBookings.length === 0}
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    CSV ({filteredBookings.length})
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 border-red-200"
                    onClick={() =>
                      downloadBookingsPDF(filteredBookings, stats, currentFilterSummary)
                    }
                    disabled={filteredBookings.length === 0}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    PDF Document
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border-blue-200"
                    onClick={() =>
                      downloadBookingsDoc(filteredBookings, stats, currentFilterSummary)
                    }
                    disabled={filteredBookings.length === 0}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Word / DOC
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => window.print()}
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* High Level Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="shadow-sm border-l-4 border-l-emerald-500">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Total Revenue
                  </p>
                  <h3 className="text-xl font-bold mt-1 text-emerald-700">
                    {currencyFormatter(stats.totalRevenue)}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {filteredBookings.length} booking{filteredBookings.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-full">
                  <DollarSign className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-l-4 border-l-blue-500">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Total Collected
                  </p>
                  <h3 className="text-xl font-bold mt-1 text-blue-700">
                    {currencyFormatter(stats.totalCollected)}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Processed Payments</p>
                </div>
                <div className="p-2.5 bg-blue-100 text-blue-600 rounded-full">
                  <CreditCard className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-l-4 border-l-amber-500">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Pending Balance
                  </p>
                  <h3 className="text-xl font-bold mt-1 text-amber-700">
                    {currencyFormatter(stats.totalBalance)}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Due on arrival / later</p>
                </div>
                <div className="p-2.5 bg-amber-100 text-amber-600 rounded-full">
                  <AlertCircle className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-l-4 border-l-indigo-500">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Total Guests / Seats
                  </p>
                  <h3 className="text-xl font-bold mt-1 text-indigo-700">
                    {stats.totalGuests}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Reserved participants</p>
                </div>
                <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-full">
                  <Users className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bookings Interactive Table */}
          <Card className="shadow-md">
            <CardHeader className="bg-muted/20 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Filtered Bookings List ({filteredBookings.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  Review the filtered bookings below. These exact rows will be exported.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredBookings.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-sm">
                  No bookings found matching your selected filters. Try clearing or expanding your criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 text-xs">
                        <TableHead className="w-24">Ref Code</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Guest</TableHead>
                        <TableHead>Program & Activity</TableHead>
                        <TableHead className="text-center">Seats</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead>Agent / Referral</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBookings.slice(0, 100).map((b) => {
                        const firstCust = b.items?.find((i) => i.customer?.name)?.customer;
                        const guestName = firstCust?.name || b.leader?.name || "Direct Guest";
                        const guestEmail = firstCust?.email || b.leader?.email || "";
                        const progTitle = b.items?.[0]?.session?.program?.title || "N/A";
                        const totalSeats = (b.items || []).reduce(
                          (sum, i) => sum + (i.quantity || 1),
                          0
                        );
                        const paidAmt = Math.max(0, (b.amount || 0) - (b.balance || 0));

                        return (
                          <TableRow key={b.id} className="text-xs hover:bg-muted/30">
                            <TableCell className="font-semibold text-primary">
                              {b.payment?.orderId || `RV-${b.id}`}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {new Date(b.bookedDate).toISOString().split("T")[0]}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-foreground">{guestName}</div>
                              <div className="text-[11px] text-muted-foreground">{guestEmail}</div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{progTitle}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {(b.items || []).map((i) => i.session?.name).filter(Boolean).join(", ")}
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-bold">{totalSeats}</TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={
                                  b.status === "CONFIRMED" || b.status === "PAID"
                                    ? "default"
                                    : b.status === "PENDING"
                                    ? "secondary"
                                    : "destructive"
                                }
                                className="text-[10px] uppercase font-semibold"
                              >
                                {b.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {currencyFormatter(b.amount)}
                            </TableCell>
                            <TableCell className="text-right text-emerald-600 font-medium">
                              {currencyFormatter(paidAmt)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {b.balance > 0 ? (
                                <span className="text-amber-600">
                                  {currencyFormatter(b.balance)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">$0.00</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {b.leader?.role === "LEADER" ? (
                                <>
                                  <span className="font-medium text-foreground">
                                    {b.leader.name}
                                  </span>
                                  {b.leader?.promoteCode && (
                                    <Badge variant="outline" className="text-[10px] ml-1.5 font-mono">
                                      {b.leader.promoteCode}
                                    </Badge>
                                  )}
                                </>
                              ) : (
                                <span className="text-muted-foreground">Direct (No Agent)</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {filteredBookings.length > 100 && (
                    <div className="p-3 text-center text-xs text-muted-foreground bg-muted/20 border-t">
                      Showing first 100 of {filteredBookings.length} records. All {filteredBookings.length} will be included in the exported PDF, CSV, and DOC files.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : activeTab === "agents" ? (
        /* ========================================================================= */
        /* TAB 2: TRAVEL AGENTS & AFFILIATES PERFORMANCE                           */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Agent Export & Filter Card */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-primary" />
                    Travel Agent Affiliates Directory ({filteredAgents.length})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Overview of registered travel leaders, referral codes, clients acquired, and commission payouts.
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-200"
                    onClick={() => downloadAgentsCSV(filteredAgents, {})}
                    disabled={filteredAgents.length === 0}
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    CSV ({filteredAgents.length})
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 border-red-200"
                    onClick={() => downloadAgentsPDF(filteredAgents, agentStats, {})}
                    disabled={filteredAgents.length === 0}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    PDF Document
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border-blue-200"
                    onClick={() => downloadAgentsDoc(filteredAgents, agentStats, {})}
                    disabled={filteredAgents.length === 0}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Word / DOC
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => window.print()}
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative sm:col-span-2">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by agent name, email, phone, or promo code..."
                    className="pl-9 h-9 text-xs"
                    value={agentSearch}
                    onChange={(e) => setAgentSearch(e.target.value)}
                  />
                </div>

                <Select value={agentStatusFilter} onValueChange={setAgentStatusFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="PENDING">Pending Approval</SelectItem>
                    <SelectItem value="DEACTIVATED">Deactivated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* High Level Metric Cards for Agents */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="shadow-sm border-l-4 border-l-primary">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Total Agents
                  </p>
                  <h3 className="text-xl font-bold mt-1 text-primary">
                    {agentStats.totalAgents}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Registered Affiliates</p>
                </div>
                <div className="p-2.5 bg-primary/10 text-primary rounded-full">
                  <Briefcase className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-l-4 border-l-blue-500">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Clients Brought In
                  </p>
                  <h3 className="text-xl font-bold mt-1 text-blue-700">
                    {agentStats.totalClients}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Referred Customers</p>
                </div>
                <div className="p-2.5 bg-blue-100 text-blue-600 rounded-full">
                  <Users className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-l-4 border-l-indigo-500">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Agent Bookings
                  </p>
                  <h3 className="text-xl font-bold mt-1 text-indigo-700">
                    {agentStats.totalBookings}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Bookings Generated</p>
                </div>
                <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-full">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-l-4 border-l-emerald-500">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Total Commission
                  </p>
                  <h3 className="text-xl font-bold mt-1 text-emerald-700">
                    {currencyFormatter(agentStats.totalCommission)}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Paid: {currencyFormatter(agentStats.paidCommission)}
                  </p>
                </div>
                <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-full">
                  <DollarSign className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Agents Table */}
          <Card className="shadow-md">
            <CardHeader className="bg-muted/20 pb-3">
              <CardTitle className="text-base font-semibold">
                Travel Agents Details & Client Attribution
              </CardTitle>
              <CardDescription className="text-xs">
                Detailed list of all travel agents, their affiliation promo codes, and client acquisition counts.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {filteredAgents.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-sm">
                  No travel agents match your search criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 text-xs">
                        <TableHead>Agent Name</TableHead>
                        <TableHead>Email & Contact</TableHead>
                        <TableHead className="text-center">Affiliation Code</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Clients Brought In</TableHead>
                        <TableHead className="text-center">Total Bookings</TableHead>
                        <TableHead className="text-center">Seats</TableHead>
                        <TableHead className="text-right">Total Commission</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Pending</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAgents.map((agent) => (
                        <TableRow key={agent.id} className="text-xs hover:bg-muted/30">
                          <TableCell className="font-semibold text-foreground">
                            {agent.name}
                          </TableCell>
                          <TableCell>
                            <div>{agent.email}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {agent.contact || "No Phone"}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {agent.promoteCode ? (
                              <Badge variant="outline" className="font-mono text-[11px] font-bold text-primary">
                                {agent.promoteCode}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={
                                agent.status === "ACTIVE"
                                  ? "default"
                                  : agent.status === "PENDING"
                                  ? "secondary"
                                  : "destructive"
                              }
                              className="text-[10px] uppercase font-semibold"
                            >
                              {agent.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-bold text-blue-600 text-sm">
                            {agent.customersCount}
                          </TableCell>
                          <TableCell className="text-center font-semibold">
                            {agent.bookingsCount}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {agent.totalSeatsReferred}
                          </TableCell>
                          <TableCell className="text-right font-bold text-foreground">
                            {currencyFormatter(agent.totalCommission)}
                          </TableCell>
                          <TableCell className="text-right text-emerald-600 font-medium">
                            {currencyFormatter(agent.paidCommission)}
                          </TableCell>
                          <TableCell className="text-right text-amber-600 font-medium">
                            {currencyFormatter(agent.pendingCommission)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ========================================================================= */
        /* TAB 3: CLIENTS & GUESTS DIRECTORY                                        */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Client Filter & Export Card */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Clients & Guests Directory
                    {isClientFilterActive ? (
                      <Badge variant="secondary" className="font-normal text-xs ml-2">
                        Filtered: {filteredClients.length} of {clients.length}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="font-normal text-xs ml-2">
                        All {clients.length} Clients
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    View customer profiles, contact info, NIC/Passport, booking frequency, and affiliated travel agents.
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-200"
                    onClick={() => downloadClientsCSV(filteredClients, {})}
                    disabled={filteredClients.length === 0}
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    CSV ({filteredClients.length})
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 border-red-200"
                    onClick={() => downloadClientsPDF(filteredClients, clientStats, {})}
                    disabled={filteredClients.length === 0}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    PDF Document
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border-blue-200"
                    onClick={() => downloadClientsDoc(filteredClients, clientStats, {})}
                    disabled={filteredClients.length === 0}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Word / DOC
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => window.print()}
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search name, email, phone, NIC..."
                    className="pl-9 h-9 text-xs"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                  />
                </div>

                {/* Status Filter */}
                <Select value={clientStatusFilter} onValueChange={setClientStatusFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Upcoming">Upcoming</SelectItem>
                    <SelectItem value="Paused">Paused</SelectItem>
                    <SelectItem value="At Risk">At Risk</SelectItem>
                    <SelectItem value="No Sessions">No Sessions</SelectItem>
                  </SelectContent>
                </Select>

                {/* Travel Agent Filter */}
                <Select value={clientLeaderFilter} onValueChange={setClientLeaderFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Affiliated Travel Agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Travel Agents / Direct</SelectItem>
                    <SelectItem value="direct">Direct Clients Only</SelectItem>
                    {uniqueLeaders.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Program Filter */}
                <Select value={clientProgramFilter} onValueChange={setClientProgramFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Program" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Programs</SelectItem>
                    {uniquePrograms.map((prog) => (
                      <SelectItem key={prog} value={prog}>
                        {prog}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isClientFilterActive && (
                <div className="flex justify-end pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetClientFilters}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset Client Filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* High Level Metric Cards for Clients */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="shadow-sm border-l-4 border-l-primary">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Total Clients
                  </p>
                  <h3 className="text-xl font-bold mt-1 text-primary">
                    {clientStats.totalClients}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Guest Directory</p>
                </div>
                <div className="p-2.5 bg-primary/10 text-primary rounded-full">
                  <Users className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-l-4 border-l-emerald-500">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Active / Upcoming
                  </p>
                  <h3 className="text-xl font-bold mt-1 text-emerald-700">
                    {clientStats.activeCount}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Recent / Scheduled</p>
                </div>
                <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-full">
                  <UserCheck className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-l-4 border-l-blue-500">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    From Travel Agents
                  </p>
                  <h3 className="text-xl font-bold mt-1 text-blue-700">
                    {clientStats.agentReferred}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Affiliated Referrals</p>
                </div>
                <div className="p-2.5 bg-blue-100 text-blue-600 rounded-full">
                  <Briefcase className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-l-4 border-l-indigo-500">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Total Sessions
                  </p>
                  <h3 className="text-xl font-bold mt-1 text-indigo-700">
                    {clientStats.totalSessions}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Experience Bookings</p>
                </div>
                <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-full">
                  <Clock className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Clients Interactive Table */}
          <Card className="shadow-md">
            <CardHeader className="bg-muted/20 pb-3">
              <CardTitle className="text-base font-semibold">
                Clients & Guests List ({filteredClients.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Detailed customer registry. Downloads include all filtered records.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {filteredClients.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-sm">
                  No clients found matching your filter criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 text-xs">
                        <TableHead>Client Name</TableHead>
                        <TableHead>Email & Contact</TableHead>
                        <TableHead>NIC / Passport</TableHead>
                        <TableHead>Affiliated Agent</TableHead>
                        <TableHead>Experience Program</TableHead>
                        <TableHead className="text-center">Sessions</TableHead>
                        <TableHead>Last Session Date</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClients.map((client) => (
                        <TableRow key={client.id} className="text-xs hover:bg-muted/30">
                          <TableCell className="font-semibold text-foreground">
                            {client.name}
                          </TableCell>
                          <TableCell>
                            <div>{client.email}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {client.phone || "No Phone"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-muted-foreground">
                              {client.nic || "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-foreground">
                              {client.leaderRole === "LEADER" ? client.leaderName : "Direct"}
                            </div>
                            {client.leaderRole === "LEADER" && client.leaderPromoteCode && client.leaderPromoteCode !== "None" && (
                              <Badge variant="outline" className="font-mono text-[10px] mt-0.5">
                                {client.leaderPromoteCode}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {client.programTitle}
                          </TableCell>
                          <TableCell className="text-center font-bold">
                            {client.sessionsCount}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {client.lastSessionDate
                              ? new Date(client.lastSessionDate).toISOString().split("T")[0]
                              : "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={
                                client.status === "Active" || client.status === "Upcoming"
                                  ? "default"
                                  : client.status === "Paused"
                                  ? "secondary"
                                  : client.status === "At Risk"
                                  ? "destructive"
                                  : "outline"
                              }
                              className="text-[10px] font-semibold"
                            >
                              {client.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
