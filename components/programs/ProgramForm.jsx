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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil } from "lucide-react";

const DEFAULT_FORM_STATE = {
  title: "",
  description: "",
  startTime: "",
  endTime: "",
  locationId: "",
  seats: "",
  isActive: true,
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

export default function ProgramForm({
  open,
  onOpenChange = () => {},
  onSuccess,
  initialData = null,
}) {
  const [formData, setFormData] = useState(() => ({ ...DEFAULT_FORM_STATE }));
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isEditMode = useMemo(() => Boolean(initialData?.id), [initialData]);
  const DialogIcon = isEditMode ? Pencil : Plus;

  useEffect(() => {
    fetchLocations();
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
        title: initialData.title || "",
        description: initialData.description || "",
        startTime: formatTimeForInput(initialData.startTime),
        endTime: formatTimeForInput(initialData.endTime),
        locationId: initialData.locationId
          ? String(initialData.locationId)
          : "",
        seats:
          initialData.seats !== undefined && initialData.seats !== null
            ? String(initialData.seats)
            : "",
        isActive: Boolean(initialData.isActive),
      });
    } else {
      setFormData({ ...DEFAULT_FORM_STATE });
    }
  }, [open, isEditMode, initialData]);

  async function fetchLocations() {
    try {
      const response = await fetchWithAuth("/api/locations");
      const data = await response.json();
      if (response.ok) {
        setLocations(data.locations);
      }
    } catch (err) {
      const message =
        err instanceof AuthError ? err.message : "Failed to fetch locations";
      console.error("Failed to fetch locations:", err);
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

  function handleCheckboxChange(checked) {
    setFormData((prev) => ({
      ...prev,
      isActive: checked === true,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const endpoint = isEditMode
      ? `/api/programs/${initialData.id}`
      : "/api/programs";

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
        setError(data.error || "Failed to save program");
        setLoading(false);
        return;
      }

      if (!isEditMode) {
        setSuccess("Program created successfully!");
        setFormData({ ...DEFAULT_FORM_STATE });
      }

      onOpenChange(false);
      onSuccess?.(data.program);
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: '#767014' }}>
            <DialogIcon className="h-5 w-5" />
            {isEditMode ? "Update Program" : "Create New Program"}
          </DialogTitle>
          <DialogDescription style={{ color: '#000000', opacity: 0.7 }}>
            {isEditMode
              ? "Modify the fields below to update this program."
              : "Fill in the details below to create a new training program."}
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
            <Label htmlFor="title" style={{ color: '#767014', fontWeight: 600 }}>
              Program Title <span style={{ color: '#000000' }}>*</span>
            </Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Enter program title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" style={{ color: '#767014', fontWeight: 600 }}>Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Describe the program (optional)"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div className="space-y-2">
            <Label htmlFor="locationId" style={{ color: '#767014', fontWeight: 600 }}>
              Location <span style={{ color: '#000000' }}>*</span>
            </Label>
            <Select
              value={formData.locationId}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, locationId: value }))
              }
              required
            >
              <SelectTrigger id="locationId">
                <SelectValue placeholder="Select a location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={String(loc.id)}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="seats" style={{ color: '#767014', fontWeight: 600 }}>
                Number of Seats <span style={{ color: '#000000' }}>*</span>
              </Label>
              <Input
                id="seats"
                type="number"
                name="seats"
                value={formData.seats}
                onChange={handleChange}
                required
                min="0"
                placeholder="e.g. 20"
              />
            </div>

            <div className="flex items-center space-x-2 pt-8">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={handleCheckboxChange}
              />
              <Label htmlFor="isActive" className="text-sm font-medium" style={{ color: '#767014' }}>
                Active Program
              </Label>
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
                : "Create Program"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
