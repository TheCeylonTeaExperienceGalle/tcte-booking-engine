"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Users, Layers3, CalendarClock } from "lucide-react";

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
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle style={{ color: '#767014' }}>{program?.title || "Program Details"}</DialogTitle>
          <DialogDescription style={{ color: '#000000', opacity: 0.7 }}>
            Review the program schedule, venue, and session lineup in one place.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: '#767014' }} />
            <p className="text-sm" style={{ color: '#000000', opacity: 0.7 }}>Loading program...</p>
          </div>
        ) : error ? (
          <div className="rounded-md border px-4 py-3" style={{ borderColor: '#C5BF81', backgroundColor: '#C5BF81', color: '#000000', opacity: 0.9 }}>
            {error}
          </div>
        ) : program ? (
          <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-2">
            <section className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={program.isActive ? "default" : "secondary"}
                  style={program.isActive
                    ? { background: 'linear-gradient(to right, #767014, #C5BF81)', color: '#ffffff', border: 'none' }
                    : { backgroundColor: '#C5BF81', color: '#000000', opacity: 0.6 }
                  }
                >
                  {program.isActive ? "Active" : "Inactive"}
                </Badge>
                <Badge variant="outline" style={{ borderColor: '#767014', color: '#767014', backgroundColor: '#ffffff' }}>
                  {program.seats} seat{program.seats === 1 ? "" : "s"}
                </Badge>
                {program.location?.name && (
                  <Badge variant="outline" className="flex items-center gap-1" style={{ borderColor: '#C5BF81', color: '#767014', backgroundColor: '#ffffff' }}>
                    <MapPin className="h-3 w-3" />
                    {program.location.name}
                  </Badge>
                )}
              </div>

              {program.description && (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {program.description}
                </p>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    {formatTime(program.startTime)} —{" "}
                    {formatTime(program.endTime)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{program.seats} seats available</span>
                </div>
              </div>
            </section>

            <div className="h-px w-full bg-muted" />

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Layers3 className="h-4 w-4" style={{ color: '#767014' }} />
                <h3 className="text-base font-semibold" style={{ color: '#767014' }}>Sessions</h3>
              </div>

              {!hasSessions ? (
                <p className="rounded-md border border-dashed border-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
                  No sessions have been scheduled for this program yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {program.sessions.map((session) => (
                    <li
                      key={session.id}
                      className="rounded-lg border p-4"
                      style={{ borderColor: '#C5BF81', backgroundColor: '#ffffff' }}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium text-sm sm:text-base">
                            {session.name}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground sm:text-sm">
                            <span className="flex items-center gap-1">
                              <CalendarClock className="h-3.5 w-3.5" />
                              {formatTime(session.startTime)} —{" "}
                              {formatTime(session.endTime)}
                            </span>
                            {session.price != null && (
                              <span>
                                {currencyFormatter.format(session.price)}
                              </span>
                            )}
                            {typeof session._count?.sessionTypes ===
                              "number" && (
                              <span>
                                {session._count.sessionTypes} session type
                                {session._count.sessionTypes === 1 ? "" : "s"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {session.sessionTypes?.length ? (
                        <ul className="mt-3 space-y-2 rounded-md border border-muted/40 bg-background p-3 text-xs sm:text-sm">
                          {session.sessionTypes.map((type) => (
                            <li
                              key={type.id}
                              className="flex flex-wrap items-center justify-between gap-2"
                            >
                              <span className="font-medium text-muted-foreground">
                                {type.name}
                              </span>
                              <span>
                                {currencyFormatter.format(type.price)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Select a program to view its details.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
