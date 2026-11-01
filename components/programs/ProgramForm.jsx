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
import {
  Plus,
  Pencil,
  Trash2,
  Calendar,
  MapPin,
  Clock,
  Users,
  Tag,
  AlertCircle,
  Layers3,
  DollarSign,
  X,
  ChevronDown,
  CheckCircle2
} from "lucide-react";

const DEFAULT_FORM_STATE = {
  title: "",
  description: "",
  startTime: "",
  endTime: "",
  locationId: "",
  seats: "",
  price: "0",
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

function generateTimeOptions() {
  const times = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");

      const ampm = h >= 12 ? "PM" : "AM";
      const displayH = h % 12 === 0 ? 12 : h % 12;
      const displayLabel = `${displayH}:${mm} ${ampm}`;

      times.push({ value: `${hh}:${mm}`, label: displayLabel });
    }
  }
  return times;
}

const TIME_OPTIONS = generateTimeOptions();

function TimeSelect({ value, onChange, placeholder, hasError, className }) {
  const isCustomTime = Boolean(value && value !== 'custom' && !TIME_OPTIONS.some(t => t.value === value));
  const [userSelectedCustom, setUserSelectedCustom] = useState(false);
  const isCustom = isCustomTime || userSelectedCustom;

  if (isCustom) {
    return (
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            type="time"
            value={value === 'custom' ? '' : value}
            onChange={(e) => onChange(e.target.value)}
            className={`bg-background h-11 border-2 pl-10 rounded-lg text-base ${hasError ? 'border-destructive focus-visible:ring-destructive' : 'focus-visible:border-primary/50'} ${className || ''}`}
          />
          <Clock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground pointer-events-none" />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => {
            setUserSelectedCustom(false);
            onChange('');
          }}
          className="h-11 w-11 shrink-0 bg-muted/20 hover:bg-muted"
          title="Back to list"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={(val) => {
      if (val === 'custom') {
        setUserSelectedCustom(true);
        onChange('');
      } else {
        setUserSelectedCustom(false);
        onChange(val);
      }
    }}>
      <SelectTrigger className={`bg-background h-11 border-2 rounded-lg text-base ${hasError ? 'border-destructive focus:ring-destructive' : 'focus:ring-primary/20 focus:border-primary/50'} ${className || ''}`}>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
          <SelectValue placeholder={placeholder} />
        </div>
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        <SelectItem value="custom" className="font-semibold text-primary focus:bg-primary/10">
          ✨ Custom Time...
        </SelectItem>
        <div className="h-px bg-border my-1 mx-2" />
        {TIME_OPTIONS.map((time) => (
          <SelectItem key={time.value} value={time.value}>
            {time.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function ProgramForm({
  open,
  onOpenChange = () => { },
  onSuccess,
  initialData = null,
}) {
  const [formData, setFormData] = useState(() => ({ ...DEFAULT_FORM_STATE }));
  const [sessions, setSessions] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timeWarning, setTimeWarning] = useState("");
  const [expandedSessionIndex, setExpandedSessionIndex] = useState(0);

  const isEditMode = useMemo(() => Boolean(initialData?.id), [initialData]);
  const DialogIcon = isEditMode ? Pencil : Plus;

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (!open) {
      setError("");
      setTimeWarning("");
      if (!isEditMode) {
        setFormData({ ...DEFAULT_FORM_STATE });
        setSessions([]);
      }
      return;
    }

    if (isEditMode && initialData) {
      setFormData({
        title: initialData.title || "",
        description: initialData.description || "",
        startTime: formatTimeForInput(initialData.startTime),
        endTime: formatTimeForInput(initialData.endTime),
        locationId: initialData.locationId ? String(initialData.locationId) : "",
        seats: initialData.seats !== undefined && initialData.seats !== null ? String(initialData.seats) : "",
        price: initialData.price !== undefined && initialData.price !== null ? String(initialData.price) : "0",
        isActive: Boolean(initialData.isActive),
      });

      // Load sessions and session types for the program in edit mode
      async function loadProgramSessions() {
        try {
          const res = await fetchWithAuth(`/api/programs/${initialData.id}`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.program?.sessions)) {
              setSessions(
                data.program.sessions.map((s) => ({
                  id: s.id,
                  name: s.name || "",
                  startTime: formatTimeForInput(s.startTime),
                  endTime: formatTimeForInput(s.endTime),
                  price: s.price !== null && s.price !== undefined ? String(s.price) : "",
                  specialPrice: s.specialPrice !== null && s.specialPrice !== undefined ? String(s.specialPrice) : "",
                  sessionTypes: Array.isArray(s.sessionTypes)
                    ? s.sessionTypes.map((st) => ({
                        id: st.id,
                        name: st.name || "",
                        price: st.price !== null && st.price !== undefined ? String(st.price) : "",
                        specialPrice: st.specialPrice !== null && st.specialPrice !== undefined ? String(st.specialPrice) : "",
                      }))
                    : [],
                }))
              );
            }
          }
        } catch (err) {
          console.error("Failed to load program sessions:", err);
        }
      }
      loadProgramSessions();
    } else {
      setFormData({ ...DEFAULT_FORM_STATE });
      setSessions([]);
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

  async function fetchLocations() {
    try {
      const response = await fetchWithAuth("/api/locations");
      const data = await response.json();
      if (response.ok) {
        setLocations(data.locations);
      }
    } catch (err) {
      console.error("Failed to fetch locations:", err);
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

  // --- Unified Builder Logic ---

  function addSession() {
    setSessions((prev) => {
      setExpandedSessionIndex(prev.length);
      return [
        ...prev,
        { name: `Activity ${prev.length + 1}`, startTime: "", endTime: "", price: "", specialPrice: "", sessionTypes: [] }
      ];
    });
  }

  function updateSession(index, field, value) {
    setSessions((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  }

  function removeSession(index) {
    setSessions((prev) => prev.filter((_, i) => i !== index));
    if (expandedSessionIndex === index) {
      setExpandedSessionIndex(-1);
    }
  }

  function addSessionTypeToSession(sessionIndex) {
    setSessions((prev) => {
      return prev.map((session, index) => {
        if (index !== sessionIndex) return session;

        return {
          ...session,
          sessionTypes: [
            ...(session.sessionTypes || []),
            { name: "", price: "", specialPrice: "" },
          ],
        };
      });
    });
  }

  function updateSessionType(sessionIndex, typeIndex, field, value) {
    setSessions((prev) => {
      const updated = [...prev];
      updated[sessionIndex].sessionTypes[typeIndex][field] = value;
      return updated;
    });
  }

  function removeSessionType(sessionIndex, typeIndex) {
    setSessions((prev) => {
      const updated = [...prev];
      updated[sessionIndex].sessionTypes = updated[sessionIndex].sessionTypes.filter((_, i) => i !== typeIndex);
      return updated;
    });
  }

  // -----------------------------

  async function handleSubmit(event) {
    event.preventDefault();

    if (timeWarning) {
      setError("Please fix the time errors before submitting.");
      return;
    }

    if (sessions.length > 0) {
      for (let i = 0; i < sessions.length; i++) {
        const s = sessions[i];
        if (!s.startTime || !s.endTime) {
          setError(`Session "${s.name}" is missing a start or end time.`);
          return;
        }
        if (s.endTime <= s.startTime) {
          setError(`Session "${s.name}" end time must be after its start time.`);
          return;
        }
        if (s.startTime < formData.startTime) {
          setError(`Session "${s.name}" starts before the Program starts (${formData.startTime}).`);
          return;
        }
        if (s.endTime > formData.endTime) {
          setError(`Session "${s.name}" ends after the Program ends (${formData.endTime}).`);
          return;
        }
      }
    }

    setLoading(true);
    setError("");

    const endpoint = isEditMode
      ? `/api/programs/${initialData.id}`
      : "/api/programs";

    try {
      const payload = {
        ...formData,
        sessions: sessions,
      };

      const response = await fetchWithAuth(endpoint, {
        method: isEditMode ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to save program");
        setLoading(false);
        return;
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
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-background border-muted/30 shadow-xl p-0">
        <DialogHeader className="p-6 pb-4 border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur-sm z-10">
          <DialogTitle className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <DialogIcon className="h-4 w-4" />
            </div>
            {isEditMode ? "Update Program" : "Unified Program Builder"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground mt-1">
            {isEditMode
              ? "Modify the fields below to update this session."
              : "Build your entire event. Define the session details, schedule sessions, and create ticket types all from this single screen."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8 p-6 pt-2">
          {/* SECTION: BASIC INFO */}
          <div className="space-y-5">
            <h3 className="text-xl font-bold tracking-tight flex items-center gap-3">
              <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm">1</div>
              Session Details
            </h3>

            <div className="bg-card p-6 rounded-2xl border shadow-sm space-y-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary/40"></div>

              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-bold text-foreground uppercase tracking-wide">
                  Session Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Advanced Leadership Workshop"
                  className="bg-background h-12 text-lg px-4 border-2 focus-visible:border-primary/50 focus-visible:ring-primary/20 transition-all rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-bold text-foreground uppercase tracking-wide">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Describe the main objectives and schedule..."
                  className="bg-background text-base p-4 border-2 focus-visible:border-primary/50 focus-visible:ring-primary/20 transition-all rounded-xl resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-border/60">

                {/* Time Selection */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-primary" />
                    <h4 className="font-bold text-lg">Schedule</h4>
                  </div>

                  <div className="space-y-4 bg-muted/20 p-4 rounded-xl border border-border/50">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Start Time <span className="text-destructive">*</span>
                      </Label>
                      <TimeSelect
                        value={formData.startTime}
                        onChange={(val) => setFormData(prev => ({ ...prev, startTime: val }))}
                        placeholder="Select start time"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        End Time <span className="text-destructive">*</span>
                      </Label>
                      <TimeSelect
                        value={formData.endTime}
                        onChange={(val) => setFormData(prev => ({ ...prev, endTime: val }))}
                        placeholder="Select end time"
                        hasError={Boolean(timeWarning)}
                      />
                      {timeWarning && <p className="text-xs text-destructive mt-1.5 font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {timeWarning}</p>}
                    </div>
                  </div>
                </div>

                {/* Location & Capacity */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    <h4 className="font-bold text-lg">Venue & Capacity</h4>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="locationId" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Location <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={formData.locationId}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, locationId: value }))}
                        required
                      >
                        <SelectTrigger id="locationId" className="bg-background h-11 border-2 focus:ring-primary/20 rounded-lg">
                          <SelectValue placeholder="Select a location" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map((loc) => (
                            <SelectItem key={loc.id} value={String(loc.id)}>
                              <div className="flex items-center gap-2 font-medium">
                                <MapPin className="h-4 w-4 text-primary" />
                                {loc.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="seats" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Total Capacity <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="seats"
                          type="number"
                          name="seats"
                          value={formData.seats}
                          onChange={handleChange}
                          required
                          min="0"
                          placeholder="e.g. 50"
                          className="bg-background h-11 border-2 focus-visible:border-primary/50 pl-10 rounded-lg text-base"
                        />
                        <Users className="absolute left-3 top-3 h-5 w-5 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border/60">
                <label className="flex items-center gap-3 cursor-pointer w-max p-3 rounded-xl border-2 border-border hover:border-primary/30 hover:bg-primary/5 transition-all">
                  <Checkbox
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={handleCheckboxChange}
                    className="data-[state=checked]:bg-primary w-5 h-5"
                  />
                  <span className="text-sm font-bold text-foreground">
                    Session is Active (Visible to customers)
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* SECTION: SESSIONS GENERATOR */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                <div className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">2</div>
                Program Activities
              </h3>
              <Button type="button" variant="outline" size="sm" onClick={addSession} className="shadow-sm">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Activity
              </Button>
            </div>

                {sessions.length === 0 ? (
                  <div className="text-center p-8 border border-dashed rounded-xl bg-muted/5">
                    <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-sm text-muted-foreground mb-4">No programs added yet. Add a type to break this program into specific dates or times.</p>
                    <Button type="button" variant="secondary" size="sm" onClick={addSession}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add First Program
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sessions.map((session, index) => {
                      const isExpanded = expandedSessionIndex === index;
                      const isComplete = session.name && session.startTime && session.endTime;

                      return (
                        <div key={index} className="rounded-xl border border-border bg-card shadow-sm hover:border-primary/50 transition-all overflow-hidden">

                          {/* Accordion Header */}
                          <div
                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer select-none bg-card hover:bg-muted/30 gap-4"
                            onClick={() => setExpandedSessionIndex(isExpanded ? -1 : index)}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${isComplete ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary'}`}>
                                {isComplete ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                              </div>
                              <div>
                                <h4 className={`text-lg font-bold ${session.name ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {session.name || `Program`} {/* changed to program */}
                                </h4>
                                {isComplete && !isExpanded && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {session.startTime} - {session.endTime}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 z-10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeSession(index);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-1" /> Remove
                              </Button>
                              <ChevronDown className={`text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </div>

                          {/* Accordion Content */}
                          {isExpanded && (
                            <div className="p-6 border-t border-border bg-card/50">

                              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 mb-6">
                                <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Activity Name *</Label>
                                  <Input
                                    value={session.name}
                                    onChange={(e) => updateSession(index, 'name', e.target.value)}
                                    placeholder="e.g. Tea Tasting"
                                    required
                                    className="bg-white"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Start Time *</Label>
                                  <TimeSelect
                                    value={session.startTime}
                                    onChange={(val) => updateSession(index, 'startTime', val)}
                                    placeholder="Start"
                                    className="bg-white"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">End Time *</Label>
                                  <TimeSelect
                                    value={session.endTime}
                                    onChange={(val) => updateSession(index, 'endTime', val)}
                                    placeholder="End"
                                    className="bg-white"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Price (USD)</Label>
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      value={session.price ?? ""}
                                      onChange={(e) => updateSession(index, 'price', e.target.value)}
                                      min="0"
                                      step="0.01"
                                      placeholder="0.00 (Included)"
                                      className="bg-white pl-7"
                                    />
                                    <DollarSign className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Special Price (USD)</Label>
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      value={session.specialPrice ?? ""}
                                      onChange={(e) => updateSession(index, 'specialPrice', e.target.value)}
                                      min="0"
                                      step="0.01"
                                      placeholder="Optional"
                                      className="bg-white pl-7"
                                    />
                                    <DollarSign className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                                  </div>
                                </div>
                              </div>

                              {/* Nested Session Types */}
                              <div className="pt-6 border-t border-border/50">
                                <div className="flex items-center justify-between mb-4">
                                  <Label className="text-base font-bold flex items-center gap-2">
                                    <span className="w-1.5 h-4 bg-primary rounded-full inline-block"></span>
                                    Program Types
                                    <span className="text-muted-foreground font-normal text-sm ml-1">(Optional)</span>
                                  </Label>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addSessionTypeToSession(index)}
                                    className="shadow-sm"
                                  >
                                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Types
                                  </Button>
                                </div>

                                {session.sessionTypes && session.sessionTypes.length > 0 ? (
                                  <div className="space-y-3 pl-3 border-l-2 border-primary/20">
                                    {session.sessionTypes.map((type, typeIndex) => (
                                      <div key={typeIndex} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-white p-3 rounded-lg border shadow-sm relative group">
                                        <div className="flex-1 w-full space-y-1">
                                          <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Option Name</Label>
                                          <Input
                                            value={type.name}
                                            onChange={(e) => updateSessionType(index, typeIndex, 'name', e.target.value)}
                                            placeholder="e.g. Black Tea, Green Tea"
                                            required
                                            className="h-9 text-sm"
                                          />
                                        </div>
                                        <div className="w-full sm:w-32 space-y-1">
                                          <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Base Price</Label>
                                          <div className="relative">
                                            <Input
                                              type="number"
                                              min="0"
                                              step="0.01"
                                              value={type.price}
                                              onChange={(e) => updateSessionType(index, typeIndex, 'price', e.target.value)}
                                              placeholder="0.00"
                                              required
                                              className="h-9 text-sm pl-7"
                                            />
                                            <DollarSign className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                          </div>
                                        </div>
                                        <div className="w-full sm:w-32 space-y-1">
                                          <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Special Price</Label>
                                          <div className="relative">
                                            <Input
                                              type="number"
                                              min="0"
                                              step="0.01"
                                              value={type.specialPrice}
                                              onChange={(e) => updateSessionType(index, typeIndex, 'specialPrice', e.target.value)}
                                              placeholder="0.00"
                                              className="h-9 text-sm pl-7"
                                            />
                                            <DollarSign className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                          </div>
                                        </div>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="absolute right-2 top-2 sm:static sm:mt-5 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                          onClick={() => removeSessionType(index, typeIndex)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center p-6 bg-white border rounded-xl shadow-sm text-sm text-muted-foreground italic">
                                    No options configured for this session.<br />
                                    It will inherit the standard program pricing if left blank.
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
              </div>
            )}
          </div>

          <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm px-6 -mx-6 -mb-6 pt-4 pb-2 border-t border-border/50 flex flex-col gap-4 z-20">
            {error && (
              <div
                key={error}
                className="flex items-center gap-3 bg-destructive/15 text-destructive text-sm font-bold p-4 rounded-xl border border-destructive/30 shadow-md"
                style={{ animation: 'error-blink 0.4s ease-in-out 3' }}
              >
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p>{error}</p>
                <style>{`
                  @keyframes error-blink {
                    0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
                    50% { opacity: 0.7; transform: scale(1.01); box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); background-color: rgb(220 38 38 / 0.2); }
                  }
                `}</style>
              </div>
            )}
            <div className="flex gap-3">
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
                    : "Save Everything"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
