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
import { fetchWithAuth, AuthError } from "@/lib/apiClient";
import { useDashboard } from "../layout";
import { Loader2, Plus, Pencil, CheckCircle, XCircle, Trash2, AlertTriangle, Eye } from "lucide-react";

export default function LeadersPage() {
  useDashboard();

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
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    contact: "",
    role: "USER",
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
      if (!response.ok) throw new Error("Failed to fetch leaders");
      const { leaders: payload } = await response.json();
      setLeaders(Array.isArray(payload) ? payload : []);
    } catch (err) {
      console.error("Leaders fetch error:", err);
      setError(err.message || "Unable to load leaders.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadLeaders();
  }, [loadLeaders]);

  const handleEdit = (leader) => {
    setEditingLeader(leader);
    setFormData({
      name: leader.name,
      email: leader.email,
      contact: leader.contact || "",
      role: leader.role,
      status: leader.status || "ACTIVE", // Assuming API returns status, if not default to ACTIVE
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingLeader(null);
    setFormData({
      name: "",
      email: "",
      contact: "",
      role: "USER",
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
        throw new Error(errorData.error || "Failed to delete leader");
      }

      setSuccessMessage("Leader deleted successfully.");
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
        throw new Error(errorData.error || "Failed to save leader");
      }

      setSuccessMessage(`Leader ${editingLeader ? "updated" : "created"} successfully.`);
      setSuccessDialogOpen(true);
      setIsDialogOpen(false);
      loadLeaders();
    } catch (err) {
      console.error("Save error:", err);
      setErrorMessage(err.message);
      setErrorDialogOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" style={{ color: '#767014' }}>Leaders</h2>
          <p style={{ color: '#000000', opacity: 0.7 }}>
            Manage leaders, roles, and promo codes.
          </p>
        </div>
        <Button
          onClick={handleCreate}
          style={{ background: 'linear-gradient(to right, #767014, #C5BF81)', color: '#ffffff' }}
        >
          <Plus className="mr-2 h-4 w-4" /> Add Leader
        </Button>
      </div>

      <Card className="border-2" style={{ borderColor: '#C5BF81' }}>
        <CardHeader>
          <CardTitle style={{ color: '#767014' }}>All Leaders</CardTitle>
          <CardDescription style={{ color: '#000000', opacity: 0.7 }}>
            A list of all registered leaders and users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#767014' }} />
            </div>
          ) : error ? (
            <div className="p-4 rounded-md border" style={{ backgroundColor: '#C5BF81', borderColor: '#767014', color: '#000000' }}>{error}</div>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead style={{ color: '#767014', fontWeight: 600 }}>Name</TableHead>
                    <TableHead style={{ color: '#767014', fontWeight: 600 }}>Email</TableHead>
                    <TableHead style={{ color: '#767014', fontWeight: 600 }}>Role</TableHead>
                    <TableHead style={{ color: '#767014', fontWeight: 600 }}>Status</TableHead>
                    <TableHead style={{ color: '#767014', fontWeight: 600 }}>Promo Code</TableHead>
                    <TableHead className="text-right" style={{ color: '#767014', fontWeight: 600 }}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaders.map((leader) => (
                    <TableRow key={leader.id}>
                      <TableCell className="font-medium" style={{ color: '#000000' }}>{leader.name}</TableCell>
                      <TableCell style={{ color: '#000000', opacity: 0.8 }}>{leader.email}</TableCell>
                      <TableCell>
                        <Badge
                          className="border-0"
                          style={{
                            backgroundColor: leader.role === "LEADER" ? '#767014' : '#C5BF81',
                            color: leader.role === "LEADER" ? '#ffffff' : '#000000'
                          }}
                        >
                          {leader.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                         <Badge
                           variant="outline"
                           style={{
                             borderColor: leader.status === "DEACTIVATED" ? '#ef4444' : '#767014',
                             color: leader.status === "DEACTIVATED" ? '#ef4444' : '#767014'
                           }}
                         >
                          {leader.status || "ACTIVE"}
                        </Badge>
                      </TableCell>
                      <TableCell style={{ color: '#000000', opacity: 0.8 }}>{leader.promoteCode || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleView(leader)}
                            style={{ color: '#767014' }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(leader)}
                            style={{ color: '#767014' }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(leader)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="border-2" style={{ borderColor: '#C5BF81' }}>
          <DialogHeader>
            <DialogTitle style={{ color: '#767014' }}>{editingLeader ? "Edit Leader" : "Add Leader"}</DialogTitle>
            <DialogDescription style={{ color: '#000000', opacity: 0.7 }}>
              {editingLeader
                ? "Update leader details, role, and status."
                : "Create a new leader account."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name" style={{ color: '#767014' }}>Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="focus-visible:ring-[#767014]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email" style={{ color: '#767014' }}>Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={!!editingLeader} // Disable email edit for existing
                className="focus-visible:ring-[#767014]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact" style={{ color: '#767014' }}>Contact</Label>
              <Input
                id="contact"
                value={formData.contact}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^[0-9+\-\s()]*$/.test(value)) {
                    setFormData({ ...formData, contact: value });
                  }
                }}
                className="focus-visible:ring-[#767014]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="role" style={{ color: '#767014' }}>Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger className="focus:ring-[#767014]">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">User</SelectItem>
                    <SelectItem value="LEADER">Leader</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status" style={{ color: '#767014' }}>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger className="focus:ring-[#767014]">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="DEACTIVATED">Deactivated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                style={{ backgroundColor: '#767014', color: '#ffffff' }}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="border-2" style={{ borderColor: '#C5BF81' }}>
          <DialogHeader>
            <DialogTitle style={{ color: '#767014' }}>Leader Details</DialogTitle>
            <DialogDescription style={{ color: '#000000', opacity: 0.7 }}>
              View full details for this leader.
            </DialogDescription>
          </DialogHeader>
          {viewingLeader && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-semibold" style={{ color: '#767014' }}>Name</Label>
                <div className="col-span-3" style={{ color: '#000000' }}>{viewingLeader.name}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-semibold" style={{ color: '#767014' }}>Email</Label>
                <div className="col-span-3" style={{ color: '#000000' }}>{viewingLeader.email}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-semibold" style={{ color: '#767014' }}>Contact</Label>
                <div className="col-span-3" style={{ color: '#000000' }}>{viewingLeader.contact || "-"}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-semibold" style={{ color: '#767014' }}>Role</Label>
                <div className="col-span-3">
                  <Badge
                    className="border-0"
                    style={{
                      backgroundColor: viewingLeader.role === "LEADER" ? '#767014' : '#C5BF81',
                      color: viewingLeader.role === "LEADER" ? '#ffffff' : '#000000'
                    }}
                  >
                    {viewingLeader.role}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-semibold" style={{ color: '#767014' }}>Status</Label>
                <div className="col-span-3">
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: viewingLeader.status === "DEACTIVATED" ? '#ef4444' : '#767014',
                      color: viewingLeader.status === "DEACTIVATED" ? '#ef4444' : '#767014'
                    }}
                  >
                    {viewingLeader.status || "ACTIVE"}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-semibold" style={{ color: '#767014' }}>Promo Code</Label>
                <div className="col-span-3" style={{ color: '#000000' }}>{viewingLeader.promoteCode || "-"}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewDialogOpen(false)} style={{ backgroundColor: '#767014', color: '#ffffff' }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="border-2" style={{ borderColor: '#C5BF81' }}>
          <AlertDialogHeader>
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(197, 191, 129, 0.2)' }}>
              <AlertTriangle className="h-8 w-8" style={{ color: '#767014' }} />
            </div>
            <AlertDialogTitle className="text-center text-xl" style={{ color: '#767014' }}>
              Delete Leader?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base" style={{ color: '#000000', opacity: 0.8 }}>
              Are you sure you want to delete {leaderToDelete?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-3">
            <AlertDialogCancel
              className="border-2"
              style={{ borderColor: '#C5BF81', color: '#767014' }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="border-0"
              style={{ backgroundColor: '#767014', color: '#ffffff' }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Dialog */}
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
              style={{ background: 'linear-gradient(135deg, #767014, #C5BF81)', color: '#ffffff' }}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Ok
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Dialog */}
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
              style={{ backgroundColor: '#767014', color: '#ffffff' }}
            >
              Try Again
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
