"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchWithAuth, AuthError } from "@/lib/apiClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
function formatTimeLabel(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  const hours = String(parsed.getUTCHours()).padStart(2, "0");
  const minutes = String(parsed.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function createSelection() {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    id,
    locationId: "",
    programId: "",
    sessionIds: [],
    sessionTypeById: {},
    seatsRequested: 1,
    leaderAttending: true,
    customers: [],
    availabilityStatus: "idle",
    availabilityError: "",
    availabilityBySessionId: {},
    fallbackSeatsBySessionId: {},
    // Discount calculation state
    discountInfo: null, // { originalTotal, discountAmount, finalTotal, appliedRule }
    discountLoading: false,
  };
}

function normalizeCustomerSlots(customers, size) {
  const next = Array.isArray(customers) ? customers.slice(0, size) : [];
  while (next.length < size) {
    next.push({ name: "", email: "", phone: "", nic: "" });
  }
  return next;
}

export default function BookingForm() {
  const [leaders, setLeaders] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [initialError, setInitialError] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [formState, setFormState] = useState({
    leaderId: "",
    bookedDate: "",
    paymentType: "Full",
    paymentMethod: "",
    transactionId: "",
    selections: [createSelection()],
  });
  const [formError, setFormError] = useState("");
  const [submissionStatus, setSubmissionStatus] = useState("idle");
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const sessionsMap = useMemo(() => {
    const map = new Map();
    sessions.forEach((session) => {
      map.set(String(session.id), session);
    });
    return map;
  }, [sessions]);

  const programsMap = useMemo(() => {
    const map = new Map();
    programs.forEach((program) => {
      map.set(String(program.id), program);
    });
    return map;
  }, [programs]);

  const locations = useMemo(() => {
    const map = new Map();
    programs.forEach((program) => {
      const locationId = program?.locationId ?? program?.location?.id;
      if (locationId == null) {
        return;
      }
      const key = String(locationId);
      if (map.has(key)) {
        return;
      }
      map.set(key, {
        id: key,
        name: program?.location?.name || `Location ${locationId}`,
        address: program?.location?.address || "",
      });
    });
    return Array.from(map.values());
  }, [programs]);

  const sessionsByProgram = useMemo(() => {
    const grouped = new Map();
    sessions.forEach((session) => {
      const key = String(session.programId);
      const list = grouped.get(key) || [];
      list.push(session);
      grouped.set(key, list);
    });
    return grouped;
  }, [sessions]);

  const estimatedTotal = useMemo(() => {
    return formState.selections.reduce((running, selection) => {
      if (!Array.isArray(selection.sessionIds) || selection.sessionIds.length === 0) {
        return running;
      }
      const seats = Number.parseInt(selection.seatsRequested, 10) || 0;
      if (seats <= 0) {
        return running;
      }

      // Use discount info if available, otherwise calculate original total
      if (selection.discountInfo) {
        return running + selection.discountInfo.finalTotal * seats;
      }

      const selectionTotal = selection.sessionIds.reduce((subtotal, sessionId) => {
        const session = sessionsMap.get(sessionId);
        if (!session) {
          return subtotal;
        }
        let price = session.specialPrice ?? session.price ?? null;
        const typeMap = selection.sessionTypeById || {};
        const mappedTypeId = typeMap[sessionId];
        if (mappedTypeId) {
          const resolvedType = session.sessionTypes?.find(
            (type) => String(type.id) === mappedTypeId
          );
          if (resolvedType) {
            price = resolvedType.specialPrice ?? resolvedType.price ?? null;
          }
        }
        if (price == null) {
          return subtotal;
        }
        return subtotal + price * seats;
      }, 0);

      return running + selectionTotal;
    }, 0);
  }, [formState.selections, sessionsMap]);

  // Calculate total discount applied
  const totalDiscount = useMemo(() => {
    return formState.selections.reduce((total, selection) => {
      if (selection.discountInfo) {
        const seats = Number.parseInt(selection.seatsRequested, 10) || 0;
        return total + selection.discountInfo.discountAmount * seats;
      }
      return total;
    }, 0);
  }, [formState.selections]);

  const loadInitialData = useCallback(async () => {
    setInitialLoading(true);
    setInitialError("");

    try {
      const [leadersRes, programsRes, sessionsRes] = await Promise.all([
        fetchWithAuth("/api/leaders"),
        fetchWithAuth("/api/programs?includeLocation=true"),
        fetchWithAuth("/api/sessions?includeTypes=true"),
      ]);

      const [leadersData, programsData, sessionsData] = await Promise.all([
        leadersRes.json(),
        programsRes.json(),
        sessionsRes.json(),
      ]);

      if (!leadersRes.ok) {
        throw new Error(leadersData?.error || "Failed to load leaders");
      }
      if (!programsRes.ok) {
        throw new Error(programsData?.error || "Failed to load programs");
      }
      if (!sessionsRes.ok) {
        throw new Error(sessionsData?.error || "Failed to load sessions");
      }

      setLeaders(Array.isArray(leadersData.leaders) ? leadersData.leaders : []);
      setPrograms(Array.isArray(programsData.programs) ? programsData.programs : []);
      setSessions(Array.isArray(sessionsData.sessions) ? sessionsData.sessions : []);
    } catch (error) {
      if (error instanceof AuthError) {
        setInitialError(error.message);
      } else {
        setInitialError(error?.message || "Unable to load booking resources");
      }
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  function updateSelection(index, updater) {
    setFormState((prev) => {
      const nextSelections = prev.selections.map((selection, idx) => {
        if (idx !== index) return selection;
        const patch = typeof updater === "function" ? updater(selection) : updater;
        return { ...selection, ...patch };
      });
      return { ...prev, selections: nextSelections };
    });
  }

  function handleLeaderChange(value) {
    setFormState((prev) => ({ ...prev, leaderId: value }));
  }

  function handlePaymentTypeChange(value) {
    setFormState((prev) => ({ ...prev, paymentType: value }));
  }

  function handleFieldChange(event) {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  }

  function handleProgramChange(index, value) {
    const program = programsMap.get(value);
    const programLocationId = program?.locationId ?? program?.location?.id;

    updateSelection(index, (prevSelection) => ({
      locationId:
        programLocationId != null ? String(programLocationId) : prevSelection.locationId,
      programId: value,
      sessionIds: [],
      sessionTypeById: {},
      availabilityStatus: "idle",
      availabilityError: "",
      availabilityBySessionId: {},
      fallbackSeatsBySessionId: {},
      discountInfo: null,
      discountLoading: false,
    }));
  }

  function handleSessionToggle(index, sessionId, checked) {
    const idString = String(sessionId);
    const isChecked = checked === true;

    updateSelection(index, (prevSelection) => {
      const currentIds = Array.isArray(prevSelection.sessionIds)
        ? [...prevSelection.sessionIds]
        : [];
      let nextIds;
      if (isChecked) {
        if (!currentIds.includes(idString)) {
          nextIds = [...currentIds, idString];
        } else {
          nextIds = currentIds;
        }
      } else {
        nextIds = currentIds.filter((id) => id !== idString);
      }

      const nextTypeMap = { ...(prevSelection.sessionTypeById || {}) };
      if (!isChecked) {
        delete nextTypeMap[idString];
      }

      return {
        sessionIds: nextIds,
        sessionTypeById: nextTypeMap,
        availabilityStatus: "idle",
        availabilityError: "",
        availabilityBySessionId: {},
        fallbackSeatsBySessionId: {},
        discountLoading: true, // Mark as loading for discount calculation
      };
    });
  }

  // Calculate discount based on selected sessions
  const calculateDiscountForSelection = useCallback(async (index, selection) => {
    const { programId, sessionIds, sessionTypeById } = selection;

    // Reset discount if no sessions selected
    if (!programId || !Array.isArray(sessionIds) || sessionIds.length === 0) {
      updateSelection(index, () => ({
        discountInfo: null,
        discountLoading: false,
      }));
      return;
    }

    try {
      // Build sessionTypeSelections object for the API
      const sessionTypeSelections = {};
      for (const sessionId of sessionIds) {
        const typeId = sessionTypeById?.[sessionId];
        if (typeId) {
          sessionTypeSelections[parseInt(sessionId, 10)] = parseInt(typeId, 10);
        }
      }

      const response = await fetchWithAuth("/api/discount-rules/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId: parseInt(programId, 10),
          sessionIds: sessionIds.map((id) => parseInt(id, 10)),
          sessionTypeSelections,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to calculate discount");
      }

      updateSelection(index, () => ({
        discountInfo: {
          originalTotal: data.originalTotal,
          discountAmount: data.discountAmount,
          finalTotal: data.finalTotal,
          appliedRule: data.appliedRule,
          priceBreakdown: data.priceBreakdown,
        },
        discountLoading: false,
      }));
    } catch (error) {
      console.error("Discount calculation error:", error);
      updateSelection(index, () => ({
        discountInfo: null,
        discountLoading: false,
      }));
    }
  }, []);

  // Effect to trigger discount calculation when selection changes
  useEffect(() => {
    formState.selections.forEach((selection, index) => {
      if (selection.discountLoading && selection.programId && selection.sessionIds?.length > 0) {
        calculateDiscountForSelection(index, selection);
      }
    });
  }, [formState.selections, calculateDiscountForSelection]);

  function handleSessionTypeChange(selectionIndex, sessionId, value) {
    const idString = String(sessionId);
    updateSelection(selectionIndex, (prevSelection) => {
      const nextTypeMap = { ...(prevSelection.sessionTypeById || {}) };
      if (!value || value === "__none__") {
        delete nextTypeMap[idString];
      } else {
        nextTypeMap[idString] = value;
      }
      return {
        sessionTypeById: nextTypeMap,
        discountLoading: true, // Mark as loading for discount calculation
      };
    });
  }

  function handleSeatsChange(index, value) {
    const parsed = Number.parseInt(value, 10);
    const seats = Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;

    updateSelection(index, (selection) => {
      if (seats === 1) {
        const nextCustomers = selection.leaderAttending
          ? []
          : normalizeCustomerSlots(selection.customers, 1);
        return {
          seatsRequested: seats,
          customers: nextCustomers,
        };
      }

      return {
        seatsRequested: seats,
        leaderAttending: false,
        customers: normalizeCustomerSlots(selection.customers, seats),
      };
    });
  }

  function handleLeaderAttendingToggle(index, checked) {
    updateSelection(index, () => ({
      leaderAttending: Boolean(checked),
      customers: checked ? [] : normalizeCustomerSlots([], 1),
    }));
  }

  function handleCustomerChange(selectionIndex, customerIndex, field, value) {
    updateSelection(selectionIndex, (selection) => {
      const customers = normalizeCustomerSlots(selection.customers, selection.seatsRequested > 1 ? selection.seatsRequested : 1);
      const nextCustomers = customers.map((customer, idx) =>
        idx === customerIndex ? { ...customer, [field]: value } : customer
      );
      return { customers: nextCustomers };
    });
  }

  function handleLocationChange(index, value) {
    updateSelection(index, () => ({
      locationId: value,
      programId: "",
      sessionIds: [],
      sessionTypeById: {},
      availabilityStatus: "idle",
      availabilityError: "",
      availabilityBySessionId: {},
      fallbackSeatsBySessionId: {},
      discountInfo: null,
      discountLoading: false,
    }));
  }

  function handleAddSelection() {
    setFormState((prev) => ({
      ...prev,
      selections: [...prev.selections, createSelection()],
    }));
  }

  function handleRemoveSelection(index) {
    setFormState((prev) => {
      if (prev.selections.length === 1) {
        return prev;
      }
      const nextSelections = prev.selections.filter((_, idx) => idx !== index);
      return { ...prev, selections: nextSelections };
    });
  }

  async function handleCheckAvailability(index) {
    const selection = formState.selections[index];
    if (!formState.bookedDate) {
      updateSelection(index, () => ({
        availabilityStatus: "error",
        availabilityError: "Select a booking date first",
      }));
      return;
    }
    if (!selection.locationId) {
      updateSelection(index, () => ({
        availabilityStatus: "error",
        availabilityError: "Select a location to check availability",
      }));
      return;
    }
    if (!selection.programId) {
      updateSelection(index, () => ({
        availabilityStatus: "error",
        availabilityError: "Select a program to check availability",
      }));
      return;
    }
    if (!Array.isArray(selection.sessionIds) || selection.sessionIds.length === 0) {
      updateSelection(index, () => ({
        availabilityStatus: "error",
        availabilityError: "Select at least one session to check availability",
      }));
      return;
    }

    updateSelection(index, () => ({
      availabilityStatus: "loading",
      availabilityError: "",
      availabilityBySessionId: {},
      fallbackSeatsBySessionId: {},
    }));

    try {
      const availabilityBySessionId = {};
      const fallbackSeatsBySessionId = {};

      for (const sessionId of selection.sessionIds) {
        const params = new URLSearchParams({
          sessionId,
          date: formState.bookedDate,
        });
        const response = await fetchWithAuth(`/api/availability?${params.toString()}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "Unable to fetch availability");
        }

        const sessionRecord = sessionsMap.get(sessionId);
        const programRecord = sessionRecord?.program || programsMap.get(selection.programId);
        const fallbackSeats = (() => {
          if (sessionRecord?.program?.seats != null) {
            const seats = Number(sessionRecord.program.seats);
            if (!Number.isNaN(seats)) {
              return seats;
            }
          }
          if (programRecord?.seats != null) {
            const seats = Number(programRecord.seats);
            if (!Number.isNaN(seats)) {
              return seats;
            }
          }
          return null;
        })();

        availabilityBySessionId[sessionId] = data.availability || null;
        fallbackSeatsBySessionId[sessionId] = fallbackSeats;
      }

      const seatsRequested = Number.parseInt(selection.seatsRequested, 10) || 1;
      const insufficientSessions = selection.sessionIds.filter((sessionId) => {
        const availabilityRecord = availabilityBySessionId[sessionId];
        const fallbackSeats = fallbackSeatsBySessionId[sessionId];
        const resolvedSeats =
          availabilityRecord?.availableSeats != null
            ? availabilityRecord.availableSeats
            : fallbackSeats;
        return resolvedSeats == null || resolvedSeats < seatsRequested;
      });

      const makeSessionLabel = (sessionId) => {
        const sessionRecord = sessionsMap.get(sessionId);
        return sessionRecord ? sessionRecord.name : `Session ${sessionId}`;
      };

      if (insufficientSessions.length > 0) {
        const names = insufficientSessions.map(makeSessionLabel).join(", ");
        updateSelection(index, () => ({
          availabilityStatus: "error",
          availabilityError: `Not enough seats for: ${names}`,
          availabilityBySessionId,
          fallbackSeatsBySessionId,
        }));
        return;
      }

      updateSelection(index, () => ({
        availabilityStatus: "success",
        availabilityError: "",
        availabilityBySessionId,
        fallbackSeatsBySessionId,
      }));
    } catch (error) {
      const message =
        error instanceof AuthError
          ? error.message
          : error?.message || "Failed to check availability";
      updateSelection(index, () => ({
        availabilityStatus: "error",
        availabilityError: message,
        availabilityBySessionId: {},
        fallbackSeatsBySessionId: {},
      }));
    }
  }

  function validateForm() {
    if (!formState.leaderId) {
      return "Select a leader for this booking";
    }
    if (!formState.bookedDate) {
      return "Select the booking date";
    }
    if (!formState.paymentMethod.trim()) {
      return "Enter the payment method";
    }
    if (!formState.transactionId.trim()) {
      return "Enter the payment transaction reference";
    }
    if (!Array.isArray(formState.selections) || formState.selections.length === 0) {
      return "Add at least one session selection";
    }

    for (const [index, selection] of formState.selections.entries()) {
      if (!selection.locationId) {
        return `Selection ${index + 1}: choose a location`;
      }
      if (!selection.programId) {
        return `Selection ${index + 1}: choose a program`;
      }
      if (!Array.isArray(selection.sessionIds) || selection.sessionIds.length === 0) {
        return `Selection ${index + 1}: choose at least one session`;
      }
      if (!selection.seatsRequested || selection.seatsRequested < 1) {
        return `Selection ${index + 1}: seats requested must be at least 1`;
      }
      if (selection.seatsRequested > 1) {
        if (!Array.isArray(selection.customers) || selection.customers.length !== selection.seatsRequested) {
          return `Selection ${index + 1}: provide attendee details for all seats`;
        }
        const invalidCustomer = selection.customers.find(
          (customer) => !customer?.name?.trim() || !customer?.email?.trim()
        );
        if (invalidCustomer) {
          return `Selection ${index + 1}: every attendee needs a name and email`;
        }
      }
      if (selection.seatsRequested === 1 && !selection.leaderAttending) {
        if (!Array.isArray(selection.customers) || selection.customers.length !== 1) {
          return `Selection ${index + 1}: provide the attendee details`;
        }
        const [customer] = selection.customers;
        if (!customer?.name?.trim() || !customer?.email?.trim()) {
          return `Selection ${index + 1}: attendee name and email are required`;
        }
      }
    }

    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    setSubmissionStatus("idle");
    setSubmissionMessage("");

    const validationMessage = validateForm();
    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    const bookingSelections = [];

    formState.selections.forEach((selection) => {
      const seatsRequested = Number.parseInt(selection.seatsRequested, 10) || 1;
      const sessionIds = Array.isArray(selection.sessionIds) ? selection.sessionIds : [];
      if (sessionIds.length === 0) {
        return;
      }

      let customersPayload;
      if (seatsRequested > 1) {
        customersPayload = selection.customers.map((customer) => ({
          name: customer.name.trim(),
          email: customer.email.trim(),
          phone: customer.phone?.trim() || null,
          nic: customer.nic?.trim() || null,
        }));
      } else if (!selection.leaderAttending && selection.customers.length === 1) {
        const customer = selection.customers[0];
        customersPayload = [
          {
            name: customer.name.trim(),
            email: customer.email.trim(),
            phone: customer.phone?.trim() || null,
            nic: customer.nic?.trim() || null,
          },
        ];
      }

      const sessionTypeMap = selection.sessionTypeById || {};

      sessionIds.forEach((sessionId) => {
        const parsedSessionId = Number.parseInt(sessionId, 10);
        if (Number.isNaN(parsedSessionId)) {
          return;
        }
        const selectionPayload = {
          sessionId: parsedSessionId,
          seatsRequested,
        };

        const mappedType = sessionTypeMap[sessionId];
        if (mappedType) {
          const parsedTypeId = Number.parseInt(mappedType, 10);
          if (!Number.isNaN(parsedTypeId)) {
            selectionPayload.sessionTypeId = parsedTypeId;
          }
        }

        if (customersPayload) {
          selectionPayload.customers = customersPayload;
        }

        bookingSelections.push(selectionPayload);
      });
    });

    const payload = {
      leaderId: Number.parseInt(formState.leaderId, 10),
      bookedDate: `${formState.bookedDate}T00:00:00.000Z`,
      selections: bookingSelections,
      payment: {
        paymentType: formState.paymentType,
        method: formState.paymentMethod.trim(),
        transactionId: formState.transactionId.trim(),
      },
    };

    try {
      setSubmissionStatus("submitting");
      const response = await fetchWithAuth("/api/booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to create booking");
      }

      setSubmissionStatus("success");
      setSubmissionMessage(data?.message || "Booking created successfully");
      setSuccessMessage("Booking created successfully!");
      setSuccessDialogOpen(true);
      setFormState({
        leaderId: "",
        bookedDate: "",
        paymentType: formState.paymentType,
        paymentMethod: "",
        transactionId: "",
        selections: [createSelection()],
      });
    } catch (error) {
      const message =
        error instanceof AuthError
          ? error.message
          : error?.message || "Failed to create booking";
      setSubmissionStatus("error");
      setSubmissionMessage(message);
      setErrorMessage(message);
      setErrorDialogOpen(true);
    }
  }

  if (initialLoading) {
    return (
      <Card className="border-2" style={{ borderColor: '#C5BF81' }}>
        <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#767014' }} />
          <p style={{ color: '#000000', opacity: 0.7 }}>Loading booking tools...</p>
        </CardContent>
      </Card>
    );
  }

  if (initialError) {
    return (
      <Card className="border-2" style={{ borderColor: '#C5BF81' }}>
        <CardContent className="py-10 text-center space-y-4">
          <p className="font-medium" style={{ color: '#000000' }}>{initialError}</p>
          <Button onClick={loadInitialData} variant="outline" style={{ borderColor: '#767014', color: '#767014', backgroundColor: '#ffffff' }}>
            <RefreshCw className="mr-2 h-4 w-4" /> Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="border-2" style={{ borderColor: '#C5BF81' }}>
        <CardHeader>
          <CardTitle style={{ color: '#767014' }}>Create Booking</CardTitle>
          <CardDescription style={{ color: '#000000', opacity: 0.7 }}>
            Select a leader, configure session attendance, and capture payment details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {formError && (
            <div className="rounded-md border px-4 py-3 text-sm" style={{ borderColor: '#767014', backgroundColor: '#C5BF81', color: '#000000' }}>
              {formError}
            </div>
          )}

          {submissionStatus === "success" && submissionMessage && (
            <div className="rounded-md border px-4 py-3 text-sm flex items-center gap-2" style={{ borderColor: '#767014', backgroundColor: '#C5BF81', color: '#000000' }}>
              <CheckCircle2 className="h-4 w-4" />
              <span>{submissionMessage}</span>
            </div>
          )}

          {submissionStatus === "error" && submissionMessage && (
            <div className="rounded-md border px-4 py-3 text-sm" style={{ borderColor: '#767014', backgroundColor: '#C5BF81', color: '#000000' }}>
              {submissionMessage}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="leaderId" style={{ color: '#767014', fontWeight: 600 }}>Leader</Label>
              <Select value={formState.leaderId} onValueChange={handleLeaderChange}>
                <SelectTrigger id="leaderId">
                  <SelectValue placeholder="Select leader" />
                </SelectTrigger>
                <SelectContent>
                  {leaders.length === 0 && (
                    <SelectItem value="__no_leaders__" disabled>
                      No leaders available
                    </SelectItem>
                  )}
                  {leaders.map((leader) => (
                    <SelectItem key={leader.id} value={String(leader.id)}>
                      <div className="flex flex-col">
                        <span className="font-medium">{leader.displayName}</span>
                        <span className="text-xs text-muted-foreground">
                          {leader.email}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bookedDate" style={{ color: '#767014', fontWeight: 600 }}>Booking date</Label>
              <div className="relative">
                <Input
                  id="bookedDate"
                  type="date"
                  name="bookedDate"
                  value={formState.bookedDate}
                  onChange={handleFieldChange}
                  required
                />
                <CalendarDays className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentType" style={{ color: '#767014', fontWeight: 600 }}>Payment type</Label>
              <Select value={formState.paymentType} onValueChange={handlePaymentTypeChange}>
                <SelectTrigger id="paymentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full">Full</SelectItem>
                  <SelectItem value="Installment">Installment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod" style={{ color: '#767014', fontWeight: 600 }}>Payment method</Label>
              <Input
                id="paymentMethod"
                name="paymentMethod"
                value={formState.paymentMethod}
                onChange={handleFieldChange}
                placeholder="e.g. Bank transfer"
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="transactionId" style={{ color: '#767014', fontWeight: 600 }}>Transaction reference</Label>
              <Input
                id="transactionId"
                name="transactionId"
                value={formState.transactionId}
                onChange={handleFieldChange}
                placeholder="Enter the payment reference or confirmation code"
                required
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold" style={{ color: '#767014' }}>Session selections</h3>
                <p className="text-sm" style={{ color: '#000000', opacity: 0.7 }}>
                  Add one entry per set of sessions that share the same attendees and seat count.
                </p>
              </div>
              <Button type="button" onClick={handleAddSelection} variant="outline" size="sm" style={{ borderColor: '#767014', color: '#767014', backgroundColor: '#ffffff' }}>
                <Plus className="mr-2 h-4 w-4" /> Add session group
              </Button>
            </div>

            <div className="space-y-6">
              {formState.selections.map((selection, index) => {
                const availablePrograms = selection.locationId
                  ? programs.filter((program) => String(program.locationId ?? program.location?.id) === selection.locationId)
                  : programs;
                const availableSessions = selection.programId
                  ? sessionsByProgram.get(selection.programId) || []
                  : [];
                const sessionIds = Array.isArray(selection.sessionIds) ? selection.sessionIds : [];
                const sessionTypeMap = selection.sessionTypeById || {};
                const availabilityMap = selection.availabilityBySessionId || {};
                const fallbackMap = selection.fallbackSeatsBySessionId || {};
                const seatsRequested = Number.parseInt(selection.seatsRequested, 10) || 1;

                const sessionAvailabilityDetails = sessionIds
                  .map((sessionId) => {
                    const session = sessionsMap.get(sessionId);
                    if (!session) {
                      return null;
                    }
                    const availabilityRecord = availabilityMap[sessionId] || null;
                    const fallbackSeats = fallbackMap[sessionId] ?? null;
                    const resolvedSeats =
                      availabilityRecord?.availableSeats != null
                        ? availabilityRecord.availableSeats
                        : fallbackSeats;
                    const usingFallback = availabilityRecord == null && resolvedSeats != null;
                    const hasCapacity = resolvedSeats != null && resolvedSeats >= seatsRequested;
                    return {
                      session,
                      sessionId,
                      availabilityRecord,
                      fallbackSeats,
                      resolvedSeats,
                      usingFallback,
                      hasCapacity,
                    };
                  })
                  .filter(Boolean);

                const allSessionsSatisfied =
                  sessionAvailabilityDetails.length === sessionIds.length &&
                  sessionAvailabilityDetails.length > 0 &&
                  sessionAvailabilityDetails.every((detail) => detail.hasCapacity);

                const canCollectAttendees =
                  selection.availabilityStatus === "success" && allSessionsSatisfied;

                const showCustomerInputs =
                  canCollectAttendees &&
                  (selection.seatsRequested > 1 ||
                    (!selection.leaderAttending && selection.seatsRequested === 1));

                const showLeaderToggle = canCollectAttendees && selection.seatsRequested === 1;

                const selectedSessionNames = sessionIds
                  .map((sessionId) => sessionsMap.get(sessionId)?.name)
                  .filter(Boolean);

                const selectedTypeLabels = sessionIds
                  .map((sessionId) => {
                    const typeId = sessionTypeMap[sessionId];
                    if (!typeId) return null;
                    const session = sessionsMap.get(sessionId);
                    const resolvedType = session?.sessionTypes?.find(
                      (type) => String(type.id) === typeId
                    );
                    return resolvedType?.name || null;
                  })
                  .filter(Boolean);

                return (
                  <Card key={selection.id} className="border-2 shadow-sm" style={{ borderColor: '#C5BF81' }}>
                    <CardHeader className="space-y-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-base" style={{ color: '#767014' }}>Selection {index + 1}</CardTitle>
                          <CardDescription style={{ color: '#000000', opacity: 0.7 }}>
                            Choose the sessions that share the same attendees and seat count.
                          </CardDescription>
                        </div>
                        {formState.selections.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRemoveSelection(index)}
                            aria-label="Remove selection"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          <div className="space-y-2">
                            <Label style={{ color: '#767014', fontWeight: 600 }}>Location</Label>
                            <Select
                              value={selection.locationId}
                              onValueChange={(value) => handleLocationChange(index, value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select location" />
                              </SelectTrigger>
                              <SelectContent>
                                {locations.length === 0 && (
                                  <SelectItem value="__no_locations__" disabled>
                                    No locations available
                                  </SelectItem>
                                )}
                                {locations.map((location) => (
                                  <SelectItem key={location.id} value={String(location.id)}>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{location.name}</span>
                                      {location.address && (
                                        <span className="text-xs text-muted-foreground">
                                          {location.address}
                                        </span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label style={{ color: '#767014', fontWeight: 600 }}>Program</Label>
                            <Select
                              value={selection.programId}
                              onValueChange={(value) => handleProgramChange(index, value)}
                              disabled={!selection.locationId || availablePrograms.length === 0}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select program" />
                              </SelectTrigger>
                              <SelectContent>
                                {availablePrograms.length === 0 && (
                                  <SelectItem value="__no_programs__" disabled>
                                    {selection.locationId
                                      ? "No programs for this location"
                                      : "Select a location first"}
                                  </SelectItem>
                                )}
                                {availablePrograms.map((program) => (
                                  <SelectItem key={program.id} value={String(program.id)}>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{program.title}</span>
                                      {program.location?.name && (
                                        <span className="text-xs text-muted-foreground">
                                          {program.location.name}
                                        </span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`seats-${selection.id}`} style={{ color: '#767014', fontWeight: 600 }}>Seats requested</Label>
                            <Input
                              id={`seats-${selection.id}`}
                              type="number"
                              min={1}
                              value={selection.seatsRequested}
                              onChange={(event) => handleSeatsChange(index, event.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label style={{ color: '#767014', fontWeight: 600 }}>Sessions</Label>
                          <div className="space-y-3 rounded-md border p-3" style={{ borderColor: '#C5BF81' }}>
                            {availableSessions.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                {selection.programId
                                  ? "No sessions for this program"
                                  : "Select a program to choose sessions"}
                              </p>
                            ) : (
                              availableSessions.map((session) => {
                                const sessionIdString = String(session.id);
                                const isSelected = sessionIds.includes(sessionIdString);
                                const availabilityRecord = availabilityMap[sessionIdString] || null;
                                const fallbackSeats = fallbackMap[sessionIdString] ?? null;
                                const resolvedSeats =
                                  availabilityRecord?.availableSeats != null
                                    ? availabilityRecord.availableSeats
                                    : fallbackSeats;
                                const usingFallback =
                                  availabilityRecord == null && resolvedSeats != null;
                                const hasCapacity =
                                  resolvedSeats != null && resolvedSeats >= seatsRequested;
                                const showAvailabilityInfo =
                                  isSelected &&
                                  (selection.availabilityStatus === "loading" ||
                                    selection.availabilityStatus === "success" ||
                                    selection.availabilityStatus === "error");
                                const seatLabel = (() => {
                                  if (selection.availabilityStatus === "loading") {
                                    return "Checking availability...";
                                  }
                                  if (resolvedSeats == null) {
                                    return "Capacity unavailable";
                                  }
                                  if (usingFallback) {
                                    return `Full capacity available (${resolvedSeats} seats)`;
                                  }
                                  return `${resolvedSeats} seats remaining`;
                                })();
                                const availabilityClass =
                                  selection.availabilityStatus === "loading"
                                    ? "text-muted-foreground"
                                    : hasCapacity
                                    ? "text-emerald-600"
                                    : resolvedSeats == null
                                    ? "text-amber-600"
                                    : "text-destructive";

                                return (
                                  <div key={session.id} className="space-y-2 rounded-md bg-muted/30 p-3">
                                    <div className="flex items-start gap-3">
                                      <Checkbox
                                        id={`session-${selection.id}-${session.id}`}
                                        checked={isSelected}
                                        onCheckedChange={(checked) =>
                                          handleSessionToggle(index, sessionIdString, checked)
                                        }
                                        disabled={!selection.programId}
                                      />
                                      <div className="flex-1 space-y-2">
                                        <label
                                          htmlFor={`session-${selection.id}-${session.id}`}
                                          className="flex flex-col gap-1 text-sm font-medium"
                                        >
                                          <span>{session.name}</span>
                                          <span className="text-xs text-muted-foreground">
                                            {formatTimeLabel(session.startTime)} – {formatTimeLabel(session.endTime)}
                                          </span>
                                        </label>

                                        {showAvailabilityInfo && (
                                          <div className={`flex items-center gap-2 text-sm ${availabilityClass}`}>
                                            {selection.availabilityStatus === "loading" ? (
                                              <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                              <Users className="h-4 w-4" />
                                            )}
                                            <span>{seatLabel}</span>
                                            {selection.availabilityStatus !== "loading" &&
                                              resolvedSeats != null &&
                                              !hasCapacity && (
                                                <span className="text-xs text-muted-foreground">
                                                  Need {seatsRequested}, have {resolvedSeats}
                                                </span>
                                              )}
                                          </div>
                                        )}

                                        {isSelected && session.sessionTypes?.length > 0 && (
                                          <div className="pt-1">
                                            <Select
                                              value={sessionTypeMap[sessionIdString] || undefined}
                                              onValueChange={(value) =>
                                                handleSessionTypeChange(index, sessionIdString, value)
                                              }
                                            >
                                              <SelectTrigger>
                                                <SelectValue placeholder="Select session type (optional)" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="__none__">No session type</SelectItem>
                                                {session.sessionTypes.map((type) => (
                                                  <SelectItem key={type.id} value={String(type.id)}>
                                                    <div className="flex justify-between gap-4">
                                                      <span>{type.name}</span>
                                                      <span className="text-xs text-muted-foreground">
                                                        {type.price != null
                                                          ? `USD ${type.price.toLocaleString()}`
                                                          : "Included"}
                                                      </span>
                                                    </div>
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                          style={{ borderColor: '#767014', color: '#767014', backgroundColor: '#ffffff' }}
                          onClick={() => handleCheckAvailability(index)}
                          disabled={
                            !formState.bookedDate ||
                            !selection.programId ||
                            sessionIds.length === 0 ||
                            selection.availabilityStatus === "loading"
                          }
                        >
                          {selection.availabilityStatus === "loading" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          Check availability
                        </Button>

                        {selection.availabilityStatus === "success" && (
                          <span className="flex items-center gap-1" style={{ color: '#767014' }}>
                            <Users className="h-4 w-4" />
                            All selected sessions have at least {seatsRequested} seat(s)
                          </span>
                        )}

                        {selection.availabilityStatus === "loading" && (
                          <span className="text-muted-foreground">Checking availability...</span>
                        )}

                        {selection.availabilityStatus === "error" && selection.availabilityError && (
                          <span style={{ color: '#000000' }}>{selection.availabilityError}</span>
                        )}
                      </div>

                      {showLeaderToggle && (
                        <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm" style={{ borderColor: '#C5BF81' }}>
                          <Checkbox
                            id={`leader-attending-${selection.id}`}
                            checked={selection.leaderAttending}
                            onCheckedChange={(checked) => handleLeaderAttendingToggle(index, checked)}
                          />
                          <Label
                            htmlFor={`leader-attending-${selection.id}`}
                            className="flex-1 cursor-pointer"
                          >
                            Leader is the attendee
                          </Label>
                        </div>
                      )}

                      {showCustomerInputs && (
                        <div className="space-y-3">
                          <h4 className="font-medium text-sm flex items-center gap-2" style={{ color: '#767014' }}>
                            <Users className="h-4 w-4" /> Attendee details
                          </h4>
                          <div className="space-y-4">
                            {normalizeCustomerSlots(
                              selection.customers,
                              selection.seatsRequested > 1 ? selection.seatsRequested : 1
                            ).map((customer, customerIndex) => (
                              <div
                                key={`${selection.id}-customer-${customerIndex}`}
                                className="grid gap-3 md:grid-cols-2 lg:grid-cols-4"
                              >
                                <div className="space-y-2">
                                  <Label style={{ color: '#767014', fontWeight: 600 }}>Name</Label>
                                  <Input
                                    value={customer.name}
                                    onChange={(event) =>
                                      handleCustomerChange(
                                        index,
                                        customerIndex,
                                        "name",
                                        event.target.value
                                      )
                                    }
                                    placeholder="Attendee name"
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label style={{ color: '#767014', fontWeight: 600 }}>Email</Label>
                                  <Input
                                    type="email"
                                    value={customer.email}
                                    onChange={(event) =>
                                      handleCustomerChange(
                                        index,
                                        customerIndex,
                                        "email",
                                        event.target.value
                                      )
                                    }
                                    placeholder="Attendee email"
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label style={{ color: '#767014', fontWeight: 600 }}>Phone</Label>
                                  <Input
                                    value={customer.phone || ""}
                                    onChange={(event) =>
                                      handleCustomerChange(
                                        index,
                                        customerIndex,
                                        "phone",
                                        event.target.value
                                      )
                                    }
                                    placeholder="Optional"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label style={{ color: '#767014', fontWeight: 600 }}>NIC / ID</Label>
                                  <Input
                                    value={customer.nic || ""}
                                    onChange={(event) =>
                                      handleCustomerChange(
                                        index,
                                        customerIndex,
                                        "nic",
                                        event.target.value
                                      )
                                    }
                                    placeholder="Optional"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="rounded-md px-4 py-3 text-sm" style={{ backgroundColor: 'rgba(197, 191, 129, 0.3)' }}>
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium" style={{ color: '#000000' }}>Summary</span>
                            {selection.seatsRequested > 0 && selectedSessionNames.length > 0 && (
                              <span className="text-muted-foreground flex items-center gap-2">
                                {selection.seatsRequested} seat(s)
                                <ArrowRight className="h-3.5 w-3.5" />
                                {selectedSessionNames.join(", ")}
                              </span>
                            )}
                            {selectedTypeLabels.length > 0 && (
                              <span className="text-muted-foreground">
                                • Types: {selectedTypeLabels.join(", ")}
                              </span>
                            )}
                          </div>

                          {/* Discount Information */}
                          {selection.discountLoading && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Calculating price...
                            </div>
                          )}

                          {!selection.discountLoading && selection.discountInfo && (
                            <div className="flex flex-col gap-1 pt-1 border-t" style={{ borderColor: 'rgba(118, 112, 20, 0.2)' }}>
                              <div className="flex items-center justify-between">
                                <span style={{ color: '#000000', opacity: 0.7 }}>
                                  Original (per seat): Rs. {selection.discountInfo.originalTotal.toFixed(2)}
                                </span>
                              </div>
                              {selection.discountInfo.appliedRule && (
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: '#767014', color: '#ffffff' }}>
                                    {selection.discountInfo.appliedRule.discountType === 'PERCENTAGE'
                                      ? `${selection.discountInfo.appliedRule.discountValue}% OFF`
                                      : `Rs. ${selection.discountInfo.appliedRule.discountValue} OFF`}
                                  </span>
                                  <span className="text-xs" style={{ color: '#767014' }}>
                                    {selection.discountInfo.appliedRule.name}
                                  </span>
                                </div>
                              )}
                              {selection.discountInfo.discountAmount > 0 && (
                                <div className="flex items-center justify-between text-sm">
                                  <span style={{ color: '#22c55e' }}>
                                    Discount: -Rs. {(selection.discountInfo.discountAmount * seatsRequested).toFixed(2)}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center justify-between font-medium">
                                <span style={{ color: '#767014' }}>
                                  Subtotal ({seatsRequested} seat{seatsRequested > 1 ? 's' : ''}): Rs. {(selection.discountInfo.finalTotal * seatsRequested).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          )}

                          {!selection.discountLoading && !selection.discountInfo && sessionIds.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Select sessions to see pricing
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm space-y-1">
              {totalDiscount > 0 && (
                <div style={{ color: '#22c55e' }}>
                  Total Discount: -Rs. {totalDiscount.toFixed(2)}
                </div>
              )}
              <div style={{ color: '#767014', fontWeight: 600 }}>
                Estimated total: {estimatedTotal > 0 ? `Rs. ${estimatedTotal.toFixed(2)}` : "—"}
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                style={{ borderColor: '#C5BF81', color: '#000000', backgroundColor: '#ffffff' }}
                onClick={() => {
                  setFormState((prev) => ({
                    leaderId: "",
                    bookedDate: "",
                    paymentType: prev.paymentType,
                    paymentMethod: "",
                    transactionId: "",
                    selections: [createSelection()],
                  }));
                  setFormError("");
                  setSubmissionStatus("idle");
                  setSubmissionMessage("");
                }}
              >
                Reset
              </Button>
              <Button type="submit" disabled={submissionStatus === "submitting"} style={{ background: 'linear-gradient(to right, #767014, #C5BF81)', color: '#ffffff' }}>
                {submissionStatus === "submitting" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  "Create booking"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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

    </form>
  );
}
