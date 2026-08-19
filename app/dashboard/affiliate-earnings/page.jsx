"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { fetchWithAuth } from "@/lib/apiClient";
import { useDashboard } from "../layout";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  CreditCard,
  Banknote,
} from "lucide-react";

export default function AffiliateEarningsPage() {
  useDashboard();

  const [activeTab, setActiveTab] = React.useState("overview");
  const [leaders, setLeaders] = React.useState([]);
  const [commissions, setCommissions] = React.useState([]);
  const [summary, setSummary] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  // Detail dialog state
  const [detailDialogOpen, setDetailDialogOpen] = React.useState(false);
  const [selectedLeader, setSelectedLeader] = React.useState(null);
  const [leaderCommissions, setLeaderCommissions] = React.useState([]);
  const [isLoadingDetails, setIsLoadingDetails] = React.useState(false);

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
  const [selectedCommission, setSelectedCommission] = React.useState(null);
  const [paymentForm, setPaymentForm] = React.useState({
    paymentStatus: "",
    paidAmount: "",
    notes: "",
  });

  // Status dialogs
  const [successDialogOpen, setSuccessDialogOpen] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState("");
  const [errorDialogOpen, setErrorDialogOpen] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [leadersRes, commissionsRes] = await Promise.all([
        fetchWithAuth("/api/commissions/leaders", { method: "GET", cache: "no-store" }),
        fetchWithAuth("/api/commissions", { method: "GET", cache: "no-store" }),
      ]);

      if (!leadersRes.ok) throw new Error("Failed to fetch leader summaries");
      if (!commissionsRes.ok) throw new Error("Failed to fetch commissions");

      const leadersData = await leadersRes.json();
      const commissionsData = await commissionsRes.json();

      setLeaders(leadersData.leaders || []);
      setSummary(leadersData.summary || null);
      setCommissions(commissionsData.commissions || []);
    } catch (err) {
      console.error("Data fetch error:", err);
      setError(err.message || "Unable to load data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleViewLeaderDetails = async (leader) => {
    setSelectedLeader(leader);
    setIsLoadingDetails(true);
    setDetailDialogOpen(true);

    try {
      const response = await fetchWithAuth(`/api/commissions?leaderId=${leader.id}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) throw new Error("Failed to fetch leader commissions");

      const data = await response.json();
      setLeaderCommissions(data.commissions || []);
    } catch (err) {
      console.error("Error fetching leader details:", err);
      setLeaderCommissions([]);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleUpdatePayment = (commission) => {
    setSelectedCommission(commission);
    setPaymentForm({
      paymentStatus: commission.paymentStatus,
      paidAmount: commission.paidAmount || "",
      notes: commission.notes || "",
    });
    setPaymentDialogOpen(true);
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();

    if (!selectedCommission) return;

    try {
      const payload = {
        paymentStatus: paymentForm.paymentStatus,
        notes: paymentForm.notes,
      };

      if (paymentForm.paymentStatus === "PARTIALLY_PAID" || paymentForm.paymentStatus === "PAID") {
        payload.paidAmount = parseFloat(paymentForm.paidAmount) || selectedCommission.commissionAmount;
      }

      const response = await fetchWithAuth(`/api/commissions/${selectedCommission.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update payment");
      }

      setSuccessMessage("Commission payment updated successfully.");
      setSuccessDialogOpen(true);
      setPaymentDialogOpen(false);
      loadData();

      // Refresh leader details if dialog is open
      if (selectedLeader) {
        handleViewLeaderDetails(selectedLeader);
      }
    } catch (err) {
      console.error("Payment update error:", err);
      setErrorMessage(err.message);
      setErrorDialogOpen(true);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-LK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "PAID":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Paid
          </Badge>
        );
      case "PARTIALLY_PAID":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Partial
          </Badge>
        );
      default:
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" style={{ color: "#767014" }}>
            Affiliate Earnings
          </h2>
          <p style={{ color: "#000000", opacity: 0.7 }}>
            Track and manage commission payments for affiliate leaders.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-2" style={{ borderColor: "#C5BF81" }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: "#767014" }}>
                Total Leaders
              </CardTitle>
              <Users className="h-4 w-4" style={{ color: "#767014" }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: "#000000" }}>
                {summary.totalLeaders}
              </div>
              <p className="text-xs" style={{ color: "#000000", opacity: 0.6 }}>
                Active affiliate leaders
              </p>
            </CardContent>
          </Card>

          <Card className="border-2" style={{ borderColor: "#C5BF81" }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: "#767014" }}>
                Total Commission
              </CardTitle>
              <TrendingUp className="h-4 w-4" style={{ color: "#767014" }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: "#000000" }}>
                {formatCurrency(summary.totalCommissionAmount)}
              </div>
              <p className="text-xs" style={{ color: "#000000", opacity: 0.6 }}>
                Total earned by all leaders
              </p>
            </CardContent>
          </Card>

          <Card className="border-2" style={{ borderColor: "#C5BF81" }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: "#767014" }}>
                Paid Out
              </CardTitle>
              <Banknote className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.totalPaidAmount)}
              </div>
              <p className="text-xs" style={{ color: "#000000", opacity: 0.6 }}>
                Already paid to leaders
              </p>
            </CardContent>
          </Card>

          <Card className="border-2" style={{ borderColor: "#C5BF81" }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: "#767014" }}>
                Pending Payment
              </CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(summary.totalPendingAmount)}
              </div>
              <p className="text-xs" style={{ color: "#000000", opacity: 0.6 }}>
                Awaiting payment
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b" style={{ borderColor: "#C5BF81" }}>
        <Button
          variant="ghost"
          className={`rounded-b-none ${activeTab === "overview" ? "border-b-2" : ""}`}
          style={{
            borderColor: activeTab === "overview" ? "#767014" : "transparent",
            color: activeTab === "overview" ? "#767014" : "#000000",
          }}
          onClick={() => setActiveTab("overview")}
        >
          <Users className="h-4 w-4 mr-2" />
          Leader Overview
        </Button>
        <Button
          variant="ghost"
          className={`rounded-b-none ${activeTab === "commissions" ? "border-b-2" : ""}`}
          style={{
            borderColor: activeTab === "commissions" ? "#767014" : "transparent",
            color: activeTab === "commissions" ? "#767014" : "#000000",
          }}
          onClick={() => setActiveTab("commissions")}
        >
          <CreditCard className="h-4 w-4 mr-2" />
          All Commissions
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#767014" }} />
        </div>
      ) : error ? (
        <Card className="border-2" style={{ borderColor: "#C5BF81" }}>
          <CardContent className="p-4">
            <div
              className="p-4 rounded-md border"
              style={{ backgroundColor: "#C5BF81", borderColor: "#767014", color: "#000000" }}
            >
              {error}
            </div>
          </CardContent>
        </Card>
      ) : activeTab === "overview" ? (
        <Card className="border-2" style={{ borderColor: "#C5BF81" }}>
          <CardHeader>
            <CardTitle style={{ color: "#767014" }}>Leader Commission Summary</CardTitle>
            <CardDescription style={{ color: "#000000", opacity: 0.7 }}>
              Overview of commission earnings for each affiliate leader.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {leaders.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4" style={{ color: "#C5BF81" }} />
                <p style={{ color: "#000000", opacity: 0.7 }}>
                  No affiliate leaders with commissions yet.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead style={{ color: "#767014", fontWeight: 600 }}>Leader</TableHead>
                      <TableHead style={{ color: "#767014", fontWeight: 600 }}>Promo Code</TableHead>
                      <TableHead style={{ color: "#767014", fontWeight: 600 }}>Bookings</TableHead>
                      <TableHead style={{ color: "#767014", fontWeight: 600 }}>Seats</TableHead>
                      <TableHead style={{ color: "#767014", fontWeight: 600 }}>Total Earned</TableHead>
                      <TableHead style={{ color: "#767014", fontWeight: 600 }}>Paid</TableHead>
                      <TableHead style={{ color: "#767014", fontWeight: 600 }}>Pending</TableHead>
                      <TableHead className="text-right" style={{ color: "#767014", fontWeight: 600 }}>
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaders.map((leader) => (
                      <TableRow key={leader.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium" style={{ color: "#000000" }}>
                              {leader.name}
                            </div>
                            <div className="text-sm" style={{ color: "#000000", opacity: 0.6 }}>
                              {leader.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className="border-0 font-mono"
                            style={{ backgroundColor: "#767014", color: "#ffffff" }}
                          >
                            {leader.promoteCode}
                          </Badge>
                        </TableCell>
                        <TableCell style={{ color: "#000000" }}>{leader.totalCommissions}</TableCell>
                        <TableCell style={{ color: "#000000" }}>{leader.totalSeatsReferred}</TableCell>
                        <TableCell className="font-medium" style={{ color: "#000000" }}>
                          {formatCurrency(leader.totalCommission)}
                        </TableCell>
                        <TableCell className="text-green-600 font-medium">
                          {formatCurrency(leader.paidCommission)}
                        </TableCell>
                        <TableCell className="text-orange-600 font-medium">
                          {formatCurrency(leader.pendingCommission)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewLeaderDetails(leader)}
                            style={{ color: "#767014" }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2" style={{ borderColor: "#C5BF81" }}>
          <CardHeader>
            <CardTitle style={{ color: "#767014" }}>All Commission Records</CardTitle>
            <CardDescription style={{ color: "#000000", opacity: 0.7 }}>
              Complete list of all commission records across all leaders.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {commissions.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 mx-auto mb-4" style={{ color: "#C5BF81" }} />
                <p style={{ color: "#000000", opacity: 0.7 }}>No commission records yet.</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead style={{ color: "#767014", fontWeight: 600 }}>Date</TableHead>
                      <TableHead style={{ color: "#767014", fontWeight: 600 }}>Leader</TableHead>
                      <TableHead style={{ color: "#767014", fontWeight: 600 }}>Booking</TableHead>
                      <TableHead style={{ color: "#767014", fontWeight: 600 }}>Seats</TableHead>
                      <TableHead style={{ color: "#767014", fontWeight: 600 }}>Rate</TableHead>
                      <TableHead style={{ color: "#767014", fontWeight: 600 }}>Commission</TableHead>
                      <TableHead style={{ color: "#767014", fontWeight: 600 }}>Status</TableHead>
                      <TableHead className="text-right" style={{ color: "#767014", fontWeight: 600 }}>
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissions.map((commission) => (
                      <TableRow key={commission.id}>
                        <TableCell style={{ color: "#000000" }}>
                          {formatDate(commission.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium" style={{ color: "#000000" }}>
                            {commission.leader?.name}
                          </div>
                        </TableCell>
                        <TableCell style={{ color: "#000000" }}>
                          #{commission.booking?.id}
                        </TableCell>
                        <TableCell style={{ color: "#000000" }}>{commission.totalSeats}</TableCell>
                        <TableCell style={{ color: "#000000" }}>{commission.commissionRate}%</TableCell>
                        <TableCell className="font-medium" style={{ color: "#000000" }}>
                          {formatCurrency(commission.commissionAmount)}
                        </TableCell>
                        <TableCell>{getStatusBadge(commission.paymentStatus)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUpdatePayment(commission)}
                            style={{ color: "#767014" }}
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Update
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {/* Leader Details Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] border-0 bg-white dark:bg-slate-900 shadow-2xl rounded-xl overflow-hidden p-0 flex flex-col" role="dialog" aria-modal="true">
          {/* Fixed Header */}
          <div className="bg-[#767014] p-4 sm:p-6 text-white flex-shrink-0">
            <DialogHeader className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <DialogTitle className="text-xl sm:text-2xl font-serif font-bold text-white flex flex-wrap items-center gap-2">
                  {selectedLeader?.name}
                  <Badge className="bg-white/30 hover:bg-white/40 text-white border-0 font-mono text-xs sm:text-sm px-2 py-0.5">
                    {selectedLeader?.promoteCode}
                  </Badge>
                </DialogTitle>
              </div>
              <DialogDescription className="text-white/90 text-sm">
                Commission Earnings & History
              </DialogDescription>
            </DialogHeader>

            {/* Summary cards intentionally removed */}
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 min-h-0" style={{ scrollbarGutter: "stable both-edges" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                Commission History
              </h3>
              <Badge variant="outline" className="text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600">
                {leaderCommissions.length} Records
              </Badge>
            </div>

            {/* Commission List */}
            {isLoadingDetails ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <Loader2 className="h-10 w-10 animate-spin text-[#767014]" />
                <p className="text-slate-500 text-sm">Loading commission data...</p>
              </div>
            ) : leaderCommissions.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700">
                <DollarSign className="h-14 w-14 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                <p className="text-slate-600 dark:text-slate-400 font-semibold mb-1">No commission records found</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm">Commission records will appear here once confirmed bookings are made.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden sm:block rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="max-h-[300px] overflow-y-auto overflow-x-hidden" style={{ scrollbarGutter: "stable both-edges" }}>
                    <Table className="min-w-[680px]">
                      <TableHeader className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Date</TableHead>
                          <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Booking</TableHead>
                          <TableHead className="font-semibold text-slate-600 dark:text-slate-300 text-center">Seats</TableHead>
                          <TableHead className="font-semibold text-slate-600 dark:text-slate-300 text-right">Amount</TableHead>
                          <TableHead className="font-semibold text-slate-600 dark:text-slate-300 text-center">Status</TableHead>
                          <TableHead className="text-right font-semibold text-slate-600 dark:text-slate-300">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leaderCommissions.map((c) => (
                          <TableRow key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                            <TableCell className="font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {formatDate(c.createdAt)}
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300">
                                #{c.booking?.id}
                              </span>
                            </TableCell>
                            <TableCell className="text-center text-slate-600 dark:text-slate-400">
                              {c.totalSeats}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="font-bold text-slate-800 dark:text-slate-200">
                                {formatCurrency(c.commissionAmount)}
                              </div>
                              <div className="text-xs text-slate-400 dark:text-slate-500">
                                {c.commissionRate}% rate
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant="outline"
                                className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap leading-none ${
                                  c.paymentStatus === "PAID"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
                                    : c.paymentStatus === "PARTIALLY_PAID"
                                    ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
                                    : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
                                }`}
                              >
                                {c.paymentStatus === "PAID" ? (
                                  <CheckCircle className="h-3 w-3" />
                                ) : (
                                  <Clock className="h-3 w-3" />
                                )}
                                {c.paymentStatus === "PAID" ? "Paid" : c.paymentStatus === "PARTIALLY_PAID" ? "Partial" : "Pending"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUpdatePayment(c)}
                                className="h-8 w-8 p-0 rounded-full hover:bg-[#767014]/10 hover:text-[#767014] text-slate-500"
                                title="Update payment status"
                              >
                                <CreditCard className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Mobile Card View */}
                <div className="sm:hidden space-y-3 max-h-[350px] overflow-y-auto pr-1" style={{ scrollbarGutter: "stable both-edges" }}>
                  {leaderCommissions.map((c) => (
                    <div
                      key={c.id}
                      className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300">
                            Booking #{c.booking?.id}
                          </span>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {formatDate(c.createdAt)}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap leading-none ${
                            c.paymentStatus === "PAID"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
                              : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
                          }`}
                        >
                          {c.paymentStatus === "PAID" ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {c.paymentStatus === "PAID" ? "Paid" : "Pending"}
                        </Badge>
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{c.totalSeats} seat(s) · {c.commissionRate}% rate</p>
                          <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{formatCurrency(c.commissionAmount)}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdatePayment(c)}
                          className="h-8 text-xs hover:bg-[#767014]/10 hover:text-[#767014] hover:border-[#767014]/30"
                        >
                          <CreditCard className="h-3.5 w-3.5 mr-1" />
                          Update
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Fixed Footer */}
          <div className="bg-slate-50 dark:bg-slate-800/80 px-4 sm:px-6 py-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
            <Button
              onClick={() => setDetailDialogOpen(false)}
              className="bg-[#767014] hover:bg-[#5a5410] text-white px-6 py-2"
            >
              Close Details
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Update Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="border-2" style={{ borderColor: "#C5BF81" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#767014" }}>Update Commission Payment</DialogTitle>
            <DialogDescription style={{ color: "#000000", opacity: 0.7 }}>
              Update payment status for this commission record.
            </DialogDescription>
          </DialogHeader>

          {selectedCommission && (
            <form onSubmit={handleSubmitPayment} className="space-y-4">
              {/* Commission Details */}
              <div className="p-3 rounded-lg" style={{ backgroundColor: "rgba(197, 191, 129, 0.2)" }}>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span style={{ color: "#767014" }}>Leader:</span>{" "}
                    <span style={{ color: "#000000" }}>{selectedCommission.leader?.name}</span>
                  </div>
                  <div>
                    <span style={{ color: "#767014" }}>Booking:</span>{" "}
                    <span style={{ color: "#000000" }}>#{selectedCommission.booking?.id}</span>
                  </div>
                  <div>
                    <span style={{ color: "#767014" }}>Seats:</span>{" "}
                    <span style={{ color: "#000000" }}>{selectedCommission.totalSeats}</span>
                  </div>
                  <div>
                    <span style={{ color: "#767014" }}>Rate:</span>{" "}
                    <span style={{ color: "#000000" }}>{selectedCommission.commissionRate}%</span>
                  </div>
                </div>
                <div className="mt-2 text-lg font-bold" style={{ color: "#767014" }}>
                  Commission Amount: {formatCurrency(selectedCommission.commissionAmount)}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="paymentStatus" style={{ color: "#767014" }}>
                  Payment Status
                </Label>
                <Select
                  value={paymentForm.paymentStatus}
                  onValueChange={(value) => setPaymentForm({ ...paymentForm, paymentStatus: value })}
                >
                  <SelectTrigger className="focus:ring-[#767014]">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
                    <SelectItem value="PAID">Paid in Full</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(paymentForm.paymentStatus === "PARTIALLY_PAID" ||
                paymentForm.paymentStatus === "PAID") && (
                <div className="grid gap-2">
                  <Label htmlFor="paidAmount" style={{ color: "#767014" }}>
                    Amount Paid (LKR)
                  </Label>
                  <Input
                    id="paidAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    max={selectedCommission.commissionAmount}
                    value={paymentForm.paidAmount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paidAmount: e.target.value })}
                    placeholder={
                      paymentForm.paymentStatus === "PAID"
                        ? selectedCommission.commissionAmount.toString()
                        : "Enter paid amount"
                    }
                    className="focus-visible:ring-[#767014]"
                  />
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="notes" style={{ color: "#767014" }}>
                  Notes (Optional)
                </Label>
                <Textarea
                  id="notes"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="Add any notes about this payment..."
                  className="focus-visible:ring-[#767014]"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPaymentDialogOpen(false)}
                  style={{ borderColor: "#C5BF81", color: "#767014" }}
                >
                  Cancel
                </Button>
                <Button type="submit" style={{ backgroundColor: "#767014", color: "#ffffff" }}>
                  Update Payment
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <AlertDialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <AlertDialogContent className="border-2" style={{ borderColor: "#C5BF81" }}>
          <AlertDialogHeader>
            <div
              className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: "linear-gradient(135deg, #767014, #C5BF81)" }}
            >
              <CheckCircle className="h-8 w-8" style={{ color: "#ffffff" }} />
            </div>
            <AlertDialogTitle className="text-center text-xl" style={{ color: "#767014" }}>
              Success!
            </AlertDialogTitle>
            <AlertDialogDescription
              className="text-center text-base"
              style={{ color: "#000000", opacity: 0.8 }}
            >
              {successMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction
              style={{ background: "linear-gradient(135deg, #767014, #C5BF81)", color: "#ffffff" }}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Ok
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Dialog */}
      <AlertDialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <AlertDialogContent className="border-2" style={{ borderColor: "#C5BF81" }}>
          <AlertDialogHeader>
            <div
              className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: "rgba(197, 191, 129, 0.3)" }}
            >
              <XCircle className="h-8 w-8" style={{ color: "#767014" }} />
            </div>
            <AlertDialogTitle className="text-center text-xl" style={{ color: "#767014" }}>
              Oops! Something went wrong
            </AlertDialogTitle>
            <AlertDialogDescription
              className="text-center text-base"
              style={{ color: "#000000", opacity: 0.8 }}
            >
              {errorMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction style={{ backgroundColor: "#767014", color: "#ffffff" }}>
              Try Again
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
