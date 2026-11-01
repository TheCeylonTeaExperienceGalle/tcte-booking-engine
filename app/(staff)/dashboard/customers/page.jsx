"use client";

import * as React from "react";
import { format } from "date-fns";
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
import { fetchWithAuth, AuthError } from "@/lib/apiClient";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { usePermissions } from "@/lib/usePermissions";
import {
  Loader2,
  Search,
  Users,
  Calendar,
  CreditCard,
  Eye,
  Globe,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";

export default function CustomersPage() {
  useDashboard();
  const { canRead, canWrite, isAdmin } = usePermissions("customers");

  const [customers, setCustomers] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [searchTerm, setSearchTerm] = React.useState("");

  // Selected customer for history dialog
  const [selectedCustomer, setSelectedCustomer] = React.useState(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  // Selected customer for likely duplicates inspection dialog
  const [duplicateDetailsCust, setDuplicateDetailsCust] = React.useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 10;

  const loadCustomers = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuth("/api/customers", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch customers");
      }

      const data = await response.json();
      setCustomers(Array.isArray(data.customers) ? data.customers : []);
    } catch (err) {
      console.error("Customers fetch error:", err);
      const message =
        err instanceof AuthError
          ? err.message
          : "Unable to load customer directory right now.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Client-side search filtering
  const filteredCustomers = React.useMemo(() => {
    if (!searchTerm.trim()) return customers;
    const q = searchTerm.trim().toLowerCase();

    return customers.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const email = (c.email || "").toLowerCase();
      const phone = (c.phone || "").toLowerCase();
      const nic = (c.nic || "").toLowerCase();
      const agent = (c.affiliatedAgent || "").toLowerCase();

      return (
        name.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        nic.includes(q) ||
        agent.includes(q)
      );
    });
  }, [customers, searchTerm]);

  // Reset page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Pagination slice
  const totalPages = Math.ceil(filteredCustomers.length / pageSize) || 1;
  const paginatedCustomers = React.useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(startIdx, startIdx + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  const handleViewCustomer = (customer) => {
    setSelectedCustomer(customer);
    setIsDialogOpen(true);
  };

  if (!canRead && !isAdmin) {
    return (
      <div className="p-8">
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" /> Access Restricted
            </CardTitle>
            <CardDescription className="text-red-600">
              You do not have permission to view the Customer Directory. Please contact your system administrator.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" style={{ color: "#767014" }}>
            Customers
          </h2>
          <p style={{ color: "#000000", opacity: 0.7 }}>
            Directory of all registered guests and customers saved across online and admin bookings.
          </p>
        </div>
      </div>

      <Card className="border-2" style={{ borderColor: "#C5BF81" }}>
        <CardHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle style={{ color: "#767014" }}>Customer Directory</CardTitle>
              <CardDescription style={{ color: "#000000", opacity: 0.7 }}>
                De-duplicated guest profiles, WhatsApp contacts, ID/Passport numbers, and booking history.
              </CardDescription>
            </div>

            {/* Search Bar */}
            <div className="relative w-full sm:w-[320px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, WhatsApp, email, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#767014" }} />
            </div>
          ) : error ? (
            <div
              className="p-4 rounded-md border"
              style={{ backgroundColor: "#C5BF81", borderColor: "#767014", color: "#000000" }}
            >
              {error}
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground space-y-2">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/60" />
              <p className="font-medium text-base">No customers found</p>
              <p className="text-xs">
                {searchTerm
                  ? "No customer records match your search filter."
                  : "Saved customers from confirmed bookings will appear here."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <ScrollArea className="h-[550px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead style={{ color: "#767014", fontWeight: 600 }}>Name</TableHead>
                      <TableHead style={{ color: "#767014", fontWeight: 600 }}>WhatsApp No</TableHead>
                      <TableHead style={{ color: "#767014", fontWeight: 600 }}>Email</TableHead>
                      <TableHead style={{ color: "#767014", fontWeight: 600 }}>ID / Passport</TableHead>
                      <TableHead style={{ color: "#767014", fontWeight: 600 }}>Bookings</TableHead>
                      <TableHead style={{ color: "#767014", fontWeight: 600 }}>Last Booking Date</TableHead>
                      <TableHead style={{ color: "#767014", fontWeight: 600 }}>Travel Agent</TableHead>
                      <TableHead className="text-right" style={{ color: "#767014", fontWeight: 600 }}>
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCustomers.map((cust) => (
                      <TableRow key={cust.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium" style={{ color: "#000000" }}>
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold">{cust.name}</span>
                            {cust.likelyDuplicates && cust.likelyDuplicates.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setDuplicateDetailsCust(cust)}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded px-1.5 py-0.5 w-fit text-left cursor-pointer transition-colors"
                                title="Click to view likely duplicate details"
                              >
                                <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                                <span>Possible Duplicate ({cust.likelyDuplicates.length})</span>
                              </button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell style={{ color: "#000000", opacity: 0.85 }}>
                          {cust.phone ? (
                            <span className="font-mono text-xs">{cust.phone}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell style={{ color: "#000000", opacity: 0.85 }}>
                          <span className="text-xs">{cust.email}</span>
                        </TableCell>
                        <TableCell style={{ color: "#000000", opacity: 0.85 }}>
                          {cust.nic && cust.nic !== "AGENT" ? (
                            <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded border">
                              {cust.nic}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className="text-xs font-semibold"
                            style={{
                              backgroundColor: cust.bookingsCount > 1 ? "#767014" : "#C5BF81",
                              color: cust.bookingsCount > 1 ? "#ffffff" : "#000000",
                            }}
                          >
                            {cust.bookingsCount} booking{cust.bookingsCount !== 1 ? "s" : ""}
                          </Badge>
                        </TableCell>
                        <TableCell style={{ color: "#000000", opacity: 0.85 }}>
                          {cust.lastBookingDate ? (
                            <span className="text-xs">
                              {format(new Date(cust.lastBookingDate), "dd MMM yyyy")}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {cust.affiliatedAgent ? (
                            <span className="text-xs font-medium text-[#767014]">
                              {cust.affiliatedAgent}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Direct</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewCustomer(cust)}
                            className="h-8 gap-1 text-xs"
                            style={{ color: "#767014" }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            History
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between pt-3 border-t px-2 text-xs">
                <div className="text-muted-foreground">
                  Showing {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(currentPage * pageSize, filteredCustomers.length)} of{" "}
                  {filteredCustomers.length} customers
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-7 text-xs"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                    Previous
                  </Button>
                  <span className="font-medium px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-7 text-xs"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Booking History Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="border-2 max-w-2xl" style={{ borderColor: "#C5BF81" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#767014" }} className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span>Customer Booking History</span>
            </DialogTitle>
            <DialogDescription>
              Complete history of reservations made by or for this guest.
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-4 py-2">
              {/* Customer Profile Summary */}
              <div
                className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg border text-xs bg-muted/20"
                style={{ borderColor: "#C5BF81" }}
              >
                <div>
                  <span className="text-muted-foreground block">Customer Name</span>
                  <span className="font-semibold text-foreground">{selectedCustomer.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">WhatsApp No</span>
                  <span className="font-semibold text-foreground font-mono">
                    {selectedCustomer.phone || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Email</span>
                  <span className="font-semibold text-foreground break-all">
                    {selectedCustomer.email}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">ID / Passport</span>
                  <span className="font-semibold text-foreground font-mono">
                    {selectedCustomer.nic || "—"}
                  </span>
                </div>
              </div>

              {/* Bookings List */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#767014]">
                  Associated Bookings ({selectedCustomer.bookingHistory?.length || 0})
                </h4>

                <ScrollArea className="max-h-[300px] rounded-md border p-2">
                  {selectedCustomer.bookingHistory?.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No booking details recorded.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedCustomer.bookingHistory?.map((bh, idx) => (
                        <div
                          key={`bh-${bh.bookingId}-${idx}`}
                          className="p-3 rounded border bg-card space-y-1.5 text-xs shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#767014] font-mono">
                                {bh.orderId}
                              </span>
                              <Badge
                                variant="outline"
                                className={
                                  bh.source === "ADMIN"
                                    ? "bg-purple-50 text-purple-700 border-purple-200 text-[10px]"
                                    : "bg-sky-50 text-sky-700 border-sky-200 text-[10px]"
                                }
                              >
                                {bh.source === "ADMIN" ? (
                                  <>
                                    <ShieldCheck className="h-3 w-3 mr-0.5 text-purple-600" /> Admin
                                  </>
                                ) : (
                                  <>
                                    <Globe className="h-3 w-3 mr-0.5 text-sky-600" /> Online
                                  </>
                                )}
                              </Badge>
                            </div>
                            <span className="font-bold text-foreground">
                              {new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: "USD",
                              }).format(bh.amount || 0)}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center justify-between text-muted-foreground gap-2 pt-1 border-t">
                            <span className="font-medium text-foreground">
                              {bh.programTitle} {bh.sessionName ? `— ${bh.sessionName}` : ""}
                            </span>
                            <span>
                              {bh.date ? format(new Date(bh.date), "dd MMM yyyy") : "—"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={() => setIsDialogOpen(false)}
              style={{ backgroundColor: "#767014", color: "#ffffff" }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Likely Duplicates Details Dialog */}
      <Dialog
        open={Boolean(duplicateDetailsCust)}
        onOpenChange={(open) => {
          if (!open) setDuplicateDetailsCust(null);
        }}
      >
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Possible Duplicate Customer Records
            </DialogTitle>
            <DialogDescription>
              The following customer profiles share an email or phone number with{" "}
              <strong>{duplicateDetailsCust?.name}</strong>, but have different names or IDs and have{" "}
              <strong>not</strong> been merged automatically:
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 max-h-[50vh] pr-2">
            <div className="space-y-3 py-2">
              {duplicateDetailsCust?.likelyDuplicates?.map((dup, idx) => (
                <div key={idx} className="p-3 rounded-lg border bg-amber-50/50 border-amber-200 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-semibold text-sm text-foreground">
                    <span>{dup.name}</span>
                    <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300 text-[11px]">
                      {dup.reason}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground pt-1 border-t border-amber-200/50">
                    <div>
                      <span className="font-medium text-foreground">Email:</span> {dup.email || "—"}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Phone:</span> {dup.phone || "—"}
                    </div>
                    <div className="sm:col-span-2">
                      <span className="font-medium text-foreground">ID/Passport:</span> {dup.nic || "—"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDuplicateDetailsCust(null)}
              className="text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
