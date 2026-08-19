"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth, AuthError } from "@/lib/apiClient";
import ProgramForm from "@/components/programs/ProgramForm";
import ProgramDetails from "@/components/programs/ProgramDetails";
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
  MapPin,
  Users,
  Calendar,
  Trash2,
  Clock,
  Eye,
  Pencil,
  Plus,
  Sparkles,
  CheckCircle,
  XCircle,
  AlertTriangle,
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

export default function ProgramList() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [selectedProgram, setSelectedProgram] = useState(null);

  // Alert Dialog States
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [programToDelete, setProgramToDelete] = useState(null);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchPrograms();
  }, []);

  async function fetchPrograms({ silent = false } = {}) {
    if (!silent) {
      setLoading(true);
      setError("");
    }

    try {
      const response = await fetchWithAuth(
        "/api/programs?includeLocation=true"
      );
      const data = await response.json();

      if (response.ok) {
        setPrograms(data.programs);
        if (!silent) {
          setError("");
        }
      } else if (!silent) {
        setError(data.error || "Failed to fetch programs");
      } else {
        console.error("Fetch programs failed:", data);
      }
    } catch (err) {
      const message =
        err instanceof AuthError
          ? err.message
          : "Network error. Please try again.";
      if (!silent) {
        setError(message);
      } else {
        console.error("Fetch programs error:", err);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  async function handleDelete(id) {
    // if (!confirm("Are you sure you want to delete this program?")) return;

    setDeleteLoading(id);
    try {
      const response = await fetchWithAuth(`/api/programs/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setPrograms((prev) => prev.filter((p) => p.id !== id));
        setSuccessMessage("Program deleted successfully!");
        setSuccessDialogOpen(true);
      } else {
        const data = await response.json();
        setErrorMessage(data.error || "Failed to delete program");
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
      setDeleteDialogOpen(false);
      setProgramToDelete(null);
    }
  }

  function openDeleteDialog(program) {
    setProgramToDelete(program);
    setDeleteDialogOpen(true);
  }

  function confirmDelete() {
    if (programToDelete) {
      handleDelete(programToDelete.id);
    }
  }

  function handleOpenCreate() {
    setEditingProgram(null);
    setFormOpen(true);
  }

  function handleOpenEdit(program) {
    setEditingProgram(program);
    setFormOpen(true);
  }

  function handleFormOpenChange(open) {
    setFormOpen(open);
    if (!open) {
      setEditingProgram(null);
    }
  }

  function handleProgramSaved() {
    setEditingProgram(null);
    fetchPrograms({ silent: true });
    setSuccessMessage(editingProgram ? "Program updated successfully!" : "Program created successfully!");
    setSuccessDialogOpen(true);
  }

  async function handleOpenDetails(programId) {
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsError("");
    setSelectedProgram(null);

    try {
      const response = await fetchWithAuth(`/api/programs/${programId}`);
      const data = await response.json();

      if (response.ok) {
        setSelectedProgram(data.program);
      } else {
        setDetailsError(data.error || "Failed to fetch program details");
      }
    } catch (err) {
      const message =
        err instanceof AuthError
          ? err.message
          : "Network error. Please try again.";
      setDetailsError(message);
    } finally {
      setDetailsLoading(false);
    }
  }

  function handleDetailsOpenChange(open) {
    setDetailsOpen(open);
    if (!open) {
      setDetailsError("");
      setSelectedProgram(null);
      setDetailsLoading(false);
    }
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
          Loading your amazing programs...
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
            <p className="font-bold text-xl mb-2" style={{ color: '#767014' }}>
              Oops! Something went wrong
            </p>
            <p className="text-sm" style={{ color: '#000000' }}>{error}</p>
            <Button
              onClick={() => fetchPrograms()}
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
              <Sparkles className="h-6 w-6 animate-pulse" style={{ color: '#ffffff' }} />
              <h2 className="text-3xl font-bold">Your Programs</h2>
            </div>
            <p className="text-lg" style={{ color: '#ffffff', opacity: 0.9 }}>
              {programs.length} awesome program
              {programs.length !== 1 ? "s" : ""} ready to inspire
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => fetchPrograms()}
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
              New Program
            </Button>
          </div>
        </div>
      </div>

      {programs.length === 0 ? (
        <Card className="border-2 border-dashed" style={{ borderColor: '#C5BF81', background: 'linear-gradient(to bottom right, #ffffff, #C5BF81)' }}>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-6" style={{ background: 'linear-gradient(to bottom right, #767014, #C5BF81)' }}>
                <Calendar className="h-12 w-12" style={{ color: '#ffffff' }} />
              </div>
              <h3 className="text-2xl font-bold mb-3" style={{ background: 'linear-gradient(to right, #767014, #C5BF81)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                No programs yet
              </h3>
              <p className="mb-6 max-w-md mx-auto" style={{ color: '#000000', opacity: 0.7 }}>
                Create your first amazing training program and start inspiring
                your audience!
              </p>
              <Button
                onClick={handleOpenCreate}
                className="shadow-lg hover:shadow-xl transition-all duration-300"
                style={{ background: 'linear-gradient(to right, #767014, #C5BF81)', color: '#ffffff' }}
                size="lg"
              >
                <Plus className="mr-2 h-5 w-5" />
                Create Your First Program
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((program, index) => {
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
                key={program.id}
                className="group hover:shadow-2xl transition-all duration-300 border-2 overflow-hidden"
                style={{ borderColor: '#C5BF81' }}
              >
                {/* Colorful Header */}
                {/* <div className="h-2" style={{ background: gradient }}></div> */}

                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-3 transition-colors" style={{ color: '#000000' }}>
                        {program.title}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={program.isActive ? "default" : "secondary"}
                          className="border-0 shadow-sm"
                          style={program.isActive
                            ? { background: 'linear-gradient(to right, #767014, #C5BF81)', color: '#ffffff' }
                            : { backgroundColor: '#C5BF81', color: '#000000', opacity: 0.6 }
                          }
                        >
                          {program.isActive ? "🟢 Active" : "⚫ Inactive"}
                        </Badge>
                        {program._count && (
                          <Badge
                            variant="outline"
                            className="border-2"
                            style={{ borderColor: '#767014', backgroundColor: '#ffffff', color: '#767014' }}
                          >
                            📚 {program._count.sessions} session
                            {program._count.sessions !== 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {program.description && (
                    <CardDescription className="line-clamp-2 text-base" style={{ color: '#000000', opacity: 0.7 }}>
                      {program.description}
                    </CardDescription>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg border" style={{ backgroundColor: '#ffffff', borderColor: '#C5BF81' }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(to bottom right, #767014, #C5BF81)' }}>
                        <MapPin className="h-5 w-5" style={{ color: '#ffffff' }} />
                      </div>
                      <span className="text-sm font-medium" style={{ color: '#000000' }}>
                        {program.location?.name || "No location"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-lg border" style={{ backgroundColor: '#ffffff', borderColor: '#C5BF81' }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#767014' }}>
                        <Users className="h-5 w-5" style={{ color: '#ffffff' }} />
                      </div>
                      <span className="text-sm font-medium" style={{ color: '#000000' }}>
                        {program.seats} seats available
                      </span>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-lg border" style={{ backgroundColor: '#ffffff', borderColor: '#C5BF81' }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#C5BF81' }}>
                        <Clock className="h-5 w-5" style={{ color: '#000000' }} />
                      </div>
                      <span className="text-sm font-medium" style={{ color: '#000000' }}>
                        {formatTime(program.startTime)} -{" "}
                        {formatTime(program.endTime)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDetails(program.id)}
                      className="flex-1 border-2"
                      style={{ borderColor: '#767014', color: '#767014', backgroundColor: '#ffffff' }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(program)}
                      className="flex-1 border-2"
                      style={{ borderColor: '#C5BF81', color: '#767014', backgroundColor: '#ffffff' }}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(program)}
                      disabled={deleteLoading === program.id}
                      className="border-2"
                      style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}
                    >
                      {deleteLoading === program.id ? (
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

      <ProgramForm
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        onSuccess={handleProgramSaved}
        initialData={editingProgram}
      />

      <ProgramDetails
        open={detailsOpen}
        onOpenChange={handleDetailsOpenChange}
        program={selectedProgram}
        loading={detailsLoading}
        error={detailsError}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="border-2" style={{ borderColor: '#C5BF81' }}>
          <AlertDialogHeader>
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(197, 191, 129, 0.2)' }}>
              <AlertTriangle className="h-8 w-8" style={{ color: '#767014' }} />
            </div>
            <AlertDialogTitle className="text-center text-xl" style={{ color: '#767014' }}>
              Delete Program?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center" style={{ color: '#000000', opacity: 0.7 }}>
              Are you want to sure delete this program?
            </AlertDialogDescription>
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
