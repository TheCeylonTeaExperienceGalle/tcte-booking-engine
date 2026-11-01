"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth, AuthError } from "@/lib/apiClient";
import ProgramForm from "@/components/programs/ProgramForm";
import ProgramDetails from "@/components/programs/ProgramDetails";
import { usePermissions } from "@/lib/usePermissions";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
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
  LayoutGrid,
  List,
  Tag
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
  const { canWrite } = usePermissions("programs");
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
  const [viewMode, setViewMode] = useState("grid");
  
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
        setPrograms(Array.isArray(data.programs) ? data.programs.filter(Boolean) : []);
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
        setPrograms((prev) => (Array.isArray(prev) ? prev.filter((p) => p && p.id !== id) : []));
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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        <p className="text-muted-foreground font-medium animate-pulse">Loading programs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 shadow-sm">
        <CardContent className="pt-6 flex flex-col items-center">
          <AlertTriangle className="h-10 w-10 text-red-500 mb-3" />
          <p className="font-semibold text-red-900 mb-1">Failed to load programs</p>
          <p className="text-sm text-red-700 mb-4">{error}</p>
          <Button onClick={() => fetchPrograms()} variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center bg-muted/80 rounded-md p-1 border">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode("grid")}
              className={`h-8 w-8 rounded-sm transition-all ${viewMode === 'grid' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode("list")}
              className={`h-8 w-8 rounded-sm transition-all ${viewMode === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => fetchPrograms()} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {canWrite && (
            <Button onClick={handleOpenCreate} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Session
            </Button>
          )}
        </div>
      </div>

      {programs.length === 0 ? (
        <Card className="border-dashed shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mb-6">
              <Calendar className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No programs found</h3>
            <p className="text-muted-foreground text-center max-w-sm mb-6">
              Get started by creating your first program. You can assign locations, schedules, and track capacity.
            </p>
            {canWrite && (
              <Button onClick={handleOpenCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Create Program
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => (
            <Card key={program.id} className="group hover:shadow-lg hover:border-primary/20 transition-all duration-300 overflow-hidden flex flex-col bg-card">
              <CardHeader className="pb-4 border-b border-muted/30">
                <div className="flex justify-between items-start gap-4 mb-3">
                  <CardTitle className="text-xl leading-tight line-clamp-2">{program.title}</CardTitle>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={program.isActive ? "default" : "secondary"} className="font-medium shadow-sm">
                    {program.isActive ? "Active" : "Inactive"}
                  </Badge>
                  {program._count && (
                    <Badge variant="outline" className="font-medium bg-background">
                      {program._count.sessions} Session{program._count.sessions !== 1 ? "s" : ""}
                    </Badge>
                  )}
                  {program.discountRules?.length > 0 && (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100/80 font-medium border-amber-200">
                      <Tag className="h-3 w-3 mr-1" />
                      Promo
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col gap-4 pt-5">
                {program.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {program.description}
                  </p>
                )}

                <div className="space-y-4 mt-auto">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <span className="text-sm text-foreground font-medium truncate">
                      {program.location?.name || "No location assigned"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <Clock className="h-4 w-4" />
                    </div>
                    <span className="text-sm text-foreground font-medium">
                      {formatTime(program?.startTime)} - {formatTime(program?.endTime)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <Users className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <div className="flex justify-between text-xs font-medium text-foreground">
                        <span>{program.totalBookedSeats || 0} / {program.seats} Seats</span>
                        <span>{Math.round(((program.totalBookedSeats || 0) / Math.max(program.seats, 1)) * 100)}%</span>
                      </div>
                      <Progress value={((program.totalBookedSeats || 0) / Math.max(program.seats, 1)) * 100} className="h-1.5" />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-5 mt-2 border-t border-border/40">
                  <Button variant="secondary" size="sm" onClick={() => handleOpenDetails(program.id)} className="flex-1 font-medium hover:bg-secondary/80">
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  {canWrite && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => handleOpenEdit(program)} className="flex-1 font-medium hover:bg-muted/50">
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(program)} disabled={deleteLoading === program.id} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                        {deleteLoading === program.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden shadow-sm border-muted">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-[300px] font-semibold">Program</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Location</TableHead>
                  <TableHead className="font-semibold">Schedule</TableHead>
                  <TableHead className="w-[200px] font-semibold">Capacity</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {programs.map((program) => (
                  <TableRow key={program.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="font-medium text-foreground">{program.title}</div>
                      {program.discountRules?.length > 0 && (
                        <div className="flex items-center text-[10px] uppercase tracking-wider font-bold text-amber-600 mt-1.5">
                          <Tag className="h-3 w-3 mr-1" /> Promotion
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={program.isActive ? "default" : "secondary"} className="shadow-none font-medium">
                        {program.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-medium text-sm">
                      {program.location?.name || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap text-sm">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {formatTime(program?.startTime)} - {formatTime(program?.endTime)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1.5 pr-4">
                        <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                          <span>{program.totalBookedSeats || 0} / {program.seats}</span>
                          <span>{Math.round(((program.totalBookedSeats || 0) / Math.max(program.seats, 1)) * 100)}%</span>
                        </div>
                        <Progress value={((program.totalBookedSeats || 0) / Math.max(program.seats, 1)) * 100} className="h-1.5" />
                      </div>
                    </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <Button variant="secondary" size="sm" onClick={() => handleOpenDetails(program.id)} className="h-8 font-medium hover:bg-secondary/80">
                            <Eye className="h-4 w-4 mr-1.5" />
                            View
                          </Button>
                          {canWrite && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(program)} className="h-8 w-8 hover:bg-secondary">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive hover:bg-destructive/10" onClick={() => openDeleteDialog(program)} disabled={deleteLoading === program.id}>
                                {deleteLoading === program.id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
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
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-center text-xl">Delete Program?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Are you sure you want to delete this program? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2 sm:gap-4 mt-2">
            <AlertDialogCancel className="mt-0">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white shadow-sm">
              {deleteLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete Program
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Dialog */}
      <AlertDialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <AlertDialogTitle className="text-center text-xl">Success!</AlertDialogTitle>
            <AlertDialogDescription className="text-center font-medium">
              {successMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center mt-2">
            <AlertDialogAction className="min-w-[100px]">Ok</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Dialog */}
      <AlertDialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-center text-xl">Something went wrong</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {errorMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center mt-2">
            <AlertDialogAction variant="outline" className="min-w-[100px]">Dismiss</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
