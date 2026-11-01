"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/apiClient";
import LocationForm from "./LocationForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Pencil,
  Trash2,
  Plus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Power,
  Info,
} from "lucide-react";
import { usePermissions } from "@/lib/usePermissions";

export default function LocationList() {
  const { canWrite } = usePermissions("locations");

  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Dialog States
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState(null);
  const [priorDataAlertOpen, setPriorDataAlertOpen] = useState(false);
  const [locationWithPriorData, setLocationWithPriorData] = useState(null);

  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchLocations();
  }, []);

  async function fetchLocations() {
    setLoading(true);
    try {
      const response = await fetchWithAuth("/api/locations");
      const data = await response.json();
      if (response.ok) {
        setLocations(data.locations || []);
        setError("");
      } else {
        setError(data.error || "Failed to fetch locations");
      }
    } catch (err) {
      setError("Failed to load locations");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleDeleteClick(location) {
    if (location.hasPriorData) {
      setLocationWithPriorData(location);
      setPriorDataAlertOpen(true);
      return;
    }

    setLocationToDelete(location);
    setDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    if (!locationToDelete) return;

    setActionLoadingId(locationToDelete.id);
    setDeleteDialogOpen(false);

    try {
      const response = await fetchWithAuth(
        `/api/locations/${locationToDelete.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (response.ok) {
        setLocations((prev) =>
          prev.filter((loc) => loc.id !== locationToDelete.id)
        );
        setSuccessMessage("Location deleted successfully!");
        setSuccessDialogOpen(true);
      } else {
        if (data.hasPriorData) {
          setLocationWithPriorData(locationToDelete);
          setPriorDataAlertOpen(true);
        } else {
          setErrorMessage(data.error || "Failed to delete location");
          setErrorDialogOpen(true);
        }
      }
    } catch (err) {
      console.error("Delete error:", err);
      setErrorMessage("Failed to delete location. Please try again.");
      setErrorDialogOpen(true);
    } finally {
      setActionLoadingId(null);
      setLocationToDelete(null);
    }
  }

  async function handleToggleStatus(location) {
    const nextStatus = !location.isActive;
    setActionLoadingId(location.id);

    try {
      const response = await fetchWithAuth(`/api/locations/${location.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextStatus }),
      });

      const data = await response.json();

      if (response.ok) {
        setLocations((prev) =>
          prev.map((loc) =>
            loc.id === location.id ? { ...loc, isActive: nextStatus } : loc
          )
        );
        setSuccessMessage(
          `Location "${location.name}" is now ${
            nextStatus ? "Active" : "Inactive"
          }.`
        );
        setSuccessDialogOpen(true);
      } else {
        setErrorMessage(data.error || "Failed to update location status");
        setErrorDialogOpen(true);
      }
    } catch (err) {
      console.error("Toggle status error:", err);
      setErrorMessage("Network error updating status.");
      setErrorDialogOpen(true);
    } finally {
      setActionLoadingId(null);
    }
  }

  function handleLocationSaved() {
    fetchLocations();
    setSuccessMessage(
      editingLocation
        ? "Location updated successfully!"
        : "Location created successfully!"
    );
    setSuccessDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-3xl font-bold tracking-tight"
            style={{ color: "#767014" }}
          >
            Locations
          </h2>
          <p style={{ color: "#000000", opacity: 0.7 }}>
            Manage your physical locations and venues.
          </p>
        </div>

        {canWrite && (
          <Button
            onClick={() => {
              setEditingLocation(null);
              setFormOpen(true);
            }}
            style={{
              background: "linear-gradient(to right, #767014, #C5BF81)",
              color: "#ffffff",
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Location
          </Button>
        )}
      </div>

      {!canWrite && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 text-sm flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0" />
          <span>You have view-only access. Modification actions are disabled.</span>
        </div>
      )}

      {error && (
        <div
          className="p-4 rounded-md border"
          style={{
            backgroundColor: "#C5BF81",
            borderColor: "#767014",
            color: "#000000",
          }}
        >
          {error}
        </div>
      )}

      <Card className="border-2" style={{ borderColor: "#C5BF81" }}>
        <CardHeader>
          <CardTitle style={{ color: "#767014" }}>All Locations</CardTitle>
          <CardDescription style={{ color: "#000000", opacity: 0.7 }}>
            A list of all locations configured in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div
              className="text-center py-4"
              style={{ color: "#000000", opacity: 0.7 }}
            >
              Loading locations...
            </div>
          ) : locations.length === 0 ? (
            <div
              className="text-center py-8"
              style={{ color: "#000000", opacity: 0.7 }}
            >
              No locations found. Create one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead style={{ color: "#767014", fontWeight: 600 }}>
                    Name
                  </TableHead>
                  <TableHead style={{ color: "#767014", fontWeight: 600 }}>
                    Address
                  </TableHead>
                  <TableHead style={{ color: "#767014", fontWeight: 600 }}>
                    Status
                  </TableHead>
                  <TableHead style={{ color: "#767014", fontWeight: 600 }}>
                    Usage
                  </TableHead>
                  {canWrite && (
                    <TableHead
                      className="text-right"
                      style={{ color: "#767014", fontWeight: 600 }}
                    >
                      Actions
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <MapPin
                          className="h-4 w-4"
                          style={{ color: "#767014" }}
                        />
                        <span style={{ color: "#000000" }}>{location.name}</span>
                      </div>
                    </TableCell>
                    <TableCell style={{ color: "#000000", opacity: 0.7 }}>
                      {location.address || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={location.isActive ? "success" : "secondary"}
                        className={
                          location.isActive
                            ? "bg-green-100 text-green-800 border-green-300"
                            : "bg-gray-100 text-gray-700 border-gray-300"
                        }
                      >
                        {location.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell style={{ fontSize: "0.85rem", color: "#555" }}>
                      {location.hasPriorData ? (
                        <span>
                          {location.programsCount || 0} program(s),{" "}
                          {location.bookingsCount || 0} booking(s)
                        </span>
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </TableCell>
                    {canWrite && (
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-2">
                          {/* Toggle Active/Inactive */}
                          <Button
                            variant="ghost"
                            size="sm"
                            title={
                              location.isActive
                                ? "Inactivate Location"
                                : "Activate Location"
                            }
                            onClick={() => handleToggleStatus(location)}
                            disabled={actionLoadingId === location.id}
                            className={
                              location.isActive
                                ? "text-amber-700 hover:text-amber-900"
                                : "text-green-700 hover:text-green-900"
                            }
                          >
                            <Power className="h-4 w-4 mr-1" />
                            {location.isActive ? "Inactivate" : "Activate"}
                          </Button>

                          {/* Edit Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit Location"
                            onClick={() => {
                              setEditingLocation(location);
                              setFormOpen(true);
                            }}
                            style={{ color: "#767014" }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          {/* Delete Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            title={
                              location.hasPriorData
                                ? "Cannot delete: Location has prior bookings/data (click for details)"
                                : "Delete Location"
                            }
                            onClick={() => handleDeleteClick(location)}
                            disabled={actionLoadingId === location.id}
                            className={
                              location.hasPriorData
                                ? "text-gray-400 hover:text-red-500"
                                : "text-red-600 hover:text-red-800"
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <LocationForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initialData={editingLocation}
        onSuccess={handleLocationSaved}
      />

      {/* Delete Confirmation Dialog (for locations with no prior data) */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent
          className="border-2"
          style={{ borderColor: "#C5BF81" }}
        >
          <AlertDialogHeader>
            <div
              className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: "rgba(197, 191, 129, 0.2)" }}
            >
              <AlertTriangle className="h-8 w-8" style={{ color: "#767014" }} />
            </div>
            <AlertDialogTitle
              className="text-center text-xl"
              style={{ color: "#767014" }}
            >
              Delete Location?
            </AlertDialogTitle>
            <AlertDialogDescription
              className="text-center"
              style={{ color: "#000000", opacity: 0.7 }}
            >
              Are you sure you want to delete &ldquo;{locationToDelete?.name}&rdquo;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-3">
            <AlertDialogCancel
              className="border-2"
              style={{ borderColor: "#C5BF81", color: "#767014" }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="border-0"
              style={{ backgroundColor: "#767014", color: "#ffffff" }}
            >
              {actionLoadingId === locationToDelete?.id ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Prior Data Guard Dialog (Item 7 Requirement) */}
      <AlertDialog
        open={priorDataAlertOpen}
        onOpenChange={setPriorDataAlertOpen}
      >
        <AlertDialogContent
          className="border-2"
          style={{ borderColor: "#C5BF81" }}
        >
          <AlertDialogHeader>
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-amber-100">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
            <AlertDialogTitle className="text-center text-xl text-amber-900">
              Cannot Delete Location
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm text-gray-700 space-y-2">
              <p>
                &ldquo;<strong>{locationWithPriorData?.name}</strong>&rdquo; has
                associated historical data ({locationWithPriorData?.programsCount || 0} programs, {locationWithPriorData?.bookingsCount || 0} bookings).
              </p>
              <p>
                To preserve booking records and audit history, this location
                cannot be deleted. You can inactivate it instead, which will hide
                it from future scheduling while keeping all prior records safe.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-3">
            <AlertDialogCancel>Close</AlertDialogCancel>
            {locationWithPriorData?.isActive && canWrite && (
              <AlertDialogAction
                onClick={() => {
                  setPriorDataAlertOpen(false);
                  handleToggleStatus(locationWithPriorData);
                }}
                className="bg-amber-700 hover:bg-amber-800 text-white"
              >
                <Power className="h-4 w-4 mr-2" />
                Inactivate Instead
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Dialog */}
      <AlertDialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <AlertDialogContent
          className="border-2"
          style={{ borderColor: "#C5BF81" }}
        >
          <AlertDialogHeader>
            <div
              className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{
                background: "linear-gradient(135deg, #767014, #C5BF81)",
              }}
            >
              <CheckCircle className="h-8 w-8" style={{ color: "#ffffff" }} />
            </div>
            <AlertDialogTitle
              className="text-center text-xl"
              style={{ color: "#767014" }}
            >
              Success!
            </AlertDialogTitle>
            <AlertDialogDescription
              className="text-center text-base"
              style={{ color: "#000000", opacity: 0.8 }}
            >
              {successMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction
              style={{
                background: "linear-gradient(135deg, #767014, #C5BF81)",
                color: "#ffffff",
              }}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Ok
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Dialog */}
      <AlertDialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <AlertDialogContent
          className="border-2"
          style={{ borderColor: "#C5BF81" }}
        >
          <AlertDialogHeader>
            <div
              className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: "rgba(197, 191, 129, 0.3)" }}
            >
              <XCircle className="h-8 w-8" style={{ color: "#767014" }} />
            </div>
            <AlertDialogTitle
              className="text-center text-xl"
              style={{ color: "#767014" }}
            >
              Action Prohibited or Failed
            </AlertDialogTitle>
            <AlertDialogDescription
              className="text-center text-base"
              style={{ color: "#000000", opacity: 0.8 }}
            >
              {errorMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction
              style={{ backgroundColor: "#767014", color: "#ffffff" }}
            >
              Dismiss
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
