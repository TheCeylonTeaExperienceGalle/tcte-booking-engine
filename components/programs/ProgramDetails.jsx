"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Users, Layers3, CalendarClock, Ticket } from "lucide-react";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

function formatTime(value) {
  if (!value) return "—";
  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) {
    return value;
  }
  const hours = String(dateValue.getUTCHours()).padStart(2, "0");
  const minutes = String(dateValue.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export default function ProgramDetails({
  open,
  onOpenChange,
  program,
  loading,
  error,
}) {
  const hasSessions = Boolean(program?.sessions?.length);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-background border-muted/30 shadow-xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 bg-muted/10 border-b border-border/50">
          <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground">
            {program?.title || "Program Details"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground mt-1">
            Review the program schedule, venue, and nested session lineup.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <p className="text-sm font-medium text-muted-foreground">Loading details...</p>
          </div>
        ) : error ? (
          <div className="m-6 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-destructive font-medium text-sm">
            {error}
          </div>
        ) : program ? (
          <div className="max-h-[65vh] overflow-y-auto p-6 space-y-6">
            
            {/* Core Info Badges */}
            <section className="flex flex-wrap items-center gap-2">
              <Badge variant={program.isActive ? "default" : "secondary"} className="shadow-sm">
                {program.isActive ? "Active" : "Inactive"}
              </Badge>
              <Badge variant="outline" className="bg-background">
                <Users className="h-3 w-3 mr-1" />
                {program.seats} seat{program.seats === 1 ? "" : "s"}
              </Badge>
              {program.location?.name && (
                <Badge variant="outline" className="bg-background flex items-center">
                  <MapPin className="h-3 w-3 mr-1" />
                  {program.location.name}
                </Badge>
              )}
            </section>

            {/* Description & Timing */}
            <section className="space-y-4 bg-muted/5 rounded-xl border border-border/50 p-4">
              {program.description && (
                <p className="text-sm leading-relaxed text-muted-foreground pb-3 border-b border-border/50">
                  {program.description}
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Schedule</span>
                    <span className="text-sm font-medium text-foreground">
                      {formatTime(program.startTime)} — {formatTime(program.endTime)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Capacity</span>
                    <span className="text-sm font-medium text-foreground">
                      {program.seats} seats total
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Nested Sessions */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                <Layers3 className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Nested Sessions & Tickets</h3>
              </div>

              {!hasSessions ? (
                <p className="rounded-xl border border-dashed border-muted/50 bg-muted/5 px-4 py-8 text-center text-sm text-muted-foreground">
                  No sessions have been added to this program yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {program.sessions.map((session) => (
                    <div
                      key={session.id}
                      className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm"
                    >
                      {/* Session Header */}
                      <div className="p-4 bg-muted/20 border-b border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground leading-none">
                            {session.name}
                          </p>
                          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground font-medium">
                            <span className="flex items-center gap-1.5 bg-background border px-2 py-0.5 rounded-md">
                              <CalendarClock className="h-3 w-3" />
                              {formatTime(session.startTime)} — {formatTime(session.endTime)}
                            </span>
                            {session.price != null && (
                              <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-md border border-green-200">
                                Base: {currencyFormatter.format(session.price)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Session Types (Tickets) */}
                      {session.sessionTypes?.length > 0 ? (
                        <div className="p-4 bg-background">
                          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Ticket className="h-3.5 w-3.5" /> Ticket Types
                          </h4>
                          <div className="grid gap-2">
                            {session.sessionTypes.map((type) => (
                              <div
                                key={type.id}
                                className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg border border-border/50 bg-muted/10"
                              >
                                <span className="font-medium text-sm text-foreground">
                                  {type.name}
                                </span>
                                <div className="flex items-center gap-2 text-sm">
                                  {type.specialPrice ? (
                                    <>
                                      <span className="text-muted-foreground line-through text-xs">
                                        {currencyFormatter.format(type.price)}
                                      </span>
                                      <span className="font-bold text-green-600">
                                        {currencyFormatter.format(type.specialPrice)}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="font-semibold text-foreground">
                                      {currencyFormatter.format(type.price)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-background">
                          <p className="text-xs text-muted-foreground italic pl-1">
                            No specific ticket types. Uses base pricing.
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="p-6">
            <p className="text-sm text-muted-foreground">Select a program to view its details.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
