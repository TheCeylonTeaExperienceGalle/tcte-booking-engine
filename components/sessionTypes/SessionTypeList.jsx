"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWithAuth, AuthError } from "@/lib/apiClient";
import SessionTypeForm from "@/components/sessionTypes/SessionTypeForm";
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
  Layers3,
  DollarSign,
  Trash2,
  Pencil,
  Plus,
  MapPin,
  Sparkles,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

export default function SessionTypeList() {
  const [sessionTypes, setSessionTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [sessionFilter, setSessionFilter] = useState("");
  const [sessions, setSessions] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSessionType, setEditingSessionType] = useState(null);

  // Alert Dialog States
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionTypeToDelete, setSessionTypeToDelete] = useState(null);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchSessions = useCallback(async () => {
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
      console.error(message);
    }
  }, []);

  const fetchSessionTypes = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
        setError("");
      }

      try {
        const url = sessionFilter
          ? `/api/session-types?sessionId=${sessionFilter}`
          : "/api/session-types";
        const response = await fetchWithAuth(url);
        const data = await response.json();

        if (response.ok) {
          setSessionTypes(data.sessionTypes);
        } else if (!silent) {
          setError(data.error || "Failed to fetch session types");
        }
      } catch (err) {
        const message =
          err instanceof AuthError
            ? err.message
            : "Network error. Please try again.";
        if (!silent) {
          setError(message);
        } else {
          console.error("Fetch session types error:", err);
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [sessionFilter]
  );

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    fetchSessionTypes();
  }, [fetchSessionTypes]);

  async function handleDelete(id) {
    const sessionType = sessionTypes.find((st) => st.id === id);
    setSessionTypeToDelete(sessionType);
    setDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    if (!sessionTypeToDelete) return;

    setDeleteLoading(sessionTypeToDelete.id);
    setDeleteDialogOpen(false);

    try {
      const response = await fetchWithAuth(`/api/session-types/${sessionTypeToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSessionTypes((prev) => prev.filter((st) => st.id !== sessionTypeToDelete.id));
        setSuccessMessage("Session type deleted successfully!");
        setSuccessDialogOpen(true);
      } else {
        const data = await response.json();
        setErrorMessage(data.error || "Failed to delete session type");
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
      setSessionTypeToDelete(null);
    }
  }

  function handleOpenCreate() {
    setEditingSessionType(null);
    setFormOpen(true);
  }

  function handleOpenEdit(sessionType) {
    setEditingSessionType(sessionType);
    setFormOpen(true);
  }

  function handleFormOpenChange(open) {
    setFormOpen(open);
    if (!open) {
      setEditingSessionType(null);
    }
  }

  function handleSessionTypeSaved() {
    setEditingSessionType(null);
    fetchSessionTypes({ silent: true });
    setSuccessMessage(editingSessionType ? "Session type updated successfully!" : "Session type created successfully!");
    setSuccessDialogOpen(true);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-t-4" style={{ borderColor: '#767014' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <Sparkles className="h-6 w-6 animate-pulse" style={{ color: '#767014' }} />
          </div>
        </div>
        <p className="text-lg font-medium" style={{ background: 'linear-gradient(to right, #767014, #C5BF81)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
          Loading session types...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-2" style={{ borderColor: '#C5BF81', background: 'linear-gradient(to bottom right, #C5BF81, #ffffff)' }}>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#C5BF81' }}>
              <span className="text-3xl">⚠️</span>
            </div>
            <p className="font-bold text-xl mb-2" style={{ color: '#767014' }}>Oops! Something went wrong</p>
            <p className="text-sm" style={{ color: '#000000' }}>{error}</p>
            <Button
              onClick={() => fetchSessionTypes()}
              className="mt-4"
              style={{ backgroundColor: '#767014', color: '#ffffff' }}
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section with Gradient */}
      <div className="relative overflow-hidden rounded-2xl p-8 shadow-xl" style={{ background: 'linear-gradient(to bottom right, #767014, #C5BF81)' }}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}></div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div style={{ color: '#ffffff' }}>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-6 w-6 animate-pulse" style={{ color: '#ffffff' }}/>
              <h2 className="text-3xl font-bold">Session Types</h2>
            </div>
            <p className="text-lg" style={{ color: '#ffffff', opacity: 0.9 }}>
              {sessionTypes.length} amazing type{sessionTypes.length !== 1 ? "s" : ""} ready for action
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select
              value={sessionFilter || "all"}
              onValueChange={(value) =>
                setSessionFilter(value === "all" ? "" : value)
              }
            >
              <SelectTrigger className="sm:w-48 backdrop-blur-sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255, 255, 255, 0.3)', color: '#ffffff' }}>
                <SelectValue placeholder="Filter by session" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sessions</SelectItem>
                {sessions.map((session) => (
                  <SelectItem key={session.id} value={String(session.id)}>
                    {session.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => fetchSessionTypes()}
              variant="outline"
              size="lg"
              disabled={loading}
              className="backdrop-blur-sm"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255, 255, 255, 0.3)', color: '#ffffff' }}
            >
              <RefreshCw className="mr-2 h-5 w-5" />
              Refresh
            </Button>
            <Button
              onClick={handleOpenCreate}
              size="lg"
              className="shadow-lg hover:shadow-xl transition-all duration-300"
              style={{ backgroundColor: '#ffffff', color: '#767014' }}
            >
              <Plus className="mr-2 h-5 w-5" />
              New Type
            </Button>
          </div>
        </div>
      </div>

      {sessionTypes.length === 0 ? (
        <Card className="border-2 border-dashed" style={{ borderColor: '#C5BF81', background: 'linear-gradient(to bottom right, #ffffff, #C5BF81)' }}>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-6" style={{ background: 'linear-gradient(to bottom right, #767014, #C5BF81)' }}>
                <Layers3 className="h-12 w-12" style={{ color: '#ffffff' }} />
              </div>
              <h3 className="text-2xl font-bold mb-3" style={{ background: 'linear-gradient(to right, #767014, #C5BF81)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                No session types yet
              </h3>
              <p className="mb-6 max-w-md mx-auto" style={{ color: '#000000', opacity: 0.7 }}>
                Create your first session type to define pricing and variations within your sessions!
              </p>
              <Button
                onClick={handleOpenCreate}
                className="shadow-lg hover:shadow-xl transition-all duration-300"
                style={{ background: 'linear-gradient(to right, #767014, #C5BF81)', color: '#ffffff' }}
                size="lg"
              >
                <Plus className="mr-2 h-5 w-5" />
                Create Your First Type
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sessionTypes.map((sessionType, index) => {
            // Different gradient colors for variety using custom palette
            const gradients = [
              'linear-gradient(to right, #767014, #C5BF81)',
              'linear-gradient(to right, #C5BF81, #767014)',
              'linear-gradient(to right, #000000, #767014)',
              'linear-gradient(to right, #767014, #000000)',
              'linear-gradient(to right, #C5BF81, #ffffff)',
              'linear-gradient(to right, #767014, #ffffff)',
            ];
            const gradient = gradients[index % gradients.length];

            return (
              <Card
                key={sessionType.id}
                className="group hover:shadow-2xl transition-all duration-300 border-2 overflow-hidden"
                style={{ borderColor: '#C5BF81' }}
              >
                {/* Colorful Header */}
                {/* <div className="h-2" style={{ background: gradient }}></div> */}

                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-3 transition-colors" style={{ color: '#000000' }}>
                        {sessionType.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 flex-wrap">
                        {sessionType.session?.name && (
                          <Badge
                            variant="secondary"
                            className="border-0 shadow-sm"
                            style={{ background: 'linear-gradient(to right, #767014, #C5BF81)', color: '#ffffff' }}
                          >
                            {sessionType.session.name}
                          </Badge>
                        )}
                        {sessionType.session?.program?.title && (
                          <Badge
                            variant="outline"
                            className="border-2"
                            style={{ borderColor: '#767014', backgroundColor: '#ffffff', color: '#767014' }}
                          >
                            {sessionType.session.program.title}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <CardDescription className="text-base" style={{ color: '#000000', opacity: 0.7 }}>
                    Pricing and context details for this session variation.
                  </CardDescription>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg border" style={{ backgroundColor: '#ffffff', borderColor: '#C5BF81' }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#767014' }}>
                        <DollarSign className="h-5 w-5" style={{ color: '#ffffff' }} />
                      </div>
                      <div className="flex flex-col">
                        {sessionType.specialPrice ? (
                          <>
                            <span className="text-xs text-muted-foreground line-through">
                              {currencyFormatter.format(sessionType.price ?? 0)}
                            </span>
                            <span className="text-sm font-bold text-red-600">
                              {currencyFormatter.format(sessionType.specialPrice)}
                            </span>
                          </>
                        ) : (
                          <span className="text-sm font-medium text-green-900">
                            {currencyFormatter.format(sessionType.price ?? 0)}
                          </span>
                        )}
                      </div>
                    </div>

                    {sessionType.session?.program?.location?.name && (
                      <div className="flex items-center gap-3 p-3 rounded-lg border" style={{ backgroundColor: '#ffffff', borderColor: '#C5BF81' }}>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#C5BF81' }}>
                          <MapPin className="h-5 w-5" style={{ color: '#000000' }} />
                        </div>
                        <span className="text-sm font-medium" style={{ color: '#000000' }}>
                          {sessionType.session.program.location.name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(sessionType)}
                      className="flex-1 border-2"
                      style={{ borderColor: '#767014', color: '#767014', backgroundColor: '#ffffff' }}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(sessionType.id)}
                      disabled={deleteLoading === sessionType.id}
                      className="border-2"
                      style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}
                    >
                      {deleteLoading === sessionType.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <SessionTypeForm
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        onSuccess={handleSessionTypeSaved}
        initialData={editingSessionType}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="border-2" style={{ borderColor: '#C5BF81' }}>
          <AlertDialogHeader>
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(197, 191, 129, 0.2)' }}>
              <AlertTriangle className="h-8 w-8" style={{ color: '#767014' }} />
            </div>
            <AlertDialogTitle className="text-center text-xl" style={{ color: '#767014' }}>
              Delete Session Type?
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-3">
            <AlertDialogCancel
              className="border-2"
              style={{ borderColor: '#C5BF81', color: '#767014' }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="border-0"
              style={{ backgroundColor: '#767014', color: '#ffffff' }}
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
        <AlertDialogContent className="border-2" style={{ borderColor: '#C5BF81' }}>
          <AlertDialogHeader>
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, #767014, #C5BF81)' }}>
              <CheckCircle className="h-8 w-8" style={{ color: '#ffffff' }} />
            </div>
            <AlertDialogTitle className="text-center text-xl" style={{ color: '#767014' }}>
              Success!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base" style={{ color: '#000000', opacity: 0.8 }}>
              {successMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction
              style={{ background: 'linear-gradient(135deg, #767014, #C5BF81)', color: '#ffffff' }}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Ok
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Dialog */}
      <AlertDialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <AlertDialogContent className="border-2" style={{ borderColor: '#C5BF81' }}>
          <AlertDialogHeader>
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(197, 191, 129, 0.3)' }}>
              <XCircle className="h-8 w-8" style={{ color: '#767014' }} />
            </div>
            <AlertDialogTitle className="text-center text-xl" style={{ color: '#767014' }}>
              Oops! Something went wrong
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base" style={{ color: '#000000', opacity: 0.8 }}>
              {errorMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction
              style={{ backgroundColor: '#767014', color: '#ffffff' }}
            >
              Try Again
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
