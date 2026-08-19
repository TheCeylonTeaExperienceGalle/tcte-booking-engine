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
import { MapPin, Pencil, Trash2, Plus, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

export default function LocationList() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);

  // Alert Dialog States
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState(null);
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
        setLocations(data.locations);
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

  async function handleDelete(id) {
    const location = locations.find((loc) => loc.id === id);
    setLocationToDelete(location);
    setDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    if (!locationToDelete) return;

    setDeleteLoading(locationToDelete.id);
    setDeleteDialogOpen(false);

    try {
      const response = await fetchWithAuth(`/api/locations/${locationToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setLocations(locations.filter((loc) => loc.id !== locationToDelete.id));
        setSuccessMessage("Location deleted successfully!");
        setSuccessDialogOpen(true);
      } else {
        const data = await response.json();
        setErrorMessage(data.error || "Failed to delete location");
        setErrorDialogOpen(true);
      }
    } catch (err) {
      console.error("Delete error:", err);
      setErrorMessage("Failed to delete location. Please try again.");
      setErrorDialogOpen(true);
    } finally {
      setDeleteLoading(null);
      setLocationToDelete(null);
    }
  }

  function handleLocationSaved() {
    fetchLocations();
    setSuccessMessage(editingLocation ? "Location updated successfully!" : "Location created successfully!");
    setSuccessDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" style={{ color: '#767014' }}>Locations</h2>
          <p style={{ color: '#000000', opacity: 0.7 }}>
            Manage your physical locations and venues.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingLocation(null);
            setFormOpen(true);
          }}
          style={{ background: 'linear-gradient(to right, #767014, #C5BF81)', color: '#ffffff' }}
        >
          <Plus className="mr-2 h-4 w-4" /> Add Location
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-md border" style={{ backgroundColor: '#C5BF81', borderColor: '#767014', color: '#000000' }}>{error}</div>
      )}

      <Card className="border-2" style={{ borderColor: '#C5BF81' }}>
        <CardHeader>
          <CardTitle style={{ color: '#767014' }}>All Locations</CardTitle>
          <CardDescription style={{ color: '#000000', opacity: 0.7 }}>
            A list of all active locations in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4" style={{ color: '#000000', opacity: 0.7 }}>Loading locations...</div>
          ) : locations.length === 0 ? (
            <div className="text-center py-8" style={{ color: '#000000', opacity: 0.7 }}>
              No locations found. Create one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead style={{ color: '#767014', fontWeight: 600 }}>Name</TableHead>
                  <TableHead style={{ color: '#767014', fontWeight: 600 }}>Address</TableHead>
                  <TableHead className="text-right" style={{ color: '#767014', fontWeight: 600 }}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" style={{ color: '#767014' }} />
                        <span style={{ color: '#000000' }}>{location.name}</span>
                      </div>
                    </TableCell>
                    <TableCell style={{ color: '#000000', opacity: 0.7 }}>{location.address || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingLocation(location);
                            setFormOpen(true);
                          }}
                          style={{ color: '#767014' }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(location.id)}
                          disabled={deleteLoading === location.id}
                          style={{ color: '#000000' }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="border-2" style={{ borderColor: '#C5BF81' }}>
          <AlertDialogHeader>
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(197, 191, 129, 0.2)' }}>
              <AlertTriangle className="h-8 w-8" style={{ color: '#767014' }} />
            </div>
            <AlertDialogTitle className="text-center text-xl" style={{ color: '#767014' }}>
              Delete Location?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center" style={{ color: '#000000', opacity: 0.7 }}>
              Are you want to sure delete this location?
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
