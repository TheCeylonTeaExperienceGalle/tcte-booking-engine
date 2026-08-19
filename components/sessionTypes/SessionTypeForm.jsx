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
import { Plus, Pencil } from "lucide-react";

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
  const [success, setSuccess] = useState("");

  const isEditMode = useMemo(() => Boolean(initialData?.id), [initialData]);
  const DialogIcon = isEditMode ? Pencil : Plus;

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (!open) {
      setError("");
      setSuccess("");
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
      const message =
        err instanceof AuthError ? err.message : "Failed to fetch sessions";
      console.error("Failed to fetch sessions:", err);
      setError(message);
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
    setSuccess("");

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

      if (!isEditMode) {
        setSuccess("Session type created successfully!");
        setFormData({ ...DEFAULT_FORM_STATE });
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
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: '#767014' }}>
            <DialogIcon className="h-5 w-5" />
            {isEditMode ? "Update Session Type" : "Create Session Type"}
          </DialogTitle>
          <DialogDescription style={{ color: '#000000', opacity: 0.7 }}>
            {isEditMode
              ? "Adjust the session type details to keep information up to date."
              : "Provide the session information and pricing to add a new type."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="border px-4 py-3 rounded-md" style={{ backgroundColor: '#C5BF81', borderColor: '#767014', color: '#000000' }}>
              {error}
            </div>
          )}

          {success && !isEditMode && (
            <div className="border px-4 py-3 rounded-md" style={{ backgroundColor: '#C5BF81', borderColor: '#767014', color: '#000000' }}>
              {success}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="sessionId" style={{ color: '#767014', fontWeight: 600 }}>
              Session <span style={{ color: '#000000' }}>*</span>
            </Label>
            <Select
              value={formData.sessionId}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, sessionId: value }))
              }
              required
            >
              <SelectTrigger id="sessionId">
                <SelectValue placeholder="Select a session" />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((session) => (
                  <SelectItem key={session.id} value={String(session.id)}>
                    {session.name} —{" "}
                    {session.program?.title || "Untitled program"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" style={{ color: '#767014', fontWeight: 600 }}>
              Name <span style={{ color: '#000000' }}>*</span>
            </Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g. Beginner"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price">
                Price <span className="text-destructive">*</span>
              </Label>
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialPrice">Special Price</Label>
              <Input
                id="specialPrice"
                type="number"
                name="specialPrice"
                value={formData.specialPrice}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-2"
              style={{ borderColor: '#C5BF81', color: '#000000', backgroundColor: '#ffffff' }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1" style={{ background: 'linear-gradient(to right, #767014, #C5BF81)', color: '#ffffff' }}>
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
