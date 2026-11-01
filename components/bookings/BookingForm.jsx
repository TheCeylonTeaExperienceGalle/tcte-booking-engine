"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { format } from "date-fns";
import { fetchWithAuth, AuthError } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  Plus,
  Trash2,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Clock,
  MapPin,
  Lock,
} from "lucide-react";
import { isSessionPastInColombo } from "@/lib/dateUtils";
import { validateGuestField } from "@/lib/validation";

function formatTimeLabel(raw) {
  if (!raw) return "--:--";
  const date = typeof raw === "string" ? new Date(raw) : raw;
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    if (typeof raw === "string" && /^\d{2}:\d{2}/.test(raw)) {
      return raw.slice(0, 5);
    }
    return "--:--";
  }
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
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
    discountInfo: null,
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

function reconstructSelectionsFromBooking(booking) {
  if (!booking?.items || booking.items.length === 0) {
    return [createSelection()];
  }

  const programGroups = new Map();
  for (const item of booking.items) {
    const programId = String(item.session?.programId || item.session?.program?.id || "");
    if (!programGroups.has(programId)) {
      programGroups.set(programId, []);
    }
    programGroups.get(programId).push(item);
  }

  const selections = [];
  for (const [programId, groupItems] of programGroups) {
    const firstItem = groupItems[0];
    const locationId = String(
      firstItem.session?.program?.locationId || firstItem.session?.program?.location?.id || ""
    );

    const sessionIdsSet = new Set();
    const sessionTypeById = {};
    const customersBySession = new Map();

    for (const item of groupItems) {
      const sId = String(item.sessionId);
      sessionIdsSet.add(sId);
      if (item.sessionTypeId) {
        sessionTypeById[sId] = String(item.sessionTypeId);
      }
      if (!customersBySession.has(sId)) {
        customersBySession.set(sId, []);
      }
      if (item.customer) {
        customersBySession.get(sId).push({
          name: item.customer.name || "",
          email: item.customer.email || "",
          phone: item.customer.phone || "",
          nic: item.customer.nic || "",
        });
      }
    }

    let maxSeats = 1;
    let combinedCustomers = [];
    let leaderAttending = false;

    for (const [, custs] of customersBySession) {
      if (custs.length > maxSeats) {
        maxSeats = custs.length;
      }
      if (custs.length > 0 && combinedCustomers.length === 0) {
        combinedCustomers = custs;
      }
    }

    if (combinedCustomers.length === 0) {
      leaderAttending = true;
      combinedCustomers = [];
    }

    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    selections.push({
      id,
      locationId,
      programId,
      sessionIds: Array.from(sessionIdsSet),
      sessionTypeById,
      seatsRequested: maxSeats,
      leaderAttending,
      customers: combinedCustomers,
      availabilityStatus: "idle",
      availabilityError: "",
      availabilityBySessionId: {},
      fallbackSeatsBySessionId: {},
      discountInfo: null,
      discountLoading: true,
    });
  }

  return selections.length > 0 ? selections : [createSelection()];
}

export default function BookingForm({ onSuccess, initialBooking, onCancel } = {}) {
  const isEditing = Boolean(initialBooking?.id);
  const [leaders, setLeaders] = useState([]);
  const [locations, setLocations] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [initialError, setInitialError] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);

  const errorSummaryRef = useRef(null);

  const [formState, setFormState] = useState(() => {
    if (initialBooking) {
      const formattedDate = initialBooking.bookedDate
        ? (typeof initialBooking.bookedDate === "string"
            ? initialBooking.bookedDate.split("T")[0]
            : format(new Date(initialBooking.bookedDate), "yyyy-MM-dd"))
        : "";
      return {
        leaderId:
          initialBooking.leader?.role === "LEADER" && initialBooking.leaderId
            ? String(initialBooking.leaderId)
            : "",
        bookedDate: formattedDate,
        paymentType: initialBooking.paymentType || "Full",
        paymentMethod: initialBooking.payment?.method || "",
        transactionId: initialBooking.payment?.transactionId || "",
        status: initialBooking.status || "PENDING",
        paidAmount:
          initialBooking.payment?.amount != null ? String(initialBooking.payment.amount) : "",
        selections: reconstructSelectionsFromBooking(initialBooking),
      };
    }
    return {
      leaderId: "",
      bookedDate: "",
      paymentType: "Full",
      paymentMethod: "",
      transactionId: "",
      status: "PENDING",
      paidAmount: "",
      selections: [createSelection()],
    };
  });

  // Validation state: map of field IDs to error message & list of summary strings
  const [fieldErrors, setFieldErrors] = useState({});
  const [validationSummary, setValidationSummary] = useState([]);

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

  const selectedLeader = useMemo(() => {
    return leaders.find((l) => String(l.id) === String(formState.leaderId)) || null;
  }, [leaders, formState.leaderId]);

  const estimatedTotal = useMemo(() => {
    return formState.selections.reduce((running, selection) => {
      if (!Array.isArray(selection.sessionIds) || selection.sessionIds.length === 0) {
        return running;
      }
      const seats = Number.parseInt(selection.seatsRequested, 10) || 0;
      if (seats <= 0) {
        return running;
      }

      if (
        selection.discountInfo &&
        typeof selection.discountInfo.finalTotal === "number" &&
        !isNaN(selection.discountInfo.finalTotal)
      ) {
        return running + selection.discountInfo.finalTotal * seats;
      }

      const selectionTotal = selection.sessionIds.reduce((subtotal, sessionId) => {
        const session = sessionsMap.get(sessionId);
        if (!session) return subtotal;
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
        if (price == null) return subtotal;
        return subtotal + price * seats;
      }, 0);

      return running + selectionTotal;
    }, 0);
  }, [formState.selections, sessionsMap]);

  const totalDiscount = useMemo(() => {
    return formState.selections.reduce((total, selection) => {
      if (selection.discountInfo) {
        const seats = Number.parseInt(selection.seatsRequested, 10) || 0;
        const discount = Number(selection.discountInfo.discountAmount) || 0;
        return total + discount * seats;
      }
      return total;
    }, 0);
  }, [formState.selections]);

  const loadInitialData = useCallback(async () => {
    setInitialLoading(true);
    setInitialError("");

    try {
      const [leadersRes, programsRes, sessionsRes, locationsRes] = await Promise.all([
        fetchWithAuth("/api/leaders?role=LEADER"),
        fetchWithAuth("/api/programs?includeLocation=true"),
        fetchWithAuth("/api/sessions?includeTypes=true"),
        fetchWithAuth("/api/locations").catch(() => fetch("/api/public/locations")),
      ]);

      const [leadersData, programsData, sessionsData, locationsData] = await Promise.all([
        leadersRes.json(),
        programsRes.json(),
        sessionsRes.json(),
        locationsRes ? locationsRes.json() : { locations: [] },
      ]);

      if (!leadersRes.ok) {
        throw new Error(leadersData?.error || "Failed to load travel agents");
      }
      if (!programsRes.ok) {
        throw new Error(programsData?.error || "Failed to load programs");
      }
      if (!sessionsRes.ok) {
        throw new Error(sessionsData?.error || "Failed to load sessions");
      }

      const rawLeaders = Array.isArray(leadersData.leaders) ? leadersData.leaders : [];
      setLeaders(rawLeaders.filter((l) => l.role === "LEADER"));
      setPrograms(Array.isArray(programsData.programs) ? programsData.programs : []);
      setSessions(Array.isArray(sessionsData.sessions) ? sessionsData.sessions : []);

      // Load locations directly from database
      const fetchedLocations = Array.isArray(locationsData?.locations)
        ? locationsData.locations
        : [];

      if (fetchedLocations.length > 0) {
        setLocations(fetchedLocations);
      } else {
        // Fallback: derive locations from programs if locations API was empty
        const map = new Map();
        (programsData.programs || []).forEach((program) => {
          const locId = program?.locationId ?? program?.location?.id;
          if (locId != null && !map.has(String(locId))) {
            map.set(String(locId), {
              id: locId,
              name: program?.location?.name || `Location ${locId}`,
              address: program?.location?.address || "",
            });
          }
        });
        setLocations(Array.from(map.values()));
      }
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
        const result = typeof updater === "function" ? updater(selection) : updater;
        return { ...selection, ...result };
      });
      return { ...prev, selections: nextSelections };
    });
  }

  function handleLeaderChange(value) {
    setFormState((prev) => ({ ...prev, leaderId: value }));
    clearFieldError("leaderId");
  }

  function handleFieldChange(event) {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
    clearFieldError(name);
  }

  function handlePaymentTypeChange(value) {
    setFormState((prev) => ({
      ...prev,
      paymentType: value,
      paidAmount: value === "Full" ? "" : prev.paidAmount,
    }));
    clearFieldError("paymentType");
    clearFieldError("paidAmount");
  }

  function clearFieldError(fieldId) {
    setFieldErrors((prev) => {
      if (!prev[fieldId]) return prev;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }

  // Calculate discounts for selection
  const calculateDiscountForSelection = useCallback(
    async (index, selection) => {
      const { programId, sessionIds, sessionTypeById } = selection;
      if (!programId || !sessionIds || sessionIds.length === 0) return;

      try {
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
            originalTotal:
              typeof data.originalTotal === "number" ? data.originalTotal : Number(data.originalTotal) || 0,
            discountAmount:
              typeof data.discountAmount === "number" ? data.discountAmount : Number(data.discountAmount) || 0,
            finalTotal:
              typeof data.finalTotal === "number" ? data.finalTotal : Number(data.finalTotal) || 0,
            appliedRule: data.appliedRule || null,
            priceBreakdown: Array.isArray(data.priceBreakdown) ? data.priceBreakdown : [],
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
    },
    []
  );

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
        discountLoading: true,
      };
    });
  }

  function handleSeatsChange(index, value) {
    const parsed = Number.parseInt(value, 10);
    const seats = Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;

    updateSelection(index, (selection) => {
      return {
        seatsRequested: seats,
        customers: normalizeCustomerSlots(selection.customers, seats),
      };
    });
    clearFieldError(`selection-${index}-seats`);
  }

  function handleLeaderAttendingToggle(index, checked) {
    updateSelection(index, (selection) => ({
      leaderAttending: Boolean(checked),
      customers: normalizeCustomerSlots(selection.customers, selection.seatsRequested),
    }));
  }

  function handleCustomerChange(selectionIndex, customerIndex, field, value) {
    updateSelection(selectionIndex, (selection) => {
      const customers = normalizeCustomerSlots(selection.customers, selection.seatsRequested);
      const nextCustomers = customers.map((customer, idx) =>
        idx === customerIndex ? { ...customer, [field]: value } : customer
      );
      return { customers: nextCustomers };
    });
    clearFieldError(`customer-${selectionIndex}-${customerIndex}-${field}`);
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
    clearFieldError(`selection-${index}-location`);
  }

  function handleAddSelection() {
    const firstLocId = formState.selections[0]?.locationId || "";
    const newSel = createSelection();
    if (firstLocId) {
      newSel.locationId = firstLocId;
    }
    setFormState((prev) => ({
      ...prev,
      selections: [...prev.selections, newSel],
    }));
  }

  function handleRemoveSelection(index) {
    setFormState((prev) => {
      if (prev.selections.length <= 1) return prev;
      return {
        ...prev,
        selections: prev.selections.filter((_, idx) => idx !== index),
      };
    });
  }

  function handleProgramChange(index, value) {
    updateSelection(index, () => ({
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
    clearFieldError(`selection-${index}-program`);
  }

  async function handleSessionToggle(index, sessionId, checked) {
    const stringId = String(sessionId);
    const selection = formState.selections[index];
    const prevSessionIds = selection.sessionIds || [];
    const nextSessionIds = checked
      ? [...new Set([...prevSessionIds, stringId])]
      : prevSessionIds.filter((id) => id !== stringId);

    const nextTypeMap = { ...(selection.sessionTypeById || {}) };
    if (!checked) {
      delete nextTypeMap[stringId];
    }

    updateSelection(index, () => ({
      sessionIds: nextSessionIds,
      sessionTypeById: nextTypeMap,
      discountLoading: nextSessionIds.length > 0,
      availabilityStatus: nextSessionIds.length > 0 ? "loading" : "idle",
      availabilityError: "",
    }));

    clearFieldError(`selection-${index}-sessions`);

    if (!formState.bookedDate || nextSessionIds.length === 0) {
      updateSelection(index, () => ({
        availabilityStatus: "idle",
        availabilityError: "",
        availabilityBySessionId: {},
        fallbackSeatsBySessionId: {},
      }));
      return;
    }

    try {
      const results = await Promise.all(
        nextSessionIds.map(async (sId) => {
          const params = new URLSearchParams({
            sessionId: sId,
            date: formState.bookedDate,
          });
          const response = await fetchWithAuth(`/api/availability?${params.toString()}`);
          if (!response.ok) {
            throw new Error(`Failed to check availability for session ${sId}`);
          }
          const data = await response.json();
          return { sessionId: sId, data };
        })
      );

      const availabilityBySessionId = {};
      const fallbackSeatsBySessionId = {};

      results.forEach(({ sessionId: sId, data }) => {
        availabilityBySessionId[sId] = {
          availableSeats: data.available,
          totalCapacity: data.totalCapacity,
          status: data.status,
        };
        fallbackSeatsBySessionId[sId] = data.available;
      });

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

  /**
   * Validate entire form at once (Item 10 & 11).
   * Flags ALL invalid fields with single message per field,
   * generates top summary, and scrolls to first invalid field.
   */
  function validateAllFields() {
    const errors = {};
    const summary = [];

    // 1. Travel Agent (Optional) - no validation error when empty

    // 2. Booking Date
    if (!formState.bookedDate) {
      errors.bookedDate = "Please select a booking date";
      summary.push("Booking date is required.");
    }

    // 3. Payment Method
    if (!formState.paymentMethod || !formState.paymentMethod.trim()) {
      errors.paymentMethod = "Please select or enter a payment method";
      summary.push("Payment method is required.");
    }

    // 4. Payment Type & Paid Amount
    if (formState.paymentType === "Partial") {
      const paid = parseFloat(formState.paidAmount);
      if (isNaN(paid) || paid <= 0) {
        errors.paidAmount = "Enter an advance payment amount greater than 0";
        summary.push("Advance payment amount is required for partial payment.");
      } else if (estimatedTotal > 0 && paid > estimatedTotal) {
        errors.paidAmount = `Advance payment cannot exceed total (USD ${estimatedTotal.toFixed(2)})`;
        summary.push(`Advance payment cannot exceed total USD ${estimatedTotal.toFixed(2)}.`);
      }
    }

    // 5. Selections
    if (!Array.isArray(formState.selections) || formState.selections.length === 0) {
      summary.push("Add at least one program or session selection.");
    } else {
      formState.selections.forEach((selection, sIdx) => {
        const selNum = sIdx + 1;

        if (!selection.locationId) {
          errors[`selection-${sIdx}-location`] = "Please choose a location";
          summary.push(`Selection ${selNum}: Location is required.`);
        }

        if (sIdx > 0 && selection.locationId && formState.selections[0]?.locationId) {
          if (selection.locationId !== formState.selections[0].locationId) {
            errors[`selection-${sIdx}-location`] = "Must match the location in Selection 1";
            summary.push(`Selection ${selNum}: All selections must belong to the same location.`);
          }
        }

        if (!selection.programId) {
          errors[`selection-${sIdx}-program`] = "Please choose a program";
          summary.push(`Selection ${selNum}: Program is required.`);
        }

        if (!Array.isArray(selection.sessionIds) || selection.sessionIds.length === 0) {
          errors[`selection-${sIdx}-sessions`] = "Please select at least one session";
          summary.push(`Selection ${selNum}: At least one session must be selected.`);
        }

        const seats = Number.parseInt(selection.seatsRequested, 10) || 0;
        if (seats < 1) {
          errors[`selection-${sIdx}-seats`] = "Seats requested must be at least 1";
          summary.push(`Selection ${selNum}: Seats requested must be at least 1.`);
        }

        // Validate attendee details
        const customers = normalizeCustomerSlots(selection.customers, seats);
        customers.forEach((customer, cIdx) => {
          const guestNum = cIdx + 1;
          const isAgentGuest = selection.leaderAttending && selectedLeader && cIdx === 0;

          // If Travel Agent is attending as Guest 1, agent info is provided via travel agent profile
          if (isAgentGuest) {
            if (!selectedLeader?.name || !selectedLeader?.email) {
              errors[`customer-${sIdx}-${cIdx}-name`] = "Selected Travel Agent is missing profile details";
              summary.push(`Selection ${selNum}, Guest ${guestNum} (Agent): Travel agent profile incomplete.`);
            }
            return;
          }

          // Validate Guest fields using shared validation helper
          const nameErr = validateGuestField("name", customer.name, true);
          if (nameErr) {
            errors[`customer-${sIdx}-${cIdx}-name`] = nameErr;
            summary.push(`Selection ${selNum}, Guest ${guestNum}: ${nameErr}.`);
          }

          const emailErr = validateGuestField("email", customer.email, true);
          if (emailErr) {
            errors[`customer-${sIdx}-${cIdx}-email`] = emailErr;
            summary.push(`Selection ${selNum}, Guest ${guestNum}: ${emailErr}.`);
          }

          const phoneErr = validateGuestField("phone", customer.phone, true);
          if (phoneErr) {
            errors[`customer-${sIdx}-${cIdx}-phone`] = phoneErr;
            summary.push(`Selection ${selNum}, Guest ${guestNum}: ${phoneErr}.`);
          }

          const nicErr = validateGuestField("nic", customer.nic, true);
          if (nicErr) {
            errors[`customer-${sIdx}-${cIdx}-nic`] = nicErr;
            summary.push(`Selection ${selNum}, Guest ${guestNum}: ${nicErr}.`);
          }
        });
      });
    }

    setFieldErrors(errors);
    setValidationSummary(summary);

    if (summary.length > 0) {
      // Scroll to error summary or first invalid element
      setTimeout(() => {
        const firstErrorKey = Object.keys(errors)[0];
        const el =
          (firstErrorKey && document.getElementById(firstErrorKey)) ||
          errorSummaryRef.current;
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          try {
            el.focus();
          } catch (e) {}
        }
      }, 50);
      return false;
    }

    return true;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmissionStatus("idle");
    setSubmissionMessage("");

    const isValid = validateAllFields();
    if (!isValid) return;

    const bookingSelections = [];

    formState.selections.forEach((selection, sIdx) => {
      const seatsRequested = Number.parseInt(selection.seatsRequested, 10) || 1;
      const sessionIds = Array.isArray(selection.sessionIds) ? selection.sessionIds : [];
      if (sessionIds.length === 0) return;

      const rawCustomers = normalizeCustomerSlots(selection.customers, seatsRequested);
      const customersPayload = rawCustomers.map((cust, cIdx) => {
        if (selection.leaderAttending && cIdx === 0 && selectedLeader) {
          return {
            name: selectedLeader.name.trim(),
            email: selectedLeader.email.trim(),
            phone: selectedLeader.contact?.trim() || null,
            nic: "AGENT",
          };
        }
        return {
          name: cust.name.trim(),
          email: cust.email.trim(),
          phone: cust.phone?.trim() || null,
          nic: cust.nic?.trim() || null,
        };
      });

      const sessionTypeMap = selection.sessionTypeById || {};

      sessionIds.forEach((sessionId) => {
        const parsedSessionId = Number.parseInt(sessionId, 10);
        if (Number.isNaN(parsedSessionId)) return;

        const selectionPayload = {
          sessionId: parsedSessionId,
          seatsRequested,
          customers: customersPayload,
        };

        const mappedType = sessionTypeMap[sessionId];
        if (mappedType) {
          const parsedTypeId = Number.parseInt(mappedType, 10);
          if (!Number.isNaN(parsedTypeId)) {
            selectionPayload.sessionTypeId = parsedTypeId;
          }
        }

        bookingSelections.push(selectionPayload);
      });
    });

    const parsedLeaderId =
      formState.leaderId && formState.leaderId !== "none"
        ? Number.parseInt(formState.leaderId, 10)
        : null;

    const payload = {
      leaderId: !Number.isNaN(parsedLeaderId) && parsedLeaderId ? parsedLeaderId : null,
      bookedDate: `${formState.bookedDate}T00:00:00.000Z`,
      status: formState.status,
      source: "ADMIN",
      selections: bookingSelections,
      customer: bookingSelections[0]?.customers?.[0] || null,
      payment: {
        paymentType: formState.paymentType,
        method: formState.paymentMethod.trim(),
        transactionId: isEditing ? formState.transactionId?.trim() : null,
        amount: estimatedTotal,
        paidAmount:
          formState.paymentType === "Partial" && formState.paidAmount !== ""
            ? Number(formState.paidAmount)
            : formState.paymentType === "Full"
            ? estimatedTotal
            : 0,
        full_payment_price: estimatedTotal,
      },
    };

    try {
      setSubmissionStatus("submitting");
      const url = isEditing ? `/api/bookings/${initialBooking.id}` : "/api/booking";
      const method = isEditing ? "PUT" : "POST";
      const response = await fetchWithAuth(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let data = null;
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        if (!response.ok) {
          throw new Error(`Server returned error ${response.status}: ${text.slice(0, 100)}`);
        }
      }

      if (!response.ok) {
        throw new Error(data?.error || (isEditing ? "Failed to update booking" : "Failed to create booking"));
      }

      setSubmissionStatus("success");
      const successMsg =
        data?.message ||
        (isEditing
          ? "Booking updated successfully"
          : `Booking created successfully! Reference: ${data?.booking?.payment?.orderId || data?.booking?.id || ""}`);
      setSubmissionMessage(successMsg);
      setSuccessMessage(successMsg);
      setSuccessDialogOpen(true);

      if (!isEditing) {
        setFormState({
          leaderId: "",
          bookedDate: "",
          paymentType: "Full",
          paymentMethod: "",
          transactionId: "",
          status: "PENDING",
          paidAmount: "",
          selections: [createSelection()],
        });
      }
    } catch (error) {
      const message =
        error instanceof AuthError
          ? error.message
          : error?.message || (isEditing ? "Failed to update booking" : "Failed to create booking");
      setSubmissionStatus("error");
      setSubmissionMessage(message);
      setErrorMessage(message);
      setErrorDialogOpen(true);
    }
  }

  if (initialLoading) {
    return (
      <Card className="border-2 shadow-sm" style={{ borderColor: "#C5BF81" }}>
        <CardContent className="flex flex-col items-center justify-center p-12 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#767014" }} />
          <p className="text-muted-foreground">Loading booking options...</p>
        </CardContent>
      </Card>
    );
  }

  if (initialError) {
    return (
      <Card className="border-2 shadow-sm" style={{ borderColor: "#C5BF81" }}>
        <CardContent className="space-y-4 p-6">
          <p className="font-semibold text-red-600">Failed to load booking resources</p>
          <p className="text-sm text-muted-foreground">{initialError}</p>
          <Button onClick={loadInitialData} style={{ backgroundColor: "#767014", color: "#ffffff" }}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Top Validation Error Summary (Item 10) */}
      {validationSummary.length > 0 && (
        <div
          ref={errorSummaryRef}
          className="rounded-lg border-2 border-red-500 bg-red-50 p-4 space-y-2 animate-in fade-in duration-300"
        >
          <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
            <span>Please correct the following errors before continuing:</span>
          </div>
          <ul className="list-disc list-inside text-xs text-red-600 space-y-1 pl-1">
            {validationSummary.map((msg, i) => (
              <li key={`summary-${i}`}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      <Card className="border-2 shadow-sm" style={{ borderColor: "#C5BF81" }}>
        <CardHeader className="space-y-1">
          <CardTitle style={{ color: "#767014" }}>
            {isEditing ? "Edit Booking Details" : "Create New Booking"}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? "Update booking session selection, attendees, or payment details."
              : "Configure session attendance, assign an optional travel agent, and capture payment details."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Main Info Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Travel Agent Selector (Item 4: Optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="leaderId" style={{ color: "#767014", fontWeight: 600 }}>
                Travel Agent <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
              </Label>
              <Select 
                value={formState.leaderId || "none"} 
                onValueChange={(val) => handleLeaderChange(val === "none" ? "" : val)}
              >
                <SelectTrigger id="leaderId" className={fieldErrors.leaderId ? "border-red-500 ring-1 ring-red-500" : ""}>
                  <SelectValue placeholder="Direct Booking (No Travel Agent)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">Direct Booking (No Travel Agent)</span>
                      <span className="text-xs text-muted-foreground">Standard direct customer booking without travel agent</span>
                    </div>
                  </SelectItem>
                  {leaders.map((leader) => (
                    <SelectItem key={leader.id} value={String(leader.id)}>
                      <div className="flex flex-col">
                        <span className="font-medium">{leader.displayName || leader.name}</span>
                        {leader.email && (
                          <span className="text-xs text-muted-foreground">
                            {leader.email} {leader.promoteCode ? `• Promo: ${leader.promoteCode}` : ""}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.leaderId && (
                <p className="text-xs text-red-600 font-medium">{fieldErrors.leaderId}</p>
              )}
            </div>

            {/* Booking Date */}
            <div className="space-y-1.5">
              <Label htmlFor="bookedDate" style={{ color: "#767014", fontWeight: 600 }}>
                Booking Date *
              </Label>
              <Input
                id="bookedDate"
                type="date"
                name="bookedDate"
                value={formState.bookedDate}
                onChange={handleFieldChange}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker?.();
                  } catch (err) {}
                }}
                className={`cursor-pointer ${fieldErrors.bookedDate ? "border-red-500 ring-1 ring-red-500" : ""}`}
              />
              {fieldErrors.bookedDate && (
                <p className="text-xs text-red-600 font-medium">{fieldErrors.bookedDate}</p>
              )}
            </div>

            {/* Payment Type (Item 5) */}
            <div className="space-y-1.5">
              <Label htmlFor="paymentType" style={{ color: "#767014", fontWeight: 600 }}>
                Payment Type *
              </Label>
              <Select value={formState.paymentType} onValueChange={handlePaymentTypeChange}>
                <SelectTrigger id="paymentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full">Pay Now (Full)</SelectItem>
                  <SelectItem value="Partial">Partial / Advance Payment</SelectItem>
                  <SelectItem value="Later">Pay Later</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <Label htmlFor="paymentMethod" style={{ color: "#767014", fontWeight: 600 }}>
                Payment Method *
              </Label>
              <Select
                value={formState.paymentMethod}
                onValueChange={(val) => {
                  setFormState((prev) => ({ ...prev, paymentMethod: val }));
                  clearFieldError("paymentMethod");
                }}
              >
                <SelectTrigger
                  id="paymentMethod"
                  className={fieldErrors.paymentMethod ? "border-red-500 ring-1 ring-red-500" : ""}
                >
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Credit / Debit Card">Credit / Debit Card</SelectItem>
                  <SelectItem value="Online Transfer">Online Transfer</SelectItem>
                  <SelectItem value="Bank Wire">Bank Wire</SelectItem>
                  <SelectItem value="Pay at Counter">Pay at Counter</SelectItem>
                  <SelectItem value="Direct / Manual">Direct / Manual</SelectItem>
                  {formState.paymentMethod &&
                    ![
                      "Credit / Debit Card",
                      "Online Transfer",
                      "Bank Wire",
                      "Pay at Counter",
                      "Direct / Manual",
                    ].includes(formState.paymentMethod) && (
                      <SelectItem value={formState.paymentMethod}>
                        {formState.paymentMethod}
                      </SelectItem>
                    )}
                </SelectContent>
              </Select>
              {fieldErrors.paymentMethod && (
                <p className="text-xs text-red-600 font-medium">{fieldErrors.paymentMethod}</p>
              )}
            </div>

            {/* Transaction Reference (Item 9: Read-only auto-generated) */}
            <div className="space-y-1.5 md:col-span-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="transactionId" style={{ color: "#767014", fontWeight: 600 }}>
                  Transaction Reference (Auto-generated)
                </Label>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3" /> System Managed
                </span>
              </div>
              <Input
                id="transactionId"
                name="transactionId"
                readOnly
                disabled
                value={
                  isEditing
                    ? formState.transactionId || "TXN-AUTO"
                    : "Auto-generated upon confirmation (e.g. TXN-000001)"
                }
                className="bg-muted text-muted-foreground cursor-not-allowed font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Sequential running reference (TXN-XXXXXX) is generated on the server inside a database transaction to guarantee uniqueness.
              </p>
            </div>

            {/* Advance Amount (Item 5: when Partial Payment is selected) */}
            {formState.paymentType === "Partial" && (
              <div className="space-y-1.5 md:col-span-2 bg-[#767014]/5 p-3 rounded-lg border" style={{ borderColor: "#C5BF81" }}>
                <div className="flex justify-between items-center">
                  <Label htmlFor="paidAmount" style={{ color: "#767014", fontWeight: 600 }}>
                    Advance Amount to Pay Now (USD) *
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    Estimated Total: USD {(Number(estimatedTotal) || 0).toFixed(2)}
                  </span>
                </div>
                <Input
                  id="paidAmount"
                  name="paidAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={estimatedTotal || undefined}
                  value={formState.paidAmount}
                  onChange={handleFieldChange}
                  placeholder="e.g. 50.00"
                  className={fieldErrors.paidAmount ? "border-red-500 ring-1 ring-red-500" : ""}
                />
                {fieldErrors.paidAmount && (
                  <p className="text-xs text-red-600 font-medium">{fieldErrors.paidAmount}</p>
                )}
                <p className="text-xs text-muted-foreground font-medium">
                  Remaining balance due on arrival: USD{" "}
                  {Math.max(
                    0,
                    (Number(estimatedTotal) || 0) - (parseFloat(formState.paidAmount) || 0)
                  ).toFixed(2)}
                </p>
              </div>
            )}

            {/* Editing Status Selector */}
            {isEditing && (
              <div className="space-y-1.5">
                <Label htmlFor="bookingStatus" style={{ color: "#767014", fontWeight: 600 }}>
                  Booking Status
                </Label>
                <Select
                  value={formState.status || "PENDING"}
                  onValueChange={(val) => setFormState((prev) => ({ ...prev, status: val }))}
                >
                  <SelectTrigger id="bookingStatus">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">PENDING (Awaiting payment/confirmation)</SelectItem>
                    <SelectItem value="CONFIRMED">CONFIRMED (Approved & verified)</SelectItem>
                    <SelectItem value="PAID">PAID (Payment completed)</SelectItem>
                    <SelectItem value="CANCELLED">CANCELLED (Cancelled)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Separator />

          {/* Session Groups & Selections (Item 8: Multi-session support) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold" style={{ color: "#767014" }}>
                  Programs & Session Selections
                </h3>
                <p className="text-sm text-muted-foreground">
                  Select multiple programs and sessions for this date, pick activities per session, and assign attendees.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleAddSelection}
                variant="outline"
                size="sm"
                style={{ borderColor: "#767014", color: "#767014", backgroundColor: "#ffffff" }}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Program Selection
              </Button>
            </div>

            <div className="space-y-6">
              {formState.selections.map((selection, index) => {
                // Filter programs by selected location (Item 6)
                const availablePrograms = selection.locationId
                  ? programs.filter(
                      (program) =>
                        String(program.locationId ?? program.location?.id) === selection.locationId
                    )
                  : programs;

                const availableSessions = selection.programId
                  ? sessionsByProgram.get(selection.programId) || []
                  : [];

                const sessionIds = Array.isArray(selection.sessionIds) ? selection.sessionIds : [];
                const sessionTypeMap = selection.sessionTypeById || {};
                const availabilityMap = selection.availabilityBySessionId || {};
                const fallbackMap = selection.fallbackSeatsBySessionId || {};
                const seatsRequested = Number.parseInt(selection.seatsRequested, 10) || 1;

                const selectedSessionNames = sessionIds
                  .map((sessionId) => sessionsMap.get(sessionId)?.name)
                  .filter(Boolean);

                return (
                  <Card
                    key={selection.id}
                    className="border-2 shadow-sm"
                    style={{ borderColor: "#C5BF81" }}
                  >
                    <CardHeader className="space-y-1 bg-muted/20 pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-base" style={{ color: "#767014" }}>
                            Selection Group #{index + 1}
                          </CardTitle>
                          <CardDescription>
                            Configure location, session activities, and attendees for this group.
                          </CardDescription>
                        </div>
                        {formState.selections.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                            onClick={() => handleRemoveSelection(index)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remove Group
                          </Button>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-4">
                      {/* Location, Program, Seats Requested Grid */}
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {/* Location Dropdown (Item 6: Lists all active DB locations) */}
                        <div className="space-y-1.5">
                          <Label style={{ color: "#767014", fontWeight: 600 }}>Location *</Label>
                          <Select
                            value={selection.locationId}
                            onValueChange={(val) => handleLocationChange(index, val)}
                          >
                            <SelectTrigger
                              id={`selection-${index}-location`}
                              className={
                                fieldErrors[`selection-${index}-location`]
                                  ? "border-red-500 ring-1 ring-red-500"
                                  : ""
                              }
                            >
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                            <SelectContent>
                              {locations.length === 0 && (
                                <SelectItem value="__no_locations__" disabled>
                                  No locations available
                                </SelectItem>
                              )}
                              {locations.map((loc) => (
                                <SelectItem key={loc.id} value={String(loc.id)}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{loc.name}</span>
                                    {loc.address && (
                                      <span className="text-xs text-muted-foreground">{loc.address}</span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldErrors[`selection-${index}-location`] && (
                            <p className="text-xs text-red-600 font-medium">
                              {fieldErrors[`selection-${index}-location`]}
                            </p>
                          )}
                        </div>

                        {/* Program Dropdown (Filtered by location) */}
                        <div className="space-y-1.5">
                          <Label style={{ color: "#767014", fontWeight: 600 }}>Program *</Label>
                          <Select
                            value={selection.programId}
                            onValueChange={(val) => handleProgramChange(index, val)}
                            disabled={!selection.locationId || availablePrograms.length === 0}
                          >
                            <SelectTrigger
                              id={`selection-${index}-program`}
                              className={
                                fieldErrors[`selection-${index}-program`]
                                  ? "border-red-500 ring-1 ring-red-500"
                                  : ""
                              }
                            >
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
                              {availablePrograms.map((prog) => (
                                <SelectItem key={prog.id} value={String(prog.id)}>
                                  {prog.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldErrors[`selection-${index}-program`] && (
                            <p className="text-xs text-red-600 font-medium">
                              {fieldErrors[`selection-${index}-program`]}
                            </p>
                          )}
                        </div>

                        {/* Seats Requested */}
                        <div className="space-y-1.5">
                          <Label
                            htmlFor={`seats-${selection.id}`}
                            style={{ color: "#767014", fontWeight: 600 }}
                          >
                            Seats Requested *
                          </Label>
                          <Input
                            id={`seats-${selection.id}`}
                            type="number"
                            min={1}
                            value={selection.seatsRequested}
                            onChange={(e) => handleSeatsChange(index, e.target.value)}
                            className={
                              fieldErrors[`selection-${index}-seats`]
                                ? "border-red-500 ring-1 ring-red-500"
                                : ""
                            }
                          />
                          {fieldErrors[`selection-${index}-seats`] && (
                            <p className="text-xs text-red-600 font-medium">
                              {fieldErrors[`selection-${index}-seats`]}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Sessions List (Item 8: Past sessions blocking) */}
                      <div className="space-y-2">
                        <Label style={{ color: "#767014", fontWeight: 600 }}>
                          Select Sessions *
                        </Label>
                        {fieldErrors[`selection-${index}-sessions`] && (
                          <p className="text-xs text-red-600 font-medium">
                            {fieldErrors[`selection-${index}-sessions`]}
                          </p>
                        )}
                        <div
                          className="space-y-3 rounded-md border p-3"
                          style={{ borderColor: "#C5BF81" }}
                        >
                          {availableSessions.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              {selection.programId
                                ? "No sessions found for this program."
                                : "Select a program above to view available sessions."}
                            </p>
                          ) : (
                            availableSessions.map((session) => {
                              const sessionIdString = String(session.id);
                              const isSelected = sessionIds.includes(sessionIdString);
                              const isPast =
                                Boolean(formState.bookedDate) &&
                                isSessionPastInColombo(formState.bookedDate, session.startTime);

                              const availabilityRecord = availabilityMap[sessionIdString] || null;
                              const fallbackSeats = fallbackMap[sessionIdString] ?? null;
                              const resolvedSeats =
                                availabilityRecord?.availableSeats != null
                                  ? availabilityRecord.availableSeats
                                  : fallbackSeats;
                              const hasCapacity =
                                resolvedSeats != null && resolvedSeats >= seatsRequested;

                              return (
                                <div
                                  key={session.id}
                                  className={`rounded-md p-3 space-y-2 border ${
                                    isPast
                                      ? "bg-muted/40 opacity-60 cursor-not-allowed"
                                      : isSelected
                                      ? "bg-[#767014]/5 border-[#767014]"
                                      : "bg-muted/15 border-border"
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <Checkbox
                                      id={`session-${selection.id}-${session.id}`}
                                      checked={isSelected}
                                      disabled={isPast || !selection.programId}
                                      onCheckedChange={(checked) =>
                                        handleSessionToggle(index, sessionIdString, checked)
                                      }
                                    />
                                    <div className="flex-1 space-y-1.5">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <label
                                          htmlFor={`session-${selection.id}-${session.id}`}
                                          className={`text-sm font-semibold flex items-center gap-2 cursor-pointer ${
                                            isPast ? "cursor-not-allowed" : ""
                                          }`}
                                        >
                                          <span>{session.name}</span>
                                          {isPast && (
                                            <Badge variant="outline" className="text-xs text-amber-700 bg-amber-50 border-amber-300">
                                              Passed in Sri Lanka time
                                            </Badge>
                                          )}
                                        </label>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                          <Clock className="h-3.5 w-3.5" />
                                          <span>
                                            {formatTimeLabel(session.startTime)} – {formatTimeLabel(session.endTime)}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Availability Badge */}
                                      {isSelected && !isPast && (
                                        <div className="text-xs flex items-center gap-2">
                                          {selection.availabilityStatus === "loading" ? (
                                            <span className="text-muted-foreground flex items-center gap-1">
                                              <Loader2 className="h-3 w-3 animate-spin" /> Checking capacity...
                                            </span>
                                          ) : resolvedSeats != null ? (
                                            <span
                                              className={
                                                hasCapacity ? "text-emerald-700 font-medium" : "text-red-600 font-bold"
                                              }
                                            >
                                              {resolvedSeats} seat{resolvedSeats !== 1 ? "s" : ""} remaining{" "}
                                              {!hasCapacity && `(Need ${seatsRequested})`}
                                            </span>
                                          ) : null}
                                        </div>
                                      )}

                                      {/* Session Types / Activity Options */}
                                      {isSelected && !isPast && session.sessionTypes?.length > 0 && (
                                        <div className="pt-2">
                                          <Select
                                            value={sessionTypeMap[sessionIdString] || "__none__"}
                                            onValueChange={(val) =>
                                              handleSessionTypeChange(index, sessionIdString, val)
                                            }
                                          >
                                            <SelectTrigger className="w-full text-xs h-8">
                                              <SelectValue placeholder="Select activity option (optional)" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="__none__">Standard Session</SelectItem>
                                              {session.sessionTypes.map((type) => (
                                                <SelectItem key={type.id} value={String(type.id)}>
                                                  <span className="flex items-center justify-between gap-4 w-full">
                                                    <span>{type.name}</span>
                                                    <span className="text-xs text-muted-foreground font-semibold">
                                                      {type.price != null
                                                        ? `+USD ${type.price.toLocaleString()}`
                                                        : "Included"}
                                                    </span>
                                                  </span>
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

                      {/* Travel Agent is attending checkbox (Visible only when Travel Agent is selected) */}
                      {sessionIds.length > 0 && selectedLeader && (
                        <div
                          className="flex items-center gap-2 rounded-md border px-3.5 py-2.5 text-sm bg-[#767014]/5"
                          style={{ borderColor: "#C5BF81" }}
                        >
                          <Checkbox
                            id={`leader-attending-${selection.id}`}
                            checked={selection.leaderAttending}
                            onCheckedChange={(checked) =>
                              handleLeaderAttendingToggle(index, checked)
                            }
                          />
                          <Label
                            htmlFor={`leader-attending-${selection.id}`}
                            className="flex-1 cursor-pointer font-medium text-foreground"
                          >
                            Travel Agent is attending (Agent counts as Guest 1)
                          </Label>
                        </div>
                      )}

                      {/* Attendee Details Grid (Items 10 & 11) */}
                      {sessionIds.length > 0 && (
                        <div className="space-y-3 pt-2">
                          <h4
                            className="font-semibold text-sm flex items-center gap-2"
                            style={{ color: "#767014" }}
                          >
                            <Users className="h-4 w-4" /> Guest Details ({seatsRequested} Attendee{seatsRequested !== 1 ? "s" : ""})
                          </h4>

                          <div className="space-y-4">
                            {normalizeCustomerSlots(selection.customers, seatsRequested).map(
                              (customer, cIdx) => {
                                const isAgentGuest = selection.leaderAttending && cIdx === 0;

                                return (
                                  <div
                                    key={`${selection.id}-cust-${cIdx}`}
                                    className={`p-3.5 rounded-lg border space-y-3 ${
                                      isAgentGuest
                                        ? "bg-amber-50/50 border-amber-300"
                                        : "bg-muted/10 border-border"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between text-xs font-semibold">
                                      <span style={{ color: "#767014" }}>
                                        Guest {cIdx + 1}
                                        {isAgentGuest && (
                                          <Badge className="ml-2 bg-[#767014] text-white text-[10px]">
                                            Travel Agent
                                          </Badge>
                                        )}
                                      </span>
                                      {isAgentGuest && (
                                        <span className="text-muted-foreground font-normal">
                                          Auto-populated from selected Travel Agent
                                        </span>
                                      )}
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                                      {/* Name */}
                                      <div className="space-y-1">
                                        <Label className="text-xs font-semibold">Full Name *</Label>
                                        <Input
                                          id={`customer-${index}-${cIdx}-name`}
                                          value={
                                            isAgentGuest
                                              ? selectedLeader?.name || ""
                                              : customer.name
                                          }
                                          disabled={isAgentGuest}
                                          onChange={(e) =>
                                            handleCustomerChange(index, cIdx, "name", e.target.value)
                                          }
                                          placeholder="Guest name"
                                          className={`text-xs h-8 ${
                                            fieldErrors[`customer-${index}-${cIdx}-name`]
                                              ? "border-red-500 ring-1 ring-red-500"
                                              : ""
                                          }`}
                                        />
                                        {fieldErrors[`customer-${index}-${cIdx}-name`] && (
                                          <p className="text-[11px] text-red-600 font-medium">
                                            {fieldErrors[`customer-${index}-${cIdx}-name`]}
                                          </p>
                                        )}
                                      </div>

                                      {/* Email */}
                                      <div className="space-y-1">
                                        <Label className="text-xs font-semibold">Email *</Label>
                                        <Input
                                          id={`customer-${index}-${cIdx}-email`}
                                          type="email"
                                          value={
                                            isAgentGuest
                                              ? selectedLeader?.email || ""
                                              : customer.email
                                          }
                                          disabled={isAgentGuest}
                                          onChange={(e) =>
                                            handleCustomerChange(index, cIdx, "email", e.target.value)
                                          }
                                          placeholder="email@example.com"
                                          className={`text-xs h-8 ${
                                            fieldErrors[`customer-${index}-${cIdx}-email`]
                                              ? "border-red-500 ring-1 ring-red-500"
                                              : ""
                                          }`}
                                        />
                                        {fieldErrors[`customer-${index}-${cIdx}-email`] && (
                                          <p className="text-[11px] text-red-600 font-medium">
                                            {fieldErrors[`customer-${index}-${cIdx}-email`]}
                                          </p>
                                        )}
                                      </div>

                                      {/* WhatsApp No: Mandatory, no 10-digit format restriction */}
                                      <div className="space-y-1">
                                        <Label className="text-xs font-semibold">WhatsApp No *</Label>
                                        <Input
                                          id={`customer-${index}-${cIdx}-phone`}
                                          value={
                                            isAgentGuest
                                              ? selectedLeader?.contact || ""
                                              : customer.phone || ""
                                          }
                                          disabled={isAgentGuest}
                                          onChange={(e) =>
                                            handleCustomerChange(index, cIdx, "phone", e.target.value)
                                          }
                                          placeholder="e.g. 0771234567 or +9477..."
                                          className={`text-xs h-8 ${
                                            fieldErrors[`customer-${index}-${cIdx}-phone`]
                                              ? "border-red-500 ring-1 ring-red-500"
                                              : ""
                                          }`}
                                        />
                                        {fieldErrors[`customer-${index}-${cIdx}-phone`] && (
                                          <p className="text-[11px] text-red-600 font-medium">
                                            {fieldErrors[`customer-${index}-${cIdx}-phone`]}
                                          </p>
                                        )}
                                      </div>

                                      {/* ID / Passport (Item 11: Text required only, no regex format) */}
                                      <div className="space-y-1">
                                        <Label className="text-xs font-semibold">ID / Passport *</Label>
                                        <Input
                                          id={`customer-${index}-${cIdx}-nic`}
                                          value={isAgentGuest ? "AGENT" : customer.nic || ""}
                                          disabled={isAgentGuest}
                                          onChange={(e) =>
                                            handleCustomerChange(index, cIdx, "nic", e.target.value)
                                          }
                                          placeholder="NIC / Passport text"
                                          className={`text-xs h-8 ${
                                            fieldErrors[`customer-${index}-${cIdx}-nic`]
                                              ? "border-red-500 ring-1 ring-red-500"
                                              : ""
                                          }`}
                                        />
                                        {fieldErrors[`customer-${index}-${cIdx}-nic`] && (
                                          <p className="text-[11px] text-red-600 font-medium">
                                            {fieldErrors[`customer-${index}-${cIdx}-nic`]}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                            )}
                          </div>
                        </div>
                      )}

                      {/* Group Summary & Discount Box */}
                      <div
                        className="rounded-md px-4 py-3 text-sm"
                        style={{ backgroundColor: "rgba(197, 191, 129, 0.25)" }}
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-foreground">
                              Selection #{index + 1} Summary
                            </span>
                            {selection.seatsRequested > 0 && selectedSessionNames.length > 0 && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                                {selection.seatsRequested} seat(s)
                                <ArrowRight className="h-3 w-3" />
                                {selectedSessionNames.join(", ")}
                              </span>
                            )}
                          </div>

                          {/* Discount Breakdown */}
                          {selection.discountLoading && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Calculating applicable discounts...
                            </div>
                          )}

                          {!selection.discountLoading && selection.discountInfo && (
                            <div className="flex flex-col gap-1 pt-1 border-t text-xs border-[#767014]/20">
                              {selection.discountInfo.appliedRule && (
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-[#767014] text-white text-[10px]">
                                    {selection.discountInfo.appliedRule.discountType === "PERCENTAGE"
                                      ? `${selection.discountInfo.appliedRule.discountValue}% OFF`
                                      : `USD ${(Number(selection.discountInfo.appliedRule.discountValue) || 0).toFixed(2)} OFF`}
                                  </Badge>
                                  <span className="text-[#767014] font-medium">
                                    {selection.discountInfo.appliedRule.name} (Multi-session rule)
                                  </span>
                                </div>
                              )}
                              {(Number(selection.discountInfo.discountAmount) || 0) > 0 && (
                                <div className="flex items-center justify-between text-emerald-700 font-semibold">
                                  <span>Multi-Session Discount:</span>
                                  <span>
                                    -USD{" "}
                                    {(
                                      (Number(selection.discountInfo.discountAmount) || 0) *
                                      seatsRequested
                                    ).toFixed(2)}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center justify-between font-bold text-sm text-[#767014] pt-0.5">
                                <span>Group Subtotal ({seatsRequested} guest{seatsRequested !== 1 ? "s" : ""}):</span>
                                <span>
                                  USD{" "}
                                  {(
                                    (Number(selection.discountInfo.finalTotal) || 0) * seatsRequested
                                  ).toFixed(2)}
                                </span>
                              </div>
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

          {/* Bottom Payment Summary & Confirmation Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div className="space-y-1">
              {totalDiscount > 0 && (
                <div className="text-sm font-semibold text-emerald-700">
                  Total Multi-Session Savings: -USD {(Number(totalDiscount) || 0).toFixed(2)}
                </div>
              )}
              <div className="text-xl font-bold" style={{ color: "#767014" }}>
                Estimated Total: {estimatedTotal > 0 ? `USD ${estimatedTotal.toFixed(2)}` : "—"}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={submissionStatus === "submitting"}
                className="text-white font-semibold shadow-md hover:shadow-lg min-w-[140px]"
                style={{ background: "linear-gradient(to right, #767014, #C5BF81)" }}
              >
                {submissionStatus === "submitting" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : isEditing ? (
                  "Update Booking"
                ) : (
                  "Confirm Booking"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Success Dialog */}
      <AlertDialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <AlertDialogContent className="border-2" style={{ borderColor: "#C5BF81" }}>
          <AlertDialogHeader>
            <div
              className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-3"
              style={{ background: "linear-gradient(135deg, #767014, #C5BF81)" }}
            >
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <AlertDialogTitle className="text-center text-xl" style={{ color: "#767014" }}>
              Booking Confirmed!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm text-foreground">
              {successMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction
              onClick={() => {
                setSuccessDialogOpen(false);
                if (onSuccess) onSuccess();
              }}
              style={{ background: "linear-gradient(135deg, #767014, #C5BF81)", color: "#ffffff" }}
            >
              Done
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Dialog */}
      <AlertDialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <AlertDialogContent className="border-2" style={{ borderColor: "#C5BF81" }}>
          <AlertDialogHeader>
            <div
              className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-3"
              style={{ backgroundColor: "rgba(197, 191, 129, 0.3)" }}
            >
              <XCircle className="h-8 w-8" style={{ color: "#767014" }} />
            </div>
            <AlertDialogTitle className="text-center text-xl text-red-600">
              Unable to Save Booking
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm text-foreground">
              {errorMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction
              onClick={() => setErrorDialogOpen(false)}
              style={{ backgroundColor: "#767014", color: "#ffffff" }}
            >
              Review Form
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}