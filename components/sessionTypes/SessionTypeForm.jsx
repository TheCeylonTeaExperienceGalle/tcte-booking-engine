"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchWithAuth, AuthError } from "@/lib/apiClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Plus, Pencil, AlertCircle, DollarSign, Tag } from "lucide-react";

const DEFAULT_FORM_STATE = {
  sessionId: "",
  name: "",
  price: "",
  specialPrice: "",
};

export default function SessionTypeForm({
  open,
  onOpenChange = () => {},
  onSuccess,
  initialData = null,
}) {
  const [formData, setFormData] = useState(() => ({ ...DEFAULT_FORM_STATE }));
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEditMode = useMemo(() => Boolean(initialData?.id), [initialData]);
  const DialogIcon = isEditMode ? Pencil : Plus;

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (!open) {
      setError("");
      if (!isEditMode) {
        setFormData({ ...DEFAULT_FORM_STATE });
      }
      return;
    }

    if (isEditMode && initialData) {
      setFormData({
        sessionId: initialData.sessionId ? String(initialData.sessionId) : "",
        name: initialData.name || "",
        price:
          initialData.price !== undefined && initialData.price !== null
            ? String(initialData.price)
            : "",
        specialPrice:
          initialData.specialPrice !== undefined && initialData.specialPrice !== null
            ? String(initialData.specialPrice)
            : "",
      });
    } else {
      setFormData({ ...DEFAULT_FORM_STATE });
    }
  }, [open, isEditMode, initialData]);

  async function fetchSessions() {
    try {
      const response = await fetchWithAuth("/api/sessions");
      const data = await response.json();
      if (response.ok) {
        setSessions(data.sessions);
      }
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
      setError("Failed to load sessions.");
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const endpoint = isEditMode
      ? `/api/session-types/${initialData.id}`
      : "/api/session-types";

    try {
      const response = await fetchWithAuth(endpoint, {
        method: isEditMode ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to save session type");
        setLoading(false);
        return;
      }

      onOpenChange(false);
      onSuccess?.(data.sessionType);
    } catch (err) {
      if (err instanceof AuthError) {
        setError(err.message);
      } else {
        setError("Network error. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-background border-muted/30 shadow-xl">
        <DialogHeader className="pb-4 border-b border-border/50">
          <DialogTitle className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <DialogIcon className="h-4 w-4" />
            </div>
            {isEditMode ? "Update Session Type" : "Create Session Type"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground mt-1">
            {isEditMode
              ? "Adjust the pricing and details to keep information up to date."
              : "Provide the details and pricing to add a new ticket variation."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2 pb-4">
          {error && (
            <div className="flex items-center gap-2 bg-destructive/10 text-destructive text-sm font-medium p-3 rounded-md">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" /> Session Details
            </h3>

            <div className="space-y-1.5">
              <Label htmlFor="sessionId" className="font-semibold text-foreground">
                Parent Session <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.sessionId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, sessionId: value }))
                }
                required
              >
                <SelectTrigger id="sessionId" className="bg-muted/30">
                  <SelectValue placeholder="Select a session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((session) => (
                    <SelectItem key={session.id} value={String(session.id)}>
                      {session.name} — {session.program?.title || "Untitled program"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name" className="font-semibold text-foreground">
                Type Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="e.g. VIP Admission"
                className="bg-muted/30"
              />
            </div>
          </div>

          <div className="h-px bg-border/50 w-full" />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" /> Pricing
            </h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="price" className="font-semibold text-foreground">
                  Regular Price <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="price"
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    required
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="bg-muted/30 pl-9"
                  />
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="specialPrice" className="font-semibold text-foreground">
                  Special Price (Optional)
                </Label>
                <div className="relative">
                  <Input
                    id="specialPrice"
                    type="number"
                    name="specialPrice"
                    value={formData.specialPrice}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="bg-muted/30 pl-9"
                  />
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-border/50 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 font-medium hover:bg-muted"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 font-medium shadow-sm">
              {loading
                ? isEditMode
                  ? "Updating..."
                  : "Creating..."
                : isEditMode
                ? "Save Changes"
                : "Create Session Type"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
