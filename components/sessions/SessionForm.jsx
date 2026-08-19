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
  programId: "",
  name: "",
  startTime: "",
  endTime: "",
  price: "",
  specialPrice: "",
};

function formatTimeForInput(value) {
  if (!value) return "";

  const dateValue = new Date(value);
  if (!Number.isNaN(dateValue.getTime())) {
    const hours = String(dateValue.getUTCHours()).padStart(2, "0");
    const minutes = String(dateValue.getUTCMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  const match = `${value}`.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    const [time] = match;
    const [h, m] = time.split(":");
    return `${String(h).padStart(2, "0")}:${m}`;
  }

  return "";
}

export default function SessionForm({
  open,
  onOpenChange = () => {},
  onSuccess,
  initialData = null,
}) {
  const [formData, setFormData] = useState(() => ({ ...DEFAULT_FORM_STATE }));
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isEditMode = useMemo(() => Boolean(initialData?.id), [initialData]);
  const DialogIcon = isEditMode ? Pencil : Plus;

  useEffect(() => {
    fetchPrograms();
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
        programId: initialData.programId ? String(initialData.programId) : "",
        name: initialData.name || "",
        startTime: formatTimeForInput(initialData.startTime),
        endTime: formatTimeForInput(initialData.endTime),
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

  async function fetchPrograms() {
    try {
      const response = await fetchWithAuth("/api/programs?isActive=true");
      const data = await response.json();
      if (response.ok) {
        setPrograms(data.programs);
      }
    } catch (err) {
      const message =
        err instanceof AuthError ? err.message : "Failed to fetch programs";
      console.error("Failed to fetch programs:", err);
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
      ? `/api/sessions/${initialData.id}`
      : "/api/sessions";

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
        setError(data.error || "Failed to save session");
        setLoading(false);
        return;
      }

      if (!isEditMode) {
        setSuccess("Session created successfully!");
        setFormData({ ...DEFAULT_FORM_STATE });
      }

      onOpenChange(false);
      onSuccess?.(data.session);
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
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: '#767014' }}>
            <DialogIcon className="h-5 w-5" />
            {isEditMode ? "Update Session" : "Create New Session"}
          </DialogTitle>
          <DialogDescription style={{ color: '#000000', opacity: 0.7 }}>
            {isEditMode
              ? "Adjust the session details and save your changes."
              : "Fill out the fields below to add a new session."}
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
            <Label htmlFor="programId" style={{ color: '#767014', fontWeight: 600 }}>
              Program <span style={{ color: '#000000' }}>*</span>
            </Label>
            <Select
              value={formData.programId}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, programId: value }))
              }
              required
            >
              <SelectTrigger id="programId">
                <SelectValue placeholder="Select a program" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((prog) => (
                  <SelectItem key={prog.id} value={String(prog.id)}>
                    {prog.title}
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
              placeholder="e.g. Morning Training"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startTime" style={{ color: '#767014', fontWeight: 600 }}>
                Start Time <span style={{ color: '#000000' }}>*</span>
              </Label>
              <Input
                id="startTime"
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime" style={{ color: '#767014', fontWeight: 600 }}>
                End Time <span style={{ color: '#000000' }}>*</span>
              </Label>
              <Input
                id="endTime"
                type="time"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="Optional"
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
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
              style={{ background: 'linear-gradient(to right, #767014, #C5BF81)', color: '#ffffff' }}
            >
              {loading
                ? isEditMode
                  ? "Updating..."
                  : "Creating..."
                : isEditMode
                ? "Save Changes"
                : "Create Session"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
