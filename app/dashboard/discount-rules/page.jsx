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
import { Textarea } from "@/components/ui/textarea";
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
import { useDashboard } from "../layout";
import {
  Loader2,
  Plus,
  Pencil,
  CheckCircle,
  XCircle,
  Trash2,
  AlertTriangle,
  Percent,
  Tag,
  DollarSign,
  ListChecks,
} from "lucide-react";

export default function DiscountRulesPage() {
  useDashboard();

  const [rules, setRules] = React.useState([]);
  const [programs, setPrograms] = React.useState([]);
  const [sessions, setSessions] = React.useState([]);
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
    programId: "",
    name: "",
    description: "",
    sessionIds: [],
    discountType: "PERCENTAGE",
    discountValue: "",
    priority: 0,
    isActive: true,
  });

  // Get sessions for selected program
  const programSessions = React.useMemo(() => {
    if (!formData.programId) return [];
    return sessions.filter(
      (s) => String(s.programId) === String(formData.programId)
    );
  }, [formData.programId, sessions]);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [rulesRes, programsRes, sessionsRes] = await Promise.all([
        fetchWithAuth("/api/discount-rules", { method: "GET", cache: "no-store" }),
        fetchWithAuth("/api/programs?includeLocation=true", { method: "GET", cache: "no-store" }),
        fetchWithAuth("/api/sessions", { method: "GET", cache: "no-store" }),
      ]);

      if (!rulesRes.ok) throw new Error("Failed to fetch discount rules");
      if (!programsRes.ok) throw new Error("Failed to fetch programs");
      if (!sessionsRes.ok) throw new Error("Failed to fetch sessions");

      const [rulesData, programsData, sessionsData] = await Promise.all([
        rulesRes.json(),
        programsRes.json(),
        sessionsRes.json(),
      ]);

      setRules(Array.isArray(rulesData.rules) ? rulesData.rules : []);
      setPrograms(Array.isArray(programsData.programs) ? programsData.programs : []);
      setSessions(Array.isArray(sessionsData.sessions) ? sessionsData.sessions : []);
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

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setFormData({
      programId: String(rule.programId),
      name: rule.name,
      description: rule.description || "",
      sessionIds: rule.sessionIds.map(String),
      discountType: rule.discountType,
      discountValue: rule.discountValue,
      priority: rule.priority,
      isActive: rule.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingRule(null);
    setFormData({
      programId: "",
      name: "",
      description: "",
      sessionIds: [],
      discountType: "PERCENTAGE",
      discountValue: "",
      priority: 0,
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
      const response = await fetchWithAuth(`/api/discount-rules/${ruleToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete discount rule");
      }

      setSuccessMessage("Discount rule deleted successfully.");
      setSuccessDialogOpen(true);
      setDeleteDialogOpen(false);
      loadData();
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
        ? `/api/discount-rules/${editingRule.id}`
        : "/api/discount-rules";
      const method = editingRule ? "PUT" : "POST";

      const payload = {
        programId: parseInt(formData.programId, 10),
        name: formData.name,
        description: formData.description || null,
        sessionIds: formData.sessionIds.map((id) => parseInt(id, 10)),
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue),
        priority: parseInt(formData.priority, 10) || 0,
        isActive: formData.isActive,
      };

      const response = await fetchWithAuth(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save discount rule");
      }

      setSuccessMessage(`Discount rule ${editingRule ? "updated" : "created"} successfully.`);
      setSuccessDialogOpen(true);
      setIsDialogOpen(false);
      loadData();
    } catch (err) {
      console.error("Save error:", err);
      setErrorMessage(err.message);
      setErrorDialogOpen(true);
    }
  };

  const handleProgramChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      programId: value,
      sessionIds: [], // Reset session selections when program changes
    }));
  };

  const handleSessionToggle = (sessionId, checked) => {
    setFormData((prev) => {
      const currentIds = [...prev.sessionIds];
      if (checked) {
        if (!currentIds.includes(sessionId)) {
          currentIds.push(sessionId);
        }
      } else {
        const index = currentIds.indexOf(sessionId);
        if (index > -1) {
          currentIds.splice(index, 1);
        }
      }
      return { ...prev, sessionIds: currentIds };
    });
  };

  const selectAllSessions = () => {
    setFormData((prev) => ({
      ...prev,
      sessionIds: programSessions.map((s) => String(s.id)),
    }));
  };

  const clearAllSessions = () => {
    setFormData((prev) => ({
      ...prev,
      sessionIds: [],
    }));
  };

  const getSessionNames = (rule) => {
    if (!rule.program?.sessions) return "N/A";
    const selectedSessions = rule.program.sessions.filter((s) =>
      rule.sessionIds.includes(s.id)
    );
    if (selectedSessions.length === 0) return "N/A";
    if (selectedSessions.length === rule.program.sessions.length) {
      return "All Sessions";
    }
    return selectedSessions.map((s) => s.name).join(", ");
  };

  const formatDiscount = (rule) => {
    if (rule.discountType === "PERCENTAGE") {
      return `${rule.discountValue}%`;
    }
    return `USD. ${rule.discountValue.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" style={{ color: "#767014" }}>
            Discount Rules
          </h2>
          <p style={{ color: "#000000", opacity: 0.7 }}>
            Define discounts based on session combinations for each program.
          </p>
        </div>
        <Button
          onClick={handleCreate}
          style={{ background: "linear-gradient(to right, #767014, #C5BF81)", color: "#ffffff" }}
        >
          <Plus className="mr-2 h-4 w-4" /> Add Rule
        </Button>
      </div>

      {/* Info Card */}
      <Card className="border-2" style={{ borderColor: "#C5BF81", backgroundColor: "rgba(197, 191, 129, 0.1)" }}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Tag className="h-5 w-5 mt-0.5" style={{ color: "#767014" }} />
            <div>
              <p className="font-medium" style={{ color: "#767014" }}>How Discount Rules Work</p>
              <p className="text-sm" style={{ color: "#000000", opacity: 0.7 }}>
                Create discount rules for specific session combinations within a program. When a customer
                selects the exact sessions defined in a rule, the discount is automatically applied.
                For example: &quot;All Sessions&quot; = 0% off (full price), &quot;Any 2 Sessions&quot; = 5% off,
                &quot;Specific sessions (Plucking + Making)&quot; = 10% off. Higher priority rules are applied first.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2" style={{ borderColor: "#C5BF81" }}>
        <CardHeader>
          <CardTitle style={{ color: "#767014" }}>All Discount Rules</CardTitle>
          <CardDescription style={{ color: "#000000", opacity: 0.7 }}>
            Manage discount rules for session combinations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#767014" }} />
            </div>
          ) : error ? (
            <div
              className="p-4 rounded-md border"
              style={{ backgroundColor: "#C5BF81", borderColor: "#767014", color: "#000000" }}
            >
              {error}
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8">
              <Tag className="h-12 w-12 mx-auto mb-4" style={{ color: "#C5BF81" }} />
              <p style={{ color: "#000000", opacity: 0.7 }}>No discount rules defined yet.</p>
              <Button
                onClick={handleCreate}
                className="mt-4"
                style={{ backgroundColor: "#767014", color: "#ffffff" }}
              >
                <Plus className="mr-2 h-4 w-4" /> Create First Rule
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead style={{ color: "#767014", fontWeight: 600 }}>Program</TableHead>
                    <TableHead style={{ color: "#767014", fontWeight: 600 }}>Rule Name</TableHead>
                    <TableHead style={{ color: "#767014", fontWeight: 600 }}>Sessions</TableHead>
                    <TableHead style={{ color: "#767014", fontWeight: 600 }}>Discount</TableHead>
                    <TableHead style={{ color: "#767014", fontWeight: 600 }}>Priority</TableHead>
                    <TableHead style={{ color: "#767014", fontWeight: 600 }}>Status</TableHead>
                    <TableHead className="text-right" style={{ color: "#767014", fontWeight: 600 }}>
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium" style={{ color: "#000000" }}>
                        {rule.program?.title || "N/A"}
                      </TableCell>
                      <TableCell style={{ color: "#000000" }}>
                        <div>
                          <span className="font-medium">{rule.name}</span>
                          {rule.description && (
                            <p className="text-xs text-muted-foreground">{rule.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell style={{ color: "#000000" }}>
                        <Badge
                          variant="outline"
                          className="max-w-[200px] truncate"
                          style={{ borderColor: "#C5BF81", color: "#767014" }}
                        >
                          {getSessionNames(rule)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className="border-0 text-base"
                          style={{ backgroundColor: "#767014", color: "#ffffff" }}
                        >
                          {rule.discountType === "PERCENTAGE" ? (
                            <Percent className="h-3 w-3 mr-1" />
                          ) : (
                            <DollarSign className="h-3 w-3 mr-1" />
                          )}
                          {formatDiscount(rule)}
                        </Badge>
                      </TableCell>
                      <TableCell style={{ color: "#000000" }}>{rule.priority}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: rule.isActive ? "#22c55e" : "#ef4444",
                            color: rule.isActive ? "#22c55e" : "#ef4444",
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
                            style={{ color: "#767014" }}
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
        <DialogContent className="border-2 max-w-4xl max-h-[90vh] overflow-y-auto" style={{ borderColor: "#C5BF81" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#767014" }}>
              {editingRule ? "Edit Discount Rule" : "Add Discount Rule"}
            </DialogTitle>
            <DialogDescription style={{ color: "#000000", opacity: 0.7 }}>
              {editingRule
                ? "Update the discount rule details."
                : "Create a new discount rule for session combinations."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="programId" style={{ color: "#767014" }}>
                Program *
              </Label>
              <Select value={formData.programId} onValueChange={handleProgramChange}>
                <SelectTrigger className="focus:ring-[#767014]">
                  <SelectValue placeholder="Select a program" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((program) => (
                    <SelectItem key={program.id} value={String(program.id)}>
                      {program.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name" style={{ color: "#767014" }}>
                Rule Name *
              </Label>
              <Input
                id="name"
                placeholder="e.g., All Sessions Combo, Two Sessions Deal"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="focus-visible:ring-[#767014]"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description" style={{ color: "#767014" }}>
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Optional description for this rule"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="focus-visible:ring-[#767014]"
                rows={2}
              />
            </div>

            {formData.programId && (
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label style={{ color: "#767014" }}>
                    <ListChecks className="inline h-4 w-4 mr-1" />
                    Select Sessions *
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={selectAllSessions}
                      style={{ borderColor: "#C5BF81", color: "#767014" }}
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearAllSessions}
                      style={{ borderColor: "#C5BF81", color: "#767014" }}
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
                <Card className="border" style={{ borderColor: "#C5BF81" }}>
                  <CardContent className="p-3">
                    {programSessions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No sessions found for this program.
                      </p>
                    ) : (
                      <div className="grid gap-2">
                        {programSessions.map((session) => (
                          <div
                            key={session.id}
                            className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50"
                          >
                            <Checkbox
                              id={`session-${session.id}`}
                              checked={formData.sessionIds.includes(String(session.id))}
                              onCheckedChange={(checked) =>
                                handleSessionToggle(String(session.id), checked)
                              }
                              style={{ borderColor: "#767014" }}
                            />
                            <Label
                              htmlFor={`session-${session.id}`}
                              className="flex-1 cursor-pointer"
                              style={{ color: "#000000" }}
                            >
                              <span className="font-medium">{session.name}</span>
                              {session.price != null && (
                                <span className="text-sm text-muted-foreground ml-2">
                                  (USD. {session.price.toFixed(2)})
                                </span>
                              )}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                <p className="text-xs" style={{ color: "#000000", opacity: 0.5 }}>
                  Select the exact sessions that will trigger this discount when chosen together.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="discountType" style={{ color: "#767014" }}>
                  Discount Type
                </Label>
                <Select
                  value={formData.discountType}
                  onValueChange={(value) => setFormData({ ...formData, discountType: value })}
                >
                  <SelectTrigger className="focus:ring-[#767014]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                    <SelectItem value="FIXED_AMOUNT">Fixed Amount (USD.)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="discountValue" style={{ color: "#767014" }}>
                  Discount Value *
                </Label>
                <div className="relative">
                  <Input
                    id="discountValue"
                    type="number"
                    min="0"
                    max={formData.discountType === "PERCENTAGE" ? "100" : undefined}
                    step="0.01"
                    placeholder={formData.discountType === "PERCENTAGE" ? "e.g., 10" : "e.g., 500"}
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    required
                    className="focus-visible:ring-[#767014] pr-8"
                  />
                  {formData.discountType === "PERCENTAGE" ? (
                    <Percent
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4"
                      style={{ color: "#767014" }}
                    />
                  ) : (
                    <span
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                      style={{ color: "#767014" }}
                    >
                      USD.
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="priority" style={{ color: "#767014" }}>
                Priority
              </Label>
              <Input
                id="priority"
                type="number"
                min="0"
                placeholder="Higher priority rules are checked first"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="focus-visible:ring-[#767014]"
              />
              <p className="text-xs" style={{ color: "#000000", opacity: 0.5 }}>
                If multiple rules match, the one with higher priority is applied.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                style={{ borderColor: "#767014" }}
              />
              <Label htmlFor="isActive" className="cursor-pointer" style={{ color: "#767014" }}>
                Active (apply this rule to bookings)
              </Label>
            </div>

            <DialogFooter>
              <Button type="submit" style={{ backgroundColor: "#767014", color: "#ffffff" }}>
                {editingRule ? "Save Changes" : "Create Rule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="border-2" style={{ borderColor: "#C5BF81" }}>
          <AlertDialogHeader>
            <div
              className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: "rgba(197, 191, 129, 0.2)" }}
            >
              <AlertTriangle className="h-8 w-8" style={{ color: "#767014" }} />
            </div>
            <AlertDialogTitle className="text-center text-xl" style={{ color: "#767014" }}>
              Delete Discount Rule?
            </AlertDialogTitle>
            <AlertDialogDescription
              className="text-center text-base"
              style={{ color: "#000000", opacity: 0.8 }}
            >
              Are you sure you want to delete the rule &quot;{ruleToDelete?.name}&quot;? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-3">
            <AlertDialogCancel className="border-2" style={{ borderColor: "#C5BF81", color: "#767014" }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="border-0"
              style={{ backgroundColor: "#767014", color: "#ffffff" }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
