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
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { fetchWithAuth } from "@/lib/apiClient";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { usePermissions } from "@/lib/usePermissions";
import {
  Loader2,
  Plus,
  Pencil,
  CheckCircle,
  XCircle,
  Trash2,
  AlertTriangle,
  Eye,
  Lock,
  Unlock,
  UserCheck,
  Clock,
  Search,
} from "lucide-react";

export default function LeadersPage() {
  useDashboard();
  const { canWrite } = usePermissions("leaders");

  const [leaders, setLeaders] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingLeader, setEditingLeader] = React.useState(null);
  const [viewDialogOpen, setViewDialogOpen] = React.useState(false);
  const [viewingLeader, setViewingLeader] = React.useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [leaderToDelete, setLeaderToDelete] = React.useState(null);
  const [successDialogOpen, setSuccessDialogOpen] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState("");
  const [errorDialogOpen, setErrorDialogOpen] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");

  // Role filter & search (Item 14)
  const [roleFilter, setRoleFilter] = React.useState("LEADER"); // LEADER, ALL, USER
  const [searchTerm, setSearchTerm] = React.useState("");

  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    contact: "",
    role: "LEADER",
    status: "ACTIVE",
  });

  const loadLeaders = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth("/api/leaders", {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Failed to fetch travel agents");
      const { leaders: payload } = await response.json();
      setLeaders(Array.isArray(payload) ? payload : []);
    } catch (err) {
      console.error("Travel agents fetch error:", err);
      setError(err.message || "Unable to load travel agents.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadLeaders();
  }, [loadLeaders]);

  const filteredLeaders = React.useMemo(() => {
    return leaders.filter((l) => {
      // Role filter
      if (roleFilter !== "ALL" && l.role !== roleFilter) {
        return false;
      }
      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = (l.name || "").toLowerCase().includes(q);
        const matchesEmail = (l.email || "").toLowerCase().includes(q);
        const matchesCode = (l.promoteCode || "").toLowerCase().includes(q);
        const matchesContact = (l.contact || "").toLowerCase().includes(q);
        return matchesName || matchesEmail || matchesCode || matchesContact;
      }
      return true;
    });
  }, [leaders, roleFilter, searchTerm]);

  const handleEdit = (leader) => {
    setEditingLeader(leader);
    setFormData({
      name: leader.name,
      email: leader.email,
      contact: leader.contact || "",
      role: leader.role || "LEADER",
      status: leader.status || "ACTIVE",
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingLeader(null);
    setFormData({
      name: "",
      email: "",
      contact: "",
      role: "LEADER",
      status: "ACTIVE",
    });
    setIsDialogOpen(true);
  };

  const handleView = (leader) => {
    setViewingLeader(leader);
    setViewDialogOpen(true);
  };

  const handleDelete = (leader) => {
    setLeaderToDelete(leader);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!leaderToDelete) return;

    try {
      const response = await fetchWithAuth(`/api/leaders/${leaderToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete travel agent");
      }

      setSuccessMessage("Travel Agent deleted successfully.");
      setSuccessDialogOpen(true);
      setDeleteDialogOpen(false);
      loadLeaders();
    } catch (err) {
      console.error("Delete error:", err);
      setErrorMessage(err.message);
      setErrorDialogOpen(true);
      setDeleteDialogOpen(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingLeader
        ? `/api/leaders/${editingLeader.id}`
        : "/api/leaders";
      const method = editingLeader ? "PUT" : "POST";

      const response = await fetchWithAuth(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save travel agent");
      }

      setSuccessMessage(`Travel Agent ${editingLeader ? "updated" : "created"} successfully.`);
      setSuccessDialogOpen(true);
      setIsDialogOpen(false);
      loadLeaders();
    } catch (err) {
      console.error("Save error:", err);
      setErrorMessage(err.message);
      setErrorDialogOpen(true);
    }
  };

  const handleToggleStatus = async (leader) => {
    try {
      const newStatus = leader.status === "DEACTIVATED" ? "ACTIVE" : "DEACTIVATED";
      const response = await fetchWithAuth(`/api/leaders/${leader.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update status");
      }

      setSuccessMessage(`Account ${newStatus === "DEACTIVATED" ? "Locked" : "Unlocked"} successfully.`);
      setSuccessDialogOpen(true);
      loadLeaders();
    } catch (err) {
      console.error("Status update error:", err);
      setErrorMessage(err.message);
      setErrorDialogOpen(true);
    }
  };

  const handleVerifyLeader = async (leader) => {
    try {
      const response = await fetchWithAuth(`/api/leaders/${leader.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to verify agent");
      }

      setSuccessMessage(`Travel Agent "${leader.name}" has been verified and activated successfully.`);
      setSuccessDialogOpen(true);
      if (viewDialogOpen) setViewDialogOpen(false);
      loadLeaders();
    } catch (err) {
      console.error("Verification error:", err);
      setErrorMessage(err.message);
      setErrorDialogOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header (Item 12) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" style={{ color: "#1A3D1A" }}>
            Travel Agents
          </h2>
          <p style={{ color: "#000000", opacity: 0.7 }}>
            Manage registered Travel Agents, affiliate promo codes, and contact accounts.
          </p>
        </div>
        {canWrite && (
          <Button
            onClick={handleCreate}
            style={{ background: "linear-gradient(to right, #1A3D1A, #D3AE24)", color: "#ffffff" }}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Travel Agent
          </Button>
        )}
      </div>

      <Card className="border-2" style={{ borderColor: "#D3AE24" }}>
        <CardHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle style={{ color: "#1A3D1A" }}>All Travel Agents</CardTitle>
              <CardDescription style={{ color: "#000000", opacity: 0.7 }}>
                Directory of all active and pending Travel Agents and contact profiles.
              </CardDescription>
            </div>

            {/* Filter Tabs & Search Bar (Item 14) */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search name, code, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 text-xs h-8 w-[200px]"
                />
              </div>

              {/* Role filter buttons */}
              <div className="flex rounded-md border p-0.5 bg-muted/30" style={{ borderColor: "#D3AE24" }}>
                <Button
                  variant={roleFilter === "ALL" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setRoleFilter("ALL")}
                  className={`h-7 text-xs px-2.5 ${roleFilter === "ALL" ? "bg-white font-semibold text-[#1A3D1A] shadow-xs" : ""}`}
                >
                  All
                </Button>
                <Button
                  variant={roleFilter === "LEADER" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setRoleFilter("LEADER")}
                  className={`h-7 text-xs px-2.5 ${roleFilter === "LEADER" ? "bg-white font-semibold text-[#1A3D1A] shadow-xs" : ""}`}
                >
                  Travel Agents
                </Button>
                <Button
                  variant={roleFilter === "USER" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setRoleFilter("USER")}
                  className={`h-7 text-xs px-2.5 ${roleFilter === "USER" ? "bg-white font-semibold text-[#1A3D1A] shadow-xs" : ""}`}
                >
                  Standard Contacts
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#1A3D1A" }} />
            </div>
          ) : error ? (
            <div
              className="p-4 rounded-md border"
              style={{ backgroundColor: "#D3AE24", borderColor: "#1A3D1A", color: "#000000" }}
            >
              {error}
            </div>
          ) : filteredLeaders.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p>No travel agents found matching your filter.</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead style={{ color: "#1A3D1A", fontWeight: 600 }}>Name</TableHead>
                    <TableHead style={{ color: "#1A3D1A", fontWeight: 600 }}>Email</TableHead>
                    <TableHead style={{ color: "#1A3D1A", fontWeight: 600 }}>WhatsApp No</TableHead>
                    <TableHead style={{ color: "#1A3D1A", fontWeight: 600 }}>Role</TableHead>
                    <TableHead style={{ color: "#1A3D1A", fontWeight: 600 }}>Status</TableHead>
                    <TableHead style={{ color: "#1A3D1A", fontWeight: 600 }}>Promo Code</TableHead>
                    <TableHead className="text-right" style={{ color: "#1A3D1A", fontWeight: 600 }}>
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeaders.map((leader) => (
                    <TableRow key={leader.id}>
                      <TableCell className="font-medium" style={{ color: "#000000" }}>
                        {leader.name}
                      </TableCell>
                      <TableCell style={{ color: "#000000", opacity: 0.8 }}>{leader.email}</TableCell>
                      <TableCell style={{ color: "#000000", opacity: 0.8 }}>
                        {leader.contact || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className="border-0 text-xs font-semibold"
                          style={{
                            backgroundColor: leader.role === "LEADER" ? "#1A3D1A" : "#D3AE24",
                            color: leader.role === "LEADER" ? "#ffffff" : "#000000",
                          }}
                        >
                          {leader.role === "LEADER" ? "Travel Agent" : "Standard Contact"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            leader.status === "PENDING"
                              ? "border-amber-500 text-amber-700 bg-amber-50 font-semibold flex items-center gap-1.5 w-fit"
                              : leader.status === "DEACTIVATED"
                              ? "border-red-500 text-red-600 bg-red-50 w-fit"
                              : "border-[#1A3D1A] text-[#1A3D1A] bg-[#1A3D1A]/5 w-fit"
                          }
                        >
                          {leader.status === "PENDING" && <Clock className="h-3 w-3 text-amber-600" />}
                          {leader.status === "PENDING"
                            ? "Pending Verification"
                            : leader.status || "ACTIVE"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold" style={{ color: "#1A3D1A" }}>
                        {leader.promoteCode || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 items-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleView(leader)}
                            style={{ color: "#1A3D1A" }}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canWrite && (
                            <>
                              {leader.status === "PENDING" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleVerifyLeader(leader)}
                                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium border-emerald-600 flex items-center gap-1 h-8 px-2.5 shadow-sm"
                                  title="Verify & Activate Travel Agent"
                                >
                                  <UserCheck className="h-3.5 w-3.5" />
                                  Verify Agent
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(leader)}
                                style={{ color: "#1A3D1A" }}
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleStatus(leader)}
                                className={
                                  leader.status === "DEACTIVATED"
                                    ? "text-green-600 hover:text-green-700 hover:bg-green-50"
                                    : "text-orange-500 hover:text-orange-700 hover:bg-orange-50"
                                }
                                title={
                                  leader.status === "DEACTIVATED"
                                    ? "Unlock Account"
                                    : "Lock Account"
                                }
                              >
                                {leader.status === "DEACTIVATED" ? (
                                  <Unlock className="h-4 w-4" />
                                ) : (
                                  <Lock className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(leader)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog (Item 12 & 13) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="border-2" style={{ borderColor: "#D3AE24" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#1A3D1A" }}>
              {editingLeader ? "Edit Travel Agent" : "Add Travel Agent"}
            </DialogTitle>
            <DialogDescription style={{ color: "#000000", opacity: 0.7 }}>
              {editingLeader
                ? "Update travel agent details, commission role, and verification status."
                : "Create a new travel agent profile with affiliate commission and promo code."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name" style={{ color: "#1A3D1A" }}>
                Full Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g. John Silva"
                className="focus-visible:ring-[#1A3D1A]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email" style={{ color: "#1A3D1A" }}>
                Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={!!editingLeader}
                placeholder="e.g. john@example.com"
                className="focus-visible:ring-[#1A3D1A]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact" style={{ color: "#1A3D1A" }}>
                WhatsApp No
              </Label>
              <Input
                id="contact"
                value={formData.contact}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^[0-9+\-\s()]*$/.test(value)) {
                    setFormData({ ...formData, contact: value });
                  }
                }}
                placeholder="e.g. +94771234567"
                className="focus-visible:ring-[#1A3D1A]"
              />
            </div>

            {/* Account Role */}
            <div className="grid gap-2">
              <Label htmlFor="role" style={{ color: "#1A3D1A" }}>
                Account Role
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger id="role" className="w-full focus:ring-[#1A3D1A]">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LEADER">Travel Agent (Affiliate & Promo Code)</SelectItem>
                  <SelectItem value="USER">Standard Contact (No Commission)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Travel Agents are assigned promo codes and earn commissions on bookings.
              </p>
            </div>

            {/* Status */}
            <div className="grid gap-2">
              <Label htmlFor="status" style={{ color: "#1A3D1A" }}>
                Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status" className="w-full focus:ring-[#1A3D1A]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PENDING">Pending Verification</SelectItem>
                  <SelectItem value="DEACTIVATED">Deactivated (Locked)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="submit"
                style={{ backgroundColor: "#1A3D1A", color: "#ffffff" }}
              >
                {editingLeader ? "Save Changes" : "Create Travel Agent"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="border-2" style={{ borderColor: "#D3AE24" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#1A3D1A" }}>Travel Agent Details</DialogTitle>
            <DialogDescription style={{ color: "#000000", opacity: 0.7 }}>
              View full details for this registered account.
            </DialogDescription>
          </DialogHeader>
          {viewingLeader && (
            <div className="grid gap-4 py-4 text-sm">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-semibold" style={{ color: "#1A3D1A" }}>
                  Name
                </Label>
                <div className="col-span-3 font-medium">{viewingLeader.name}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-semibold" style={{ color: "#1A3D1A" }}>
                  Email
                </Label>
                <div className="col-span-3">{viewingLeader.email}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-semibold" style={{ color: "#1A3D1A" }}>
                  WhatsApp No
                </Label>
                <div className="col-span-3">{viewingLeader.contact || "-"}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-semibold" style={{ color: "#1A3D1A" }}>
                  Role
                </Label>
                <div className="col-span-3">
                  <Badge
                    className="border-0 font-semibold"
                    style={{
                      backgroundColor: viewingLeader.role === "LEADER" ? "#1A3D1A" : "#D3AE24",
                      color: viewingLeader.role === "LEADER" ? "#ffffff" : "#000000",
                    }}
                  >
                    {viewingLeader.role === "LEADER" ? "Travel Agent" : "Standard Contact"}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-semibold" style={{ color: "#1A3D1A" }}>
                  Status
                </Label>
                <div className="col-span-3">
                  <Badge
                    variant="outline"
                    className={
                      viewingLeader.status === "PENDING"
                        ? "border-amber-500 text-amber-700 bg-amber-50 font-semibold inline-flex items-center gap-1.5"
                        : viewingLeader.status === "DEACTIVATED"
                        ? "border-red-500 text-red-600 bg-red-50"
                        : "border-[#1A3D1A] text-[#1A3D1A] bg-[#1A3D1A]/5"
                    }
                  >
                    {viewingLeader.status === "PENDING" && (
                      <Clock className="h-3 w-3 text-amber-600" />
                    )}
                    {viewingLeader.status === "PENDING"
                      ? "Pending Verification"
                      : viewingLeader.status || "ACTIVE"}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-semibold" style={{ color: "#1A3D1A" }}>
                  Promo Code
                </Label>
                <div className="col-span-3 font-mono font-bold" style={{ color: "#1A3D1A" }}>
                  {viewingLeader.promoteCode || "None (Standard Contact)"}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-between items-center sm:justify-between">
            {viewingLeader && viewingLeader.status === "PENDING" ? (
              <Button
                onClick={() => handleVerifyLeader(viewingLeader)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
              >
                <UserCheck className="h-4 w-4" />
                Verify Agent Now
              </Button>
            ) : (
              <div />
            )}
            <Button
              onClick={() => setViewDialogOpen(false)}
              style={{ backgroundColor: "#1A3D1A", color: "#ffffff" }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="border-2" style={{ borderColor: "#D3AE24" }}>
          <AlertDialogHeader>
            <div
              className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: "rgba(211, 174, 36, 0.2)" }}
            >
              <AlertTriangle className="h-8 w-8" style={{ color: "#1A3D1A" }} />
            </div>
            <AlertDialogTitle className="text-center text-xl" style={{ color: "#1A3D1A" }}>
              Delete Travel Agent?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base" style={{ color: "#000000", opacity: 0.8 }}>
              Are you sure you want to delete {leaderToDelete?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-3">
            <AlertDialogCancel
              className="border-2"
              style={{ borderColor: "#D3AE24", color: "#1A3D1A" }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="border-0"
              style={{ backgroundColor: "#1A3D1A", color: "#ffffff" }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Dialog */}
      <AlertDialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <AlertDialogContent className="border-2" style={{ borderColor: "#D3AE24" }}>
          <AlertDialogHeader>
            <div
              className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: "linear-gradient(135deg, #1A3D1A, #D3AE24)" }}
            >
              <CheckCircle className="h-8 w-8" style={{ color: "#ffffff" }} />
            </div>
            <AlertDialogTitle className="text-center text-xl" style={{ color: "#1A3D1A" }}>
              Success!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base" style={{ color: "#000000", opacity: 0.8 }}>
              {successMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction
              style={{ background: "linear-gradient(135deg, #1A3D1A, #D3AE24)", color: "#ffffff" }}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Ok
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Dialog */}
      <AlertDialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <AlertDialogContent className="border-2" style={{ borderColor: "#D3AE24" }}>
          <AlertDialogHeader>
            <div
              className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: "rgba(211, 174, 36, 0.3)" }}
            >
              <XCircle className="h-8 w-8" style={{ color: "#1A3D1A" }} />
            </div>
            <AlertDialogTitle className="text-center text-xl text-red-600">
              Oops! Something went wrong
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base" style={{ color: "#000000", opacity: 0.8 }}>
              {errorMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction style={{ backgroundColor: "#1A3D1A", color: "#ffffff" }}>
              Try Again
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
