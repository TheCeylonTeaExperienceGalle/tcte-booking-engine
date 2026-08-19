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
import { Checkbox } from "@/components/ui/checkbox";
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
import { useDashboard } from "../layout";
import { Loader2, Plus, Pencil, CheckCircle, XCircle, Trash2, AlertTriangle, Percent, Users } from "lucide-react";

export default function CommissionRulesPage() {
  useDashboard();

  const [rules, setRules] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingRule, setEditingRule] = React.useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [ruleToDelete, setRuleToDelete] = React.useState(null);
  const [successDialogOpen, setSuccessDialogOpen] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState("");
  const [errorDialogOpen, setErrorDialogOpen] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [formData, setFormData] = React.useState({
    minSeats: 1,
    maxSeats: "",
    commissionRate: "",
    isActive: true,
  });

  const loadRules = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth("/api/commission-rules", {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Failed to fetch commission rules");
      const { rules: payload } = await response.json();
      setRules(Array.isArray(payload) ? payload : []);
    } catch (err) {
      console.error("Commission rules fetch error:", err);
      setError(err.message || "Unable to load commission rules.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadRules();
  }, [loadRules]);

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setFormData({
      minSeats: rule.minSeats,
      maxSeats: rule.maxSeats || "",
      commissionRate: rule.commissionRate,
      isActive: rule.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingRule(null);
    setFormData({
      minSeats: 1,
      maxSeats: "",
      commissionRate: "",
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (rule) => {
    setRuleToDelete(rule);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!ruleToDelete) return;

    try {
      const response = await fetchWithAuth(`/api/commission-rules/${ruleToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete commission rule");
      }

      setSuccessMessage("Commission rule deleted successfully.");
      setSuccessDialogOpen(true);
      setDeleteDialogOpen(false);
      loadRules();
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
      const url = editingRule
        ? `/api/commission-rules/${editingRule.id}`
        : "/api/commission-rules";
      const method = editingRule ? "PUT" : "POST";

      const payload = {
        minSeats: parseInt(formData.minSeats, 10),
        maxSeats: formData.maxSeats ? parseInt(formData.maxSeats, 10) : null,
        commissionRate: parseFloat(formData.commissionRate),
        isActive: formData.isActive,
      };

      const response = await fetchWithAuth(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save commission rule");
      }

      setSuccessMessage(`Commission rule ${editingRule ? "updated" : "created"} successfully.`);
      setSuccessDialogOpen(true);
      setIsDialogOpen(false);
      loadRules();
    } catch (err) {
      console.error("Save error:", err);
      setErrorMessage(err.message);
      setErrorDialogOpen(true);
    }
  };

  const formatSeatRange = (rule) => {
    if (rule.maxSeats === null) {
      return `${rule.minSeats}+ seats`;
    }
    if (rule.minSeats === rule.maxSeats) {
      return `${rule.minSeats} seat${rule.minSeats > 1 ? 's' : ''}`;
    }
    return `${rule.minSeats} - ${rule.maxSeats} seats`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" style={{ color: '#767014' }}>Commission Rules</h2>
          <p style={{ color: '#000000', opacity: 0.7 }}>
            Define commission percentages based on seat ranges for affiliate leaders.
          </p>
        </div>
        <Button
          onClick={handleCreate}
          style={{ background: 'linear-gradient(to right, #767014, #C5BF81)', color: '#ffffff' }}
        >
          <Plus className="mr-2 h-4 w-4" /> Add Rule
        </Button>
      </div>

      {/* Info Card */}
      <Card className="border-2" style={{ borderColor: '#C5BF81', backgroundColor: 'rgba(197, 191, 129, 0.1)' }}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Percent className="h-5 w-5 mt-0.5" style={{ color: '#767014' }} />
            <div>
              <p className="font-medium" style={{ color: '#767014' }}>How Commission Rules Work</p>
              <p className="text-sm" style={{ color: '#000000', opacity: 0.7 }}>
                When a booking is made using a leader&apos;s affiliate code, the system automatically calculates
                commission based on the number of seats booked. Each rule defines a seat range and the
                corresponding commission percentage. For example, 1-5 seats = 5%, 6-10 seats = 8%, etc.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2" style={{ borderColor: '#C5BF81' }}>
        <CardHeader>
          <CardTitle style={{ color: '#767014' }}>All Commission Rules</CardTitle>
          <CardDescription style={{ color: '#000000', opacity: 0.7 }}>
            Manage commission rates for different seat ranges.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#767014' }} />
            </div>
          ) : error ? (
            <div className="p-4 rounded-md border" style={{ backgroundColor: '#C5BF81', borderColor: '#767014', color: '#000000' }}>{error}</div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4" style={{ color: '#C5BF81' }} />
              <p style={{ color: '#000000', opacity: 0.7 }}>No commission rules defined yet.</p>
              <Button
                onClick={handleCreate}
                className="mt-4"
                style={{ backgroundColor: '#767014', color: '#ffffff' }}
              >
                <Plus className="mr-2 h-4 w-4" /> Create First Rule
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead style={{ color: '#767014', fontWeight: 600 }}>Seat Range</TableHead>
                    <TableHead style={{ color: '#767014', fontWeight: 600 }}>Commission Rate</TableHead>
                    <TableHead style={{ color: '#767014', fontWeight: 600 }}>Status</TableHead>
                    <TableHead className="text-right" style={{ color: '#767014', fontWeight: 600 }}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium" style={{ color: '#000000' }}>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" style={{ color: '#767014' }} />
                          {formatSeatRange(rule)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className="border-0 text-base"
                          style={{ backgroundColor: '#767014', color: '#ffffff' }}
                        >
                          {rule.commissionRate}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: rule.isActive ? '#22c55e' : '#ef4444',
                            color: rule.isActive ? '#22c55e' : '#ef4444'
                          }}
                        >
                          {rule.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(rule)}
                            style={{ color: '#767014' }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(rule)}
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

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="border-2" style={{ borderColor: '#C5BF81' }}>
          <DialogHeader>
            <DialogTitle style={{ color: '#767014' }}>{editingRule ? "Edit Commission Rule" : "Add Commission Rule"}</DialogTitle>
            <DialogDescription style={{ color: '#000000', opacity: 0.7 }}>
              {editingRule
                ? "Update the commission rule details."
                : "Create a new commission rule for seat ranges."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="minSeats" style={{ color: '#767014' }}>Minimum Seats</Label>
                <Input
                  id="minSeats"
                  type="number"
                  min="1"
                  value={formData.minSeats}
                  onChange={(e) => setFormData({ ...formData, minSeats: e.target.value })}
                  required
                  className="focus-visible:ring-[#767014]"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="maxSeats" style={{ color: '#767014' }}>Maximum Seats</Label>
                <Input
                  id="maxSeats"
                  type="number"
                  min="1"
                  placeholder="Leave empty for unlimited"
                  value={formData.maxSeats}
                  onChange={(e) => setFormData({ ...formData, maxSeats: e.target.value })}
                  className="focus-visible:ring-[#767014]"
                />
                <p className="text-xs" style={{ color: '#000000', opacity: 0.5 }}>
                  Leave empty for &quot;and above&quot; (e.g., 10+ seats)
                </p>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="commissionRate" style={{ color: '#767014' }}>Commission Rate (%)</Label>
              <div className="relative">
                <Input
                  id="commissionRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="e.g., 10"
                  value={formData.commissionRate}
                  onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
                  required
                  className="focus-visible:ring-[#767014] pr-8"
                />
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#767014' }} />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                style={{ borderColor: '#767014' }}
              />
              <Label htmlFor="isActive" className="cursor-pointer" style={{ color: '#767014' }}>
                Active (apply this rule to new bookings)
              </Label>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                style={{ backgroundColor: '#767014', color: '#ffffff' }}
              >
                {editingRule ? "Save Changes" : "Create Rule"}
              </Button>
            </DialogFooter>
          </form>
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
              Delete Commission Rule?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base" style={{ color: '#000000', opacity: 0.8 }}>
              Are you sure you want to delete the rule for {ruleToDelete && formatSeatRange(ruleToDelete)}?
              This will not affect existing commission records.
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
