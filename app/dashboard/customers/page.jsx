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
} from "@/components/ui/dialog";
import { fetchWithAuth, AuthError } from "@/lib/apiClient";
import { useDashboard } from "../layout";

const statusVariantMap = {
  Active: "default",
  "At Risk": "destructive",
  Paused: "secondary",
  Upcoming: "secondary",
  "No Sessions": "outline",
};

const getStatusStyle = (status) => {
  if (status === "Active") {
    return { background: 'linear-gradient(to right, #767014, #C5BF81)', color: '#ffffff', border: 'none' };
  }
  if (status === "At Risk") {
    return { backgroundColor: '#000000', color: '#ffffff', border: 'none' };
  }
  return { backgroundColor: '#C5BF81', color: '#000000', border: `1px solid #767014` };
};

export default function CustomersPage() {
  useDashboard();

  const [leaders, setLeaders] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [activeLeader, setActiveLeader] = React.useState(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;

    async function loadLeaders() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchWithAuth("/api/customers", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch customer assignments");
        }

        const { leaders: payload } = await response.json();
        if (!isMounted) return;

        setLeaders(Array.isArray(payload) ? payload : []);
      } catch (err) {
        console.error("Customers fetch error:", err);
        if (!isMounted) return;
        const message =
          err instanceof AuthError
            ? err.message
            : "Unable to load customer data right now.";
        setError(message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadLeaders();

    return () => {
      isMounted = false;
    };
  }, []);

  function formatLastSession(dateString) {
    if (!dateString) return "No sessions yet";

    try {
      const parsed = new Date(dateString);
      if (Number.isNaN(parsed.getTime())) {
        return "No sessions yet";
      }

      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(parsed);
    } catch (err) {
      console.warn("Date format error", err);
      return "No sessions yet";
    }
  }

  function handleViewCustomers(leader) {
    setActiveLeader(leader);
    setIsDialogOpen(true);
  }

  function handleDialogChange(open) {
    if (!open) {
      setIsDialogOpen(false);
      setActiveLeader(null);
    }
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#767014' }}>Customer Relationships</h1>
          <p className="mt-1" style={{ color: '#000000', opacity: 0.7 }}>
            Monitor how your leaders are paired with active customers.
          </p>
        </div>
      </div>

      <Card className="shadow-sm border-2" style={{ borderColor: '#C5BF81' }}>
        <CardHeader>
          <CardTitle style={{ color: '#767014' }}>Leader to Customer Overview</CardTitle>
          <CardDescription style={{ color: '#000000', opacity: 0.7 }}>
            Snapshot of leadership assignments, engagement, and recent activity.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead style={{ color: '#767014', fontWeight: 600 }}>Leader</TableHead>
                  <TableHead className="hidden md:table-cell" style={{ color: '#767014', fontWeight: 600 }}>Title</TableHead>
                  <TableHead className="hidden lg:table-cell text-center" style={{ color: '#767014', fontWeight: 600 }}>
                    Customers
                  </TableHead>
                  <TableHead className="hidden lg:table-cell text-center" style={{ color: '#767014', fontWeight: 600 }}>
                    Sessions
                  </TableHead>
                  <TableHead style={{ color: '#767014', fontWeight: 600 }}>Status</TableHead>
                  <TableHead className="hidden lg:table-cell" style={{ color: '#767014', fontWeight: 600 }}>Last Session</TableHead>
                  <TableHead className="text-right" style={{ color: '#767014', fontWeight: 600 }}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="p-8">
                      <div className="flex justify-center">
                        <span className="text-sm" style={{ color: '#000000', opacity: 0.7 }}>
                          Loading assignments...
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && error && (
                  <TableRow>
                    <TableCell colSpan={7} className="p-8">
                      <div className="flex justify-center">
                        <span className="text-sm" style={{ color: '#000000' }}>
                          {error}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !error && leaders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="p-8">
                      <div className="flex justify-center">
                        <span className="text-sm" style={{ color: '#000000', opacity: 0.7 }}>
                          No customer assignments yet.
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !error &&
                  leaders.map((leader) => (
                    <TableRow key={leader.leaderId}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium" style={{ color: '#000000' }}>{leader.leaderName}</span>
                          <span className="text-xs md:hidden" style={{ color: '#000000', opacity: 0.6 }}>
                            {leader.leaderRole ?? "Leader"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell" style={{ color: '#000000', opacity: 0.7 }}>
                        {leader.leaderRole ?? "Leader"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-center">
                        {leader.totalCustomers}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-center">
                        {leader.totalSessions ?? 0}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={statusVariantMap[leader.status] ?? "secondary"}
                          style={getStatusStyle(leader.status)}
                        >
                          {leader.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell" style={{ color: '#000000', opacity: 0.7 }}>
                        {formatLastSession(leader.latestSessionDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewCustomers(leader)}
                          style={{ borderColor: '#767014', color: '#767014', backgroundColor: '#ffffff' }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle style={{ color: '#767014' }}>
              {activeLeader ? activeLeader.leaderName : "Leader customers"}
            </DialogTitle>
            <DialogDescription style={{ color: '#000000', opacity: 0.7 }}>
              {activeLeader
                ? `${activeLeader.totalCustomers} customers assigned to this leader.`
                : "Customers assigned to this leader."}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-2">
            <div className="space-y-4">
              {activeLeader?.customers?.length ? (
                activeLeader.customers.map((customer) => (
                  <div
                    key={customer.customerId}
                    className="rounded-lg border p-4 shadow-sm"
                    style={{ borderColor: '#C5BF81', backgroundColor: '#ffffff' }}
                  >
                    <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium" style={{ color: '#000000' }}>{customer.customerName}</p>
                        <p className="text-xs" style={{ color: '#000000', opacity: 0.6 }}>
                          {customer.customerEmail}
                        </p>
                      </div>
                      <Badge
                        variant={statusVariantMap[customer.status] ?? "secondary"}
                        style={getStatusStyle(customer.status)}
                      >
                        {customer.status}
                      </Badge>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm md:grid-cols-3" style={{ color: '#000000', opacity: 0.7 }}>
                      <span>
                        <strong style={{ color: '#767014' }}>Sessions:</strong>{" "}
                        {customer.sessionsCount ?? 0}
                      </span>
                      <span>
                        <strong style={{ color: '#767014' }}>Program:</strong>{" "}
                        {customer.programTitle ?? "–"}
                      </span>
                      <span>
                        <strong style={{ color: '#767014' }}>Last Session:</strong>{" "}
                        {formatLastSession(customer.lastSessionDate)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex justify-center py-8">
                  <span className="text-sm" style={{ color: '#000000', opacity: 0.7 }}>
                    No customers assigned yet.
                  </span>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => handleDialogChange(false)} style={{ borderColor: '#C5BF81', color: '#000000', backgroundColor: '#ffffff' }}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
