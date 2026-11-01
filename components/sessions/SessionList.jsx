"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWithAuth, AuthError } from "@/lib/apiClient";
import SessionForm from "@/components/sessions/SessionForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  RefreshCw,
  Clock,
  DollarSign,
  Trash2,
  Pencil,
  Plus,
  Layers3,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock3,
} from "lucide-react";

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

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

export default function SessionList() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [programFilter, setProgramFilter] = useState("");
  const [programs, setPrograms] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  
  // Alert Dialog States
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchPrograms = useCallback(async () => {
    try {
      const response = await fetchWithAuth(
        "/api/programs?includeLocation=true"
      );
      const data = await response.json();
      if (response.ok) {
        setPrograms(data.programs);
      }
    } catch (err) {
      console.error("Failed to fetch programs:", err);
    }
  }, []);

  const fetchSessions = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
        setError("");
      }

      try {
        const url = programFilter
          ? `/api/sessions?programId=${programFilter}`
          : "/api/sessions";
        const response = await fetchWithAuth(url);
        const data = await response.json();

        if (response.ok) {
          setSessions(data.sessions);
        } else if (!silent) {
          setError(data.error || "Failed to fetch sessions");
        }
      } catch (err) {
        const message =
          err instanceof AuthError
            ? err.message
            : "Network error. Please try again.";
        if (!silent) {
          setError(message);
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [programFilter]
  );

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  async function handleDelete(id) {
    const session = sessions.find((s) => s.id === id);
    setSessionToDelete(session);
    setDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    if (!sessionToDelete) return;
    
    setDeleteLoading(sessionToDelete.id);
    setDeleteDialogOpen(false);

    try {
      const response = await fetchWithAuth(`/api/sessions/${sessionToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionToDelete.id));
        setSuccessMessage("Session deleted successfully!");
        setSuccessDialogOpen(true);
      } else {
        const data = await response.json();
        setErrorMessage(data.error || "Failed to delete session");
        setErrorDialogOpen(true);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof AuthError
          ? err.message
          : "Network error. Please try again."
      );
      setErrorDialogOpen(true);
    } finally {
      setDeleteLoading(null);
      setSessionToDelete(null);
    }
  }

  function handleOpenCreate() {
    setEditingSession(null);
    setFormOpen(true);
  }

  function handleOpenEdit(session) {
    setEditingSession(session);
    setFormOpen(true);
  }

  function handleFormOpenChange(open) {
    setFormOpen(open);
    if (!open) {
      setEditingSession(null);
    }
  }

  function handleSessionSaved() {
    setEditingSession(null);
    fetchSessions({ silent: true });
    setSuccessMessage(editingSession ? "Session updated successfully!" : "Session created successfully!");
    setSuccessDialogOpen(true);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-sm font-medium text-muted-foreground">
          Loading sessions...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5 shadow-sm">
        <CardContent className="pt-6 flex flex-col items-center justify-center">
          <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
          <p className="font-semibold text-lg text-destructive mb-1">Oops! Something went wrong</p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => fetchSessions()} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Filters Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
           <Badge variant="secondary" className="px-3 py-1 font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
              {sessions.length} Session{sessions.length !== 1 ? "s" : ""}
           </Badge>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto">
          <Select
            value={programFilter || "all"}
            onValueChange={(value) =>
              setProgramFilter(value === "all" ? "" : value)
            }
          >
            <SelectTrigger className="w-full sm:w-[250px] bg-background">
              <SelectValue placeholder="Filter by program" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All programs</SelectItem>
              {programs.map((prog) => (
                <SelectItem key={prog.id} value={String(prog.id)}>
                  {prog.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={() => fetchSessions()}
              variant="outline"
              size="icon"
              disabled={loading}
              className="shrink-0 bg-background"
              title="Refresh Sessions"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button 
              onClick={handleOpenCreate} 
              className="w-full sm:w-auto shadow-sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Session
            </Button>
          </div>
        </div>
      </div>

      {sessions.length === 0 ? (
        <Card className="border-dashed shadow-sm">
          <CardContent className="pt-6 pb-12 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
              <Calendar className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No sessions found</h3>
            <p className="text-muted-foreground mb-6 max-w-sm text-center">
              {programFilter 
                ? "There are no sessions scheduled for this specific program yet." 
                : "Create your first session to start scheduling your lineup!"}
            </p>
            <Button onClick={handleOpenCreate} className="shadow-sm">
              <Plus className="mr-2 h-4 w-4" /> Create Session
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <Card
              key={session.id}
              className="group flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 border-border/50 bg-card"
            >
              <div>
                <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <CardTitle className="text-lg font-semibold leading-tight line-clamp-2">
                        {session.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 flex-wrap">
                        {session.program?.title && (
                          <Badge 
                            variant="secondary"
                            className="bg-primary/10 text-primary hover:bg-primary/20 border-0 font-medium text-xs"
                          >
                            {session.program.title}
                          </Badge>
                        )}
                        {typeof session._count?.sessionTypes === "number" && (
                          <Badge
                            variant="outline"
                            className="bg-background text-xs font-medium border-border/50 flex items-center gap-1"
                          >
                            <Layers3 className="h-3 w-3" />
                            {session._count.sessionTypes} Types
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-3">
                    {/* Time block */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                        <Clock3 className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {formatTime(session.startTime)} — {formatTime(session.endTime)}
                      </span>
                    </div>
                    
                    {/* Location Block */}
                    {session.program?.location?.name && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                          <MapPin className="h-4 w-4 text-orange-600" />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">
                          {session.program.location.name}
                        </span>
                      </div>
                    )}

                    {/* Price Block */}
                    {(session.price != null || session.specialPrice != null) && (
                      <div className="flex items-center gap-3 mt-1">
                        <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                          <DollarSign className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex items-center gap-2">
                          {session.specialPrice ? (
                            <>
                              <span className="text-sm font-bold text-green-600">
                                {currencyFormatter.format(session.specialPrice)}
                              </span>
                              <span className="text-xs text-muted-foreground line-through">
                                {currencyFormatter.format(session.price)}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm font-semibold text-foreground">
                              {currencyFormatter.format(session.price)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </div>

              {/* Action Buttons footer */}
              <div className="p-4 border-t border-border/50 bg-muted/10 flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenEdit(session)}
                  className="h-8 bg-background shadow-sm hover:bg-muted"
                >
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(session.id)}
                  disabled={deleteLoading === session.id}
                  className="h-8 bg-background shadow-sm text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  {deleteLoading === session.id ? (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <SessionForm
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        onSuccess={handleSessionSaved}
        initialData={editingSession}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">{sessionToDelete?.name}</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Dialog */}
      <AlertDialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <AlertDialogTitle>Success</AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  {successMessage}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setSuccessDialogOpen(false)}>Ok</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Dialog */}
      <AlertDialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <AlertDialogTitle>Error</AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  {errorMessage}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorDialogOpen(false)}>Dismiss</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
