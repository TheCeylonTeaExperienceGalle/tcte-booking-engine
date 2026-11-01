"use client";

import { useRef, useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FaCalendarAlt, FaChevronDown } from "react-icons/fa";
import { MapPin } from "lucide-react";
import { useBooking } from "./BookingContext";
import { isSessionPastInColombo } from "@/lib/dateUtils";

function formatSessionTime(value) {
  if (!value) return "";

  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) return value;

  const hours = String(dateValue.getUTCHours()).padStart(2, "0");
  const minutes = String(dateValue.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export default function DateProgramSelector() {
  const {
    selectedDate, setSelectedDate,
    locationsList, locationsLoading,
    selectedLocationId, setSelectedLocationId,
    programOptions, programsLoading, programsError,
    programSelections, setProgramSelections,
    totalSeatsRequested
  } = useBooking();

  const [showCalendar, setShowCalendar] = useState(false);
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const calendarRef = useRef(null);
  const locationRef = useRef(null);
  const [expandedProgramId, setExpandedProgramId] = useState(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
      if (locationRef.current && !locationRef.current.contains(event.target)) {
        setShowLocationMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLocation = locationsList?.find(
    (loc) => String(loc.id) === String(selectedLocationId)
  );
  const selectedLocationLabel = selectedLocation
    ? selectedLocation.name
    : locationsList?.length > 0
    ? "Choose Location"
    : "No Locations";

  const handleProgramToggle = (program) => {
    const id = String(program.id);
    setProgramSelections(prev => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        // Auto-select all available upcoming activities for this program
        const initialActivities = {};
        (program.sessions || []).forEach(session => {
          if (!selectedDate || !isSessionPastInColombo(selectedDate, session.startTime)) {
            initialActivities[session.id] = { selected: true, sessionTypes: {} };
          }
        });
        next[id] = { seatsRequested: 1, activities: initialActivities };
      }
      return next;
    });
  };

  const handleSeatsChange = (programId, value) => {
    const seats = Math.max(0, parseInt(value) || 0);
    setProgramSelections(prev => ({
      ...prev,
      [programId]: { ...prev[programId], seatsRequested: seats }
    }));
  };

  const handleSessionToggle = (programId, session) => {
    if (selectedDate && isSessionPastInColombo(selectedDate, session.startTime)) {
      return;
    }
    setProgramSelections(prev => {
      const prog = prev[programId] || { seatsRequested: 1, activities: {} };
      const acts = { ...prog.activities };
      if (acts[session.id]?.selected) {
        delete acts[session.id];
      } else {
        acts[session.id] = { selected: true, sessionTypes: {} };
      }
      return { ...prev, [programId]: { ...prog, activities: acts } };
    });
  };

  const formatPrice = (val) => {
    if (val == null || val === "") return "Included";
    const n = Number(val);
    if (isNaN(n) || n <= 0) return "Included";
    return `USD ${n.toLocaleString()}`;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="pb-5 border-b space-y-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-primary">Select Date & Location</h2>
          <p className="text-sm text-muted-foreground mt-1">Choose when and where you would like to visit</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Location Selector */}
          <div className="relative w-full" ref={locationRef}>
            <div
              onClick={() => {
                setShowLocationMenu(!showLocationMenu);
                setShowCalendar(false);
              }}
              className={`h-12 border-2 rounded-xl px-4 bg-card flex items-center justify-between cursor-pointer transition-all shadow-sm ${
                showLocationMenu ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <MapPin className="text-primary h-4 w-4 shrink-0" />
                <span className="font-bold text-foreground truncate text-sm">
                  {locationsLoading ? "Loading..." : selectedLocationLabel}
                </span>
              </div>
              <FaChevronDown className={`text-muted-foreground text-xs shrink-0 transition-transform duration-200 ${showLocationMenu ? "rotate-180" : ""}`} />
            </div>

            {showLocationMenu && (
              <div className="absolute z-50 mt-2 left-0 right-0 border border-border rounded-xl p-1 bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-64 overflow-y-auto">
                <div
                  onClick={() => {
                    setSelectedLocationId("");
                    setShowLocationMenu(false);
                  }}
                  className={`px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors mt-1 flex flex-col ${
                    !selectedLocationId
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "hover:bg-muted font-medium text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className={`h-3.5 w-3.5 shrink-0 ${!selectedLocationId ? "text-primary-foreground" : "text-primary"}`} />
                    <span>Choose Location</span>
                  </div>
                </div>
                {locationsList?.map((loc) => {
                  const isLocSelected = String(loc.id) === String(selectedLocationId);
                  return (
                    <div
                      key={loc.id}
                      onClick={() => {
                        setSelectedLocationId(String(loc.id));
                        setShowLocationMenu(false);
                      }}
                      className={`px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors mt-1 flex flex-col ${
                        isLocSelected
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "hover:bg-muted font-medium text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className={`h-3.5 w-3.5 shrink-0 ${isLocSelected ? "text-primary-foreground" : "text-primary"}`} />
                        <span>{loc.name}</span>
                      </div>
                      {loc.address && (
                        <span className={`text-xs ml-5 truncate ${isLocSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                          {loc.address}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Date Selector */}
          <div className="relative w-full" ref={calendarRef}>
            <div
              onClick={() => {
                setShowCalendar(!showCalendar);
                setShowLocationMenu(false);
              }}
              className={`h-12 border-2 rounded-xl px-4 bg-card flex items-center justify-between cursor-pointer transition-all shadow-sm ${
                showCalendar ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <FaCalendarAlt className="text-primary shrink-0" />
                <span className={selectedDate ? "font-bold text-foreground text-sm" : "text-muted-foreground font-medium text-sm"}>
                  {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Pick a date"}
                </span>
              </div>
              <FaChevronDown className={`text-muted-foreground text-xs shrink-0 transition-transform duration-200 ${showCalendar ? "rotate-180" : ""}`} />
            </div>
            
            {showCalendar && (
              <div className="absolute z-50 mt-2 right-0 border border-border rounded-xl p-3 bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => { setSelectedDate(date); setShowCalendar(false); }}
                  disabled={(date) => date < new Date().setHours(0, 0, 0, 0)}
                  className="rounded-md"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedDate ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-xl font-bold text-primary">Available Sessions</h3>
            {selectedLocation && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                <MapPin className="h-3 w-3" />
                {selectedLocation.name}
              </span>
            )}
          </div>
          
          {programsLoading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">Loading programs...</div>
          ) : programsError ? (
            <div className="p-4 bg-red-50 text-red-600 rounded-md">{programsError}</div>
          ) : !selectedLocation ? (
            <div className="p-8 bg-secondary/20 text-muted-foreground rounded-xl text-center space-y-2">
              <p className="font-semibold text-foreground">Choose a location</p>
              <p className="text-sm">
                Please choose a location above to view available sessions.
              </p>
            </div>
          ) : programOptions.length === 0 ? (
            <div className="p-8 bg-secondary/20 text-muted-foreground rounded-xl text-center space-y-2">
              <p className="font-semibold text-foreground">No programs available</p>
              <p className="text-sm">
                No programs found for {selectedLocationLabel} on this date.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {programOptions.filter(p => p.isActive !== false).map((program) => {
                const isSelected = !!programSelections[program.id];
                const selection = programSelections[program.id];
                const isExpanded = expandedProgramId === program.id;

                return (
                  <div key={program.id} className={`rounded-xl border shadow-sm transition-all overflow-hidden ${isSelected ? "border-primary" : "border-border hover:border-primary/50"}`}>
                    <div 
                      className={`p-4 flex items-center justify-between cursor-pointer select-none transition-colors ${isSelected ? "bg-primary/5" : "bg-card hover:bg-muted/20"}`}
                      onClick={() => setExpandedProgramId(isExpanded ? null : program.id)}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div onClick={(e) => e.stopPropagation()} className="flex items-center shrink-0">
                          <Checkbox 
                            id={`prog-${program.id}`}
                            checked={isSelected}
                            onCheckedChange={() => {
                              handleProgramToggle(program);
                              if (!isSelected) setExpandedProgramId(program.id); // Auto-expand on select
                            }}
                            className="h-5 w-5 rounded-md"
                          />
                        </div>
                        <div className="min-w-0">
                          <label className="cursor-pointer font-bold text-lg pointer-events-none block leading-tight truncate">
                            {program.title}
                          </label>
                          {program.location?.name && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary mt-1 bg-primary/10 px-2 py-0.5 rounded-md">
                              <MapPin className="h-3 w-3 text-primary shrink-0" />
                              {program.location.name}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 shrink-0">
                        {isSelected && (
                          <div className="hidden sm:flex items-center gap-2 bg-background px-3 py-1 rounded-md shadow-sm border border-primary/20" onClick={(e) => e.stopPropagation()}>
                            <Label className="text-xs uppercase tracking-wide font-semibold text-primary">Seats:</Label>
                            <Input 
                              type="number" min="1" 
                              className="w-16 h-7 text-center font-bold"
                              value={selection.seatsRequested}
                              onChange={(e) => handleSeatsChange(program.id, e.target.value)}
                            />
                          </div>
                        )}
                        <FaChevronDown className={`text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-6 border-t border-border bg-card/50">
                        {isSelected && (
                          <div className="sm:hidden flex items-center gap-2 bg-background px-3 py-2 rounded-md shadow-sm border border-primary/20 mb-4">
                            <Label className="text-xs uppercase tracking-wide font-semibold text-primary flex-1">Seats Requested:</Label>
                            <Input 
                              type="number" min="1" 
                              className="w-20 h-8 text-center font-bold"
                              value={selection.seatsRequested}
                              onChange={(e) => handleSeatsChange(program.id, e.target.value)}
                            />
                          </div>
                        )}

                        <div className="space-y-4">
                          {program.location?.name && (
                            <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md border border-border">
                              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="font-semibold text-foreground">{program.location.name}</span>
                              {program.location.address && <span>• {program.location.address}</span>}
                            </div>
                          )}

                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {program.description || "Experience the best of what we have to offer with this program."}
                          </p>

                          {isSelected && program.sessions?.length > 0 ? (
                            <div className="mt-6 pt-4 border-t border-border/50">
                              <Label className="text-base font-bold mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-4 bg-primary rounded-full inline-block"></span>
                                Select Activities
                              </Label>
                              {program.sessions.filter(session => !selectedDate || !isSessionPastInColombo(selectedDate, session.startTime)).length === 0 ? (
                                <p className="text-sm text-muted-foreground italic py-3">
                                  All activities for this program have concluded for the selected date.
                                </p>
                              ) : (
                                <div className="grid gap-3 grid-cols-1">
                                  {program.sessions
                                    .filter(session => !selectedDate || !isSessionPastInColombo(selectedDate, session.startTime))
                                    .map(session => {
                                      const isSessionSelected = !!selection?.activities[session.id]?.selected;
                                      return (
                                        <div key={session.id} className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-colors ${isSessionSelected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"}`}>
                                          <div className="flex items-center gap-4">
                                            <Checkbox 
                                              id={`sess-${session.id}`}
                                              checked={isSessionSelected}
                                              onCheckedChange={() => handleSessionToggle(program.id, session)}
                                              className="w-5 h-5"
                                            />
                                            <div>
                                              <label htmlFor={`sess-${session.id}`} className="font-bold text-base block cursor-pointer">
                                                {session.name}
                                              </label>
                                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-0.5">
                                                {formatSessionTime(session.startTime)} - {formatSessionTime(session.endTime)}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            {session.specialPrice != null && session.specialPrice !== "" && session.price != null && Number(session.specialPrice) < Number(session.price) ? (
                                              <div>
                                                <span className="text-xs text-muted-foreground line-through mr-2">
                                                  USD {Number(session.price).toLocaleString()}
                                                </span>
                                                <span className="text-lg font-bold text-primary">
                                                  USD {Number(session.specialPrice).toLocaleString()}
                                                </span>
                                              </div>
                                            ) : (
                                              <div className="text-lg font-bold text-primary">
                                                {formatPrice(session.specialPrice != null && session.specialPrice !== "" ? session.specialPrice : session.price)}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              )}
                            </div>
                          ) : !isSelected && program.sessions?.length > 0 ? (
                            <div className="mt-4 pt-4 border-t text-sm text-muted-foreground text-center italic">
                              Select this program to view and book its activities.
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 text-center bg-muted/20 border-2 border-dashed rounded-xl text-muted-foreground">
          <p className="font-semibold text-lg text-foreground mb-2">No Date Selected</p>
          <p>Please select a date from the calendar above to view available programs.</p>
        </div>
      )}
    </div>
  );
}
