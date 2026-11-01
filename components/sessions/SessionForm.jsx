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
import { Plus, Pencil, AlertCircle, Calendar, Clock, DollarSign, Tag, Layers3, X } from "lucide-react";

const DEFAULT_FORM_STATE = {
  programId: "",
  name: "",
  startTime: "",
  endTime: "",
  price: "",
  specialPrice: "",
  sessionTypes: [],
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
  const [timeWarning, setTimeWarning] = useState("");

  const isEditMode = useMemo(() => Boolean(initialData?.id), [initialData]);
  const DialogIcon = isEditMode ? Pencil : Plus;

  useEffect(() => {
    fetchPrograms();
  }, []);

  useEffect(() => {
    if (!open) {
      setError("");
      setTimeWarning("");
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
        price: initialData.price !== undefined && initialData.price !== null ? String(initialData.price) : "",
        specialPrice: initialData.specialPrice !== undefined && initialData.specialPrice !== null ? String(initialData.specialPrice) : "",
        sessionTypes: [], // Note: Editing nested items usually requires dedicated logic, keeping it simple for now
      });
    } else {
      setFormData({ ...DEFAULT_FORM_STATE });
    }
  }, [open, isEditMode, initialData]);

  // Smart Time Validation
  useEffect(() => {
    if (formData.startTime && formData.endTime) {
      if (formData.endTime <= formData.startTime) {
        setTimeWarning("End time should be after start time");
      } else {
        setTimeWarning("");
      }
    } else {
      setTimeWarning("");
    }
  }, [formData.startTime, formData.endTime]);

  async function fetchPrograms() {
    try {
      const response = await fetchWithAuth("/api/programs?isActive=true");
      const data = await response.json();
      if (response.ok) {
        setPrograms(data.programs);
      }
    } catch (err) {
      console.error("Failed to fetch programs:", err);
      setError("Failed to load programs.");
    }
  }

  function handleProgramChange(value) {
    // Auto-fill times based on selected program
    const selectedProgram = programs.find(p => p.id === parseInt(value));
    
    setFormData((prev) => {
      const updates = { programId: value };
      
      // Only auto-fill if the user hasn't already entered times manually and we are NOT in edit mode
      if (!isEditMode && selectedProgram) {
        if (!prev.startTime && selectedProgram.startTime) {
          updates.startTime = formatTimeForInput(selectedProgram.startTime);
        }
        if (!prev.endTime && selectedProgram.endTime) {
          updates.endTime = formatTimeForInput(selectedProgram.endTime);
        }
      }
      
      return { ...prev, ...updates };
    });
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  // Session Types Array Logic
  const addSessionType = () => {
    setFormData((prev) => ({
      ...prev,
      sessionTypes: [
        ...prev.sessionTypes,
        { name: "", price: "", specialPrice: "" },
      ],
    }));
  };

  const removeSessionType = (index) => {
    setFormData((prev) => ({
      ...prev,
      sessionTypes: prev.sessionTypes.filter((_, i) => i !== index),
    }));
  };

  const updateSessionType = (index, field, value) => {
    setFormData((prev) => {
      const newSessionTypes = [...prev.sessionTypes];
      newSessionTypes[index] = { ...newSessionTypes[index], [field]: value };
      return { ...prev, sessionTypes: newSessionTypes };
    });
  };

  async function handleSubmit(event) {
    event.preventDefault();

    if (timeWarning) {
      setError("Please fix the time errors before submitting.");
      return;
    }

    setLoading(true);
    setError("");

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
      <DialogContent className="sm:max-w-[700px] bg-background border-muted/30 shadow-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-border/50 sticky top-0 bg-background z-10 pt-4">
          <DialogTitle className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <DialogIcon className="h-4 w-4" />
            </div>
            {isEditMode ? "Update Session" : "Create New Session"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground mt-1">
            {isEditMode
              ? "Adjust the session details and save your changes."
              : "Fill out the fields below to add a new session. We've auto-filled the times based on your program!"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8 pt-4 pb-4">
          {error && (
            <div className="flex items-center gap-2 bg-destructive/10 text-destructive text-sm font-medium p-3 rounded-md">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* SECTION: BASIC INFO */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" /> Basic Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="programId" className="font-semibold text-foreground">
                  Program <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.programId}
                  onValueChange={handleProgramChange}
                  required
                >
                  <SelectTrigger id="programId" className="bg-muted/30">
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

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="name" className="font-semibold text-foreground">
                  Program Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Morning Training"
                  className="bg-muted/30"
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-border/50 w-full" />

          {/* SECTION: SCHEDULE & BASE PRICING */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> Schedule & Base Pricing
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="startTime" className="font-semibold text-foreground">
                  Start Time <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="startTime"
                    type="time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleChange}
                    required
                    className="bg-muted/30"
                  />
                  <Clock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="endTime" className="font-semibold text-foreground">
                  End Time <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="endTime"
                    type="time"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleChange}
                    required
                    className={`bg-muted/30 ${timeWarning ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  />
                  <Clock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
                {timeWarning && <p className="text-xs text-destructive mt-1 font-medium">{timeWarning}</p>}
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="price" className="font-semibold text-foreground">Base Price</Label>
                <div className="relative">
                  <Input
                    id="price"
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    placeholder="Optional"
                    className="bg-muted/30 pl-9"
                  />
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="specialPrice" className="font-semibold text-foreground">Special Price</Label>
                <div className="relative">
                  <Input
                    id="specialPrice"
                    type="number"
                    name="specialPrice"
                    value={formData.specialPrice}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    placeholder="Optional"
                    className="bg-muted/30 pl-9"
                  />
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION: SESSION TYPES (Only show on create for now) */}
          {!isEditMode && (
            <>
              <div className="h-px bg-border/50 w-full" />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                    <Layers3 className="h-4 w-4 text-primary" /> Session Types (Optional)
                  </h3>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addSessionType}
                    className="h-8 shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Type
                  </Button>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Define specific ticket variations for this session (e.g., VIP, General Admission, Early Bird).
                </p>

                {formData.sessionTypes.length > 0 && (
                  <div className="space-y-3 mt-4">
                    {formData.sessionTypes.map((type, index) => (
                      <div key={index} className="flex flex-col sm:flex-row gap-3 p-4 border rounded-lg bg-muted/10 relative group">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSessionType(index)}
                          className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-white shadow-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                        
                        <div className="flex-1 space-y-1.5">
                          <Label className="text-xs font-semibold">Type Name <span className="text-destructive">*</span></Label>
                          <Input
                            placeholder="e.g. VIP Admission"
                            value={type.name}
                            onChange={(e) => updateSessionType(index, "name", e.target.value)}
                            required
                            className="bg-background h-9"
                          />
                        </div>
                        
                        <div className="w-full sm:w-32 space-y-1.5">
                          <Label className="text-xs font-semibold">Price <span className="text-destructive">*</span></Label>
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={type.price}
                              onChange={(e) => updateSessionType(index, "price", e.target.value)}
                              required
                              className="bg-background h-9 pl-7"
                            />
                            <DollarSign className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="pt-6 border-t border-border/50 flex gap-3 sticky bottom-0 bg-background pb-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 font-medium hover:bg-muted"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || Boolean(timeWarning)} 
              className="flex-1 font-medium shadow-sm"
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
