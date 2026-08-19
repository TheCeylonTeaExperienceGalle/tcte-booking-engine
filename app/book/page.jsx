"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { format } from "date-fns";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LoadingScreen from "@/components/LoadingScreen";
import FloatingActionButtons from "@/components/FloatingActionButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { FaCheckCircle, FaWhatsapp, FaCalendarAlt, FaCheck, FaUsers } from "react-icons/fa";
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from "libphonenumber-js";
import metadata from "libphonenumber-js/metadata.min.json";
import { resolvePaymentPlan } from "@/lib/pricing/booking-pricing";

// Dummy availability data until the API layer is ready
const SEASON_AVAILABILITY = {
  "2025-11-20": [
    {
      id: "N1",
      window: "08:00 - 10:00",
      activities: [
        { name: "Plucking", available: 2, capacity: 8 },
        { name: "Making", available: 4, capacity: 10 },
        { name: "Tasting", available: 1, capacity: 6 },
      ],
    },
    {
      id: "N2",
      window: "10:30 - 12:30",
      activities: [
        { name: "Plucking", available: 3, capacity: 8 },
        { name: "Making", available: 2, capacity: 10 },
        { name: "Tasting", available: 2, capacity: 6 },
      ],
    },
    {
      id: "N3",
      window: "14:00 - 16:00",
      activities: [
        { name: "Plucking", available: 4, capacity: 8 },
        { name: "Making", available: 1, capacity: 10 },
        { name: "Tasting", available: 3, capacity: 6 },
      ],
    },
    {
      id: "N4",
      window: "16:30 - 18:30",
      activities: [
        { name: "Plucking", available: 1, capacity: 8 },
        { name: "Making", available: 5, capacity: 10 },
        { name: "Tasting", available: 2, capacity: 6 },
      ],
    },
  ],
  fallback: [
    {
      id: "N1",
      window: "08:00 - 10:00",
      activities: [
        { name: "Plucking", available: 5, capacity: 8 },
        { name: "Making", available: 6, capacity: 10 },
        { name: "Tasting", available: 4, capacity: 6 },
      ],
    },
    {
      id: "N2",
      window: "10:30 - 12:30",
      activities: [
        { name: "Plucking", available: 4, capacity: 8 },
        { name: "Making", available: 5, capacity: 10 },
        { name: "Tasting", available: 3, capacity: 6 },
      ],
    },
    {
      id: "N3",
      window: "14:00 - 16:00",
      activities: [
        { name: "Plucking", available: 6, capacity: 8 },
        { name: "Making", available: 4, capacity: 10 },
        { name: "Tasting", available: 5, capacity: 6 },
      ],
    },
    {
      id: "N4",
      window: "16:30 - 18:30",
      activities: [
        { name: "Plucking", available: 3, capacity: 8 },
        { name: "Making", available: 7, capacity: 10 },
        { name: "Tasting", available: 4, capacity: 6 },
      ],
    },
  ],
};

const FALLBACK_LOCATIONS = [
  "Hill Country Estate",
  "Mountain View Plantation",
  "Valley Gardens",
  "Sunrise Estate",
];

export default function BookNow() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState();
  const [showCalendar, setShowCalendar] = useState(false);
  const calendarRef = useRef(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    countryCode: "LK",
    phone: "",
    location: "",
    programIds: [],
    packs: 1,
    payment: "Full",
    notes: "",
    promoCode: "",
  });
  const [seasonSelections, setSeasonSelections] = useState({});
  const [useGlobalSeatCount, setUseGlobalSeatCount] = useState(false);
  const [globalSeatCount, setGlobalSeatCount] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [referenceCode, setReferenceCode] = useState("");
  const [programOptions, setProgramOptions] = useState([]);
  const [programsLoading, setProgramsLoading] = useState(false);
  const [programsError, setProgramsError] = useState("");
  const [currentStage, setCurrentStage] = useState("guests");
  const [guestDetails, setGuestDetails] = useState([]);
  const [verifiedLeader, setVerifiedLeader] = useState(null);
  const [promoStatus, setPromoStatus] = useState({ state: "idle", message: "" });
  const [phoneValidation, setPhoneValidation] = useState({ state: "idle", message: "" });
  const [validatedPhoneNumber, setValidatedPhoneNumber] = useState(null);
  const [discountInfo, setDiscountInfo] = useState(null);
  const [discountLoading, setDiscountLoading] = useState(false);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    };

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCalendar]);

  const regionDisplayNames = useMemo(() => {
    try {
      return new Intl.DisplayNames(["en"], { type: "region" });
    } catch (error) {
      return null;
    }
  }, []);

  const countryOptions = useMemo(() => {
    const isoCodes = getCountries(metadata) ?? [];

    return isoCodes
      .map((isoCode) => {
        try {
          const dial = getCountryCallingCode(isoCode, metadata);
          const countryName = regionDisplayNames?.of(isoCode) ?? isoCode;

          if (!dial) {
            return null;
          }

          return {
            iso: isoCode,
            dial: `+${dial}`,
            label: `${countryName} (+${dial})`,
            sortKey: countryName?.toUpperCase() ?? isoCode,
          };
        } catch (error) {
          return null;
        }
      })
      .filter((option) => option !== null)
      .sort((a, b) => (a.sortKey > b.sortKey ? 1 : a.sortKey < b.sortKey ? -1 : 0));
  }, [regionDisplayNames]);

  useEffect(() => {
    if (countryOptions.length === 0) {
      return;
    }

    const hasSelectedCountry = countryOptions.some(
      (option) => option.iso === formData.countryCode
    );

    if (!hasSelectedCountry) {
      setFormData((prev) => ({
        ...prev,
        countryCode: countryOptions[0]?.iso ?? "",
      }));
    }
  }, [countryOptions, formData.countryCode]);

  const rangesOverlap = useCallback((first, second) => {
    if (!first?.startTime || !first?.endTime || !second?.startTime || !second?.endTime) {
      return false;
    }

    const firstStart = new Date(first.startTime).getTime();
    const firstEnd = new Date(first.endTime).getTime();
    const secondStart = new Date(second.startTime).getTime();
    const secondEnd = new Date(second.endTime).getTime();

    if (
      Number.isNaN(firstStart) ||
      Number.isNaN(firstEnd) ||
      Number.isNaN(secondStart) ||
      Number.isNaN(secondEnd)
    ) {
      return false;
    }

    return firstStart < secondEnd && firstEnd > secondStart;
  }, []);

  const formatTimeRange = useCallback((startIso, endIso) => {
    const formatTimeOfDay = (isoString) => {
      if (!isoString) return "";
      const date = new Date(isoString);
      if (Number.isNaN(date.getTime())) return "";

      // Sessions are stored in the DB as SQL TIME fields which Prisma maps
      // to JS Date objects anchored at 1970-01-01 in UTC. When that's the
      // case we should read the UTC hours/minutes to get the intended
      // time-of-day (avoid local timezone shift). For full datetimes use
      // local time display.
      const useUtc = date.getUTCFullYear() === 1970;
      const hours = String(useUtc ? date.getUTCHours() : date.getHours()).padStart(2, "0");
      const minutes = String(useUtc ? date.getUTCMinutes() : date.getMinutes()).padStart(2, "0");
      return `${hours}:${minutes}`;
    };

    const startLabel = formatTimeOfDay(startIso);
    const endLabel = formatTimeOfDay(endIso);

    if (!startLabel || !endLabel) return "";

    return `${startLabel} - ${endLabel}`;
  }, []);

  const availabilityForDate = useMemo(() => {
    if (!selectedDate || programOptions.length === 0) return null;

    return programOptions.map((program) => {
      const programId = program.id ?? program.title ?? "";
      const parsedCapacity =
        typeof program.seats === "number"
          ? program.seats
          : Number.parseInt(program.seats ?? "", 10);
      const safeCapacity = Number.isNaN(parsedCapacity)
        ? null
        : Math.max(0, parsedCapacity);

      const activities = Array.isArray(program.sessions)
        ? program.sessions.map((session) => {
            const availabilityInfo = session?.availabilityForDate ?? {};
            const availableSource =
              availabilityInfo.availableSeats ??
              availabilityInfo.capacity ??
              safeCapacity ??
              0;
            const parsedAvailable = Number.parseInt(availableSource ?? "", 10);
            const safeAvailable = Number.isNaN(parsedAvailable)
              ? 0
              : Math.max(0, parsedAvailable);

            const capacitySource =
              availabilityInfo.capacity != null
                ? availabilityInfo.capacity
                : safeCapacity;
            const parsedActivityCapacity = Number.parseInt(
              capacitySource ?? "",
              10
            );
            const safeActivityCapacity = Number.isNaN(parsedActivityCapacity)
              ? null
              : Math.max(0, parsedActivityCapacity);

            return {
              id: session.id,
              name: session.name,
              price:
                session?.price ??
                session?.basePrice ??
                session?.defaultPrice ??
                session?.minimumPrice ??
                session?.minPrice ??
                session?.amount ??
                session?.cost ??
                null,
              specialPrice: session?.specialPrice ?? null,
              available: safeAvailable,
              capacity: safeActivityCapacity,
              startTime: session.startTime,
              endTime: session.endTime,
              sessionTypes: Array.isArray(session.sessionTypes)
                ? session.sessionTypes.map((st) => ({
                    id: st.id,
                    name: st.name,
                    price: st.price,
                    specialPrice: st.specialPrice ?? null,
                  }))
                : [],
            };
          })
        : [];

      return {
        id: program.title ?? String(programId),
        window: formatTimeRange(program.startTime, program.endTime),
        programId,
        activities,
      };
    });
  }, [selectedDate, programOptions, formatTimeRange]);

  const collectSelectedSessions = useCallback(
    (selectionsMap) => {
      if (!availabilityForDate) {
        return [];
      }

      const entries = [];

      Object.entries(selectionsMap || {}).forEach(([seasonId, selection]) => {
        if (!selection) {
          return;
        }

        const season = availabilityForDate.find((entry) => entry.id === seasonId);
        if (!season) {
          return;
        }

        Object.entries(selection.activities || {}).forEach(([activityName, activityState]) => {
          if (!activityState?.selected) {
            return;
          }

          const session = season.activities.find((activity) => activity.name === activityName);
          if (!session) {
            return;
          }

          entries.push({
            seasonId,
            activityName,
            sessionId: session.id,
            startTime: session.startTime,
            endTime: session.endTime,
          });
        });
      });

      return entries;
    },
    [availabilityForDate]
  );

  const selectedSessions = useMemo(
    () => collectSelectedSessions(seasonSelections),
    [collectSelectedSessions, seasonSelections]
  );

  useEffect(() => {
    let isMounted = true;

    const fetchPrograms = async () => {
      setProgramsLoading(true);
      setProgramsError("");
      try {
        const params = new URLSearchParams();
        if (selectedDate) {
          params.set("date", format(selectedDate, "yyyy-MM-dd"));
        }

        const queryString = params.toString();
        const response = await fetch(
          queryString
            ? `/api/public/programs?${queryString}`
            : "/api/public/programs",
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error("Unable to load programs at this time");
        }

        const data = await response.json();
        if (isMounted) {
          setProgramOptions(Array.isArray(data.programs) ? data.programs : []);
        }
      } catch (error) {
        console.error("Public programs fetch error:", error);
        if (isMounted) {
          setProgramsError(
            error instanceof Error ? error.message : "Failed to load programs"
          );
        }
      } finally {
        if (isMounted) {
          setProgramsLoading(false);
        }
      }
    };

    fetchPrograms();

    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  const selectedProgramTitles = useMemo(
    () =>
      formData.programIds
        .map((id) => {
          const matchedProgram = programOptions.find((program) => {
            const resolved = program.id ?? program.title;
            return String(resolved) === String(id);
          });
          return matchedProgram?.title ?? null;
        })
        .filter(Boolean),
    [formData.programIds, programOptions]
  );

  const locationOptions = useMemo(() => {
    const names = new Set();
    programOptions.forEach((program) => {
      if (program?.location?.name) {
        names.add(program.location.name);
      }
    });
    return Array.from(names);
  }, [programOptions]);

  const locationChoices =
    locationOptions.length > 0 ? locationOptions : FALLBACK_LOCATIONS;

  const totalSeatsRequested = useMemo(() => {
    // When using a global seat count, a single attendee can participate
    // across multiple selected seasons/activities. Do not sum seats.
    if (useGlobalSeatCount) {
      return Math.max(0, Number.isFinite(globalSeatCount) ? globalSeatCount : 0);
    }

    // Otherwise, treat the requested seats as the maximum across seasons,
    // representing the number of unique attendees rather than a sum.
    const seatCounts = Object.values(seasonSelections).map((season) =>
      typeof season?.seatsRequested === "number" ? Math.max(0, season.seatsRequested) : 0
    );
    return seatCounts.length ? Math.max(...seatCounts) : 0;
  }, [seasonSelections, useGlobalSeatCount, globalSeatCount]);

  // Collect all available session types from all selected activities
  // These will be shown on the guest details page for selection
  const allAvailableSessionTypes = useMemo(() => {
    const sessionTypes = [];
    Object.entries(seasonSelections).forEach(([seasonId, selection]) => {
      if (!selection || selection.seatsRequested <= 0) return;

      const season = availabilityForDate?.find((entry) => entry.id === seasonId);
      if (!season) return;

      Object.entries(selection.activities ?? {}).forEach(([activityName, activityState]) => {
        if (!activityState?.selected) return;

        const activity = season.activities?.find((a) => a.name === activityName);
        if (!activity) return;

        // Include ALL session types from the activity, not just pre-selected ones
        if (Array.isArray(activity.sessionTypes) && activity.sessionTypes.length > 0) {
          activity.sessionTypes.forEach((sessionType) => {
            sessionTypes.push({
              sessionId: activity.id,
              sessionTypeId: sessionType.id,
              sessionTypeName: sessionType.name,
              price: sessionType.price,
              specialPrice: sessionType.specialPrice,
              activityName: activity.name,
              seasonId,
            });
          });
        }
      });
    });
    return sessionTypes;
  }, [seasonSelections, availabilityForDate]);

  const guestDetailsComplete = useMemo(() => {
    if (guestDetails.length === 0) {
      return false;
    }
    return guestDetails.every((guest) => {
      const nameValid = Boolean(guest?.name && guest.name.trim());
      const idValid = Boolean(guest?.idNumber && guest.idNumber.trim());
      const phoneValid = Boolean(guest?.phone && guest.phone.trim());
      const emailValid = Boolean(guest?.email && guest.email.trim());

      // If there are session types to select, each guest must select at least one
      if (allAvailableSessionTypes.length > 0) {
        const hasSelectedTypes = guest.selectedSessionTypes && Object.keys(guest.selectedSessionTypes).length > 0;
        return nameValid && idValid && phoneValid && emailValid && hasSelectedTypes;
      }

      return nameValid && idValid && phoneValid && emailValid;
    });
  }, [guestDetails, allAvailableSessionTypes]);

  useEffect(() => {
    if (currentStage !== "guests") {
      return;
    }

    const desiredLength = Math.max(0, totalSeatsRequested);
    // Don't redirect away - let user fill in seat count on this page
    if (desiredLength === 0) {
      return;
    }

    setGuestDetails((prev) => {
      if (prev.length === desiredLength) {
        return prev;
      }

      if (prev.length < desiredLength) {
        const additional = Array.from({ length: desiredLength - prev.length }, () => ({
          name: "",
          idNumber: "",
          phone: "",
          email: "",
          selectedSessionTypes: {},
        }));
        return [...prev, ...additional];
      }

      return prev.slice(0, desiredLength);
    });
  }, [currentStage, totalSeatsRequested]);

  const formatPrice = (value) => {
    if (value === null || value === undefined) {
      return "Included";
    }
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      return String(value);
    }
    return `USD ${numeric.toLocaleString()}`;
  };

  const parsePriceValue = (value) => {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    const numeric = typeof value === "number" ? value : Number.parseFloat(value);
    return Number.isNaN(numeric) ? null : numeric;
  };

  const sessionTypeLookup = useMemo(() => {
    const lookup = new Map();

    programOptions.forEach((program) => {
      if (!Array.isArray(program?.sessions)) {
        return;
      }

      program.sessions.forEach((session) => {
        if (!Array.isArray(session?.sessionTypes)) {
          return;
        }

        session.sessionTypes.forEach((sessionType) => {
          const resolvedPrice =
            parsePriceValue(sessionType.specialPrice) ??
            parsePriceValue(sessionType.price) ??
            0;

          lookup.set(String(sessionType.id), {
            sessionTypeId: sessionType.id,
            sessionTypeName: sessionType.name,
            sessionId: session.id,
            sessionName: session.name,
            programTitle: program.title ?? program.name ?? "Program",
            unitPrice: resolvedPrice,
          });
        });
      });
    });

    return lookup;
  }, [programOptions]);

  const calculateCostBreakdown = useCallback(() => {
    let sessionBaseTotal = 0;
    let sessionTypeTotal = 0;
    Object.entries(seasonSelections).forEach(([seasonId, selection]) => {
      const seatsRequested = Number.parseInt(selection?.seatsRequested, 10) || 0;
      if (seatsRequested <= 0) return;

      const resolvedProgramId = selection?.programId ?? seasonId;
      const program = programOptions.find((programOption) => {
        const optionId = programOption.id ?? programOption.title;
        return String(optionId) === String(resolvedProgramId);
      });

      if (!program) return;

      const activityEntries = Object.entries(selection.activities ?? {}).filter(
        ([, details]) => details?.selected
      );

      activityEntries.forEach(([activityName]) => {
        const session = program.sessions?.find(
          (item) => item.name === activityName
        );
        if (!session) return;

        // Check if activity has session types
        const hasSessionTypes = Array.isArray(session.sessionTypes) && session.sessionTypes.length > 0;

        // Always include session base price
        const sessionBasePrice = parsePriceValue(session.specialPrice) ?? parsePriceValue(session.price) ?? 0;
        sessionBaseTotal += sessionBasePrice * seatsRequested;

        if (hasSessionTypes) {
          // If on guest details page, use selected session type prices from guestDetails
          // Otherwise, use the first/lowest session type price as estimate
          if (currentStage === "guests" && guestDetails.length > 0) {
            // Calculate based on each guest's selected session types
            guestDetails.forEach((guest) => {
              const selectedTypeIds = Object.keys(guest.selectedSessionTypes ?? {});
              selectedTypeIds.forEach((typeId) => {
                const sessionType = session.sessionTypes.find(st => String(st.id) === String(typeId));
                if (sessionType) {
                  const price = parsePriceValue(sessionType.specialPrice) ?? parsePriceValue(sessionType.price) ?? 0;
                  sessionTypeTotal += price;
                }
              });
            });
          } else {
            // On booking page, use session type prices (first one as reference)
            const sessionType = session.sessionTypes[0];
            if (sessionType) {
              const price = parsePriceValue(sessionType.specialPrice) ?? parsePriceValue(sessionType.price) ?? 0;
              sessionTypeTotal += price * seatsRequested;
            }
          }
        }
      });
    });
    return {
      totalCost: sessionBaseTotal + sessionTypeTotal,
      sessionBaseTotal,
      sessionTypeTotal,
    };
  }, [seasonSelections, programOptions, currentStage, guestDetails]);

  const { totalCost } = useMemo(
    () => calculateCostBreakdown(),
    [calculateCostBreakdown]
  );

  // Fetch the authoritative server quote when selections change.
  useEffect(() => {
    const fetchDiscount = async () => {
      const selectedSessionIds = [];
      const sessionTypeSelections = {};
      const quoteSelections = [];
      let selectedProgramId = null;

      Object.entries(seasonSelections).forEach(([seasonId, selection]) => {
        if (!selection || selection.seatsRequested <= 0) return;

        const season = availabilityForDate?.find((entry) => entry.id === seasonId);
        if (!season) return;

        if (!selectedProgramId && season.programId) {
          selectedProgramId = season.programId;
        }

        const seatsRequested = Number.parseInt(selection.seatsRequested, 10) || 0;

        Object.entries(selection.activities ?? {}).forEach(([activityName, activityState]) => {
          if (!activityState?.selected) return;

          const activity = season.activities?.find((a) => a.name === activityName);
          if (!activity) return;

          selectedSessionIds.push(activity.id);

          const selectedTypeIds = Object.keys(activityState.sessionTypes ?? {});
          if (selectedTypeIds.length > 0) {
            sessionTypeSelections[activity.id] = selectedTypeIds[0];
          }

          quoteSelections.push({
            sessionId: activity.id,
            sessionTypeId: selectedTypeIds[0] ? Number(selectedTypeIds[0]) : null,
            seatsRequested,
          });
        });
      });

      if (selectedSessionIds.length === 0 || !selectedProgramId) {
        setDiscountInfo(null);
        return;
      }

      setDiscountLoading(true);
      try {
        const response = await fetch('/api/discount-rules/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            programId: selectedProgramId,
            sessionIds: selectedSessionIds,
            sessionTypeSelections,
            selections: quoteSelections,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setDiscountInfo(data);
        } else {
          setDiscountInfo(null);
        }
      } catch (error) {
        console.error('Error fetching discount:', error);
        setDiscountInfo(null);
      } finally {
        setDiscountLoading(false);
      }
    };

    fetchDiscount();
  }, [seasonSelections, availabilityForDate]);

  const discountedTotalCost = useMemo(() => {
    if (discountInfo && Number.isFinite(Number(discountInfo.finalTotal))) {
      return Number(discountInfo.finalTotal);
    }
    return totalCost;
  }, [totalCost, discountInfo]);

  const partialPlanPreview = useMemo(
    () =>
      resolvePaymentPlan({
        paymentType: "Partial",
        provider: "PAYHERE",
        fullTotal: discountedTotalCost,
      }),
    [discountedTotalCost]
  );

  const paymentBreakdown = useMemo(() => {
    const entries = [];
    const includeSeasonLevelSessionTypes = !(
      currentStage === "guests" && guestDetails.length > 0
    );

    Object.entries(seasonSelections).forEach(([seasonId, selection]) => {
      const seatsRequested = Number.parseInt(selection?.seatsRequested, 10) || 0;
      if (seatsRequested <= 0) {
        return;
      }

      const resolvedProgramId = selection?.programId ?? seasonId;
      const program = programOptions.find((programOption) => {
        const optionId = programOption.id ?? programOption.title;
        return String(optionId) === String(resolvedProgramId);
      });

      Object.entries(selection.activities ?? {}).forEach(([activityName, activityState]) => {
        if (!activityState?.selected) {
          return;
        }

        const session = program?.sessions?.find(
          (sessionItem) => sessionItem.name === activityName
        );

        const sessionLabel = session?.name ?? activityName;
        const programLabel = program?.title ?? program?.name ?? seasonId;
        const sessionUnitPrice =
          parsePriceValue(session?.specialPrice) ??
          parsePriceValue(session?.price) ??
          0;

        entries.push({
          key: `session-${seasonId}-${session?.id ?? activityName}`,
          title: sessionLabel,
          subtitle: `${programLabel} • ${seatsRequested} ${
            seatsRequested === 1 ? "seat" : "seats"
          }`,
          unitPrice: sessionUnitPrice,
          total: sessionUnitPrice * seatsRequested,
          seats: seatsRequested,
          badge: "Session",
        });

        if (
          includeSeasonLevelSessionTypes &&
          Array.isArray(session?.sessionTypes) &&
          session.sessionTypes.length > 0
        ) {
          const selectedTypeIds = Object.keys(activityState.sessionTypes ?? {});
          selectedTypeIds.forEach((sessionTypeId) => {
            const sessionType = session.sessionTypes.find(
              (type) => String(type.id) === String(sessionTypeId)
            );

            if (!sessionType) {
              return;
            }

            const typeUnitPrice =
              parsePriceValue(sessionType.specialPrice) ??
              parsePriceValue(sessionType.price) ??
              0;

            entries.push({
              key: `session-type-${seasonId}-${session?.id ?? activityName}-${sessionType.id}`,
              title: sessionType.name,
              subtitle: `${sessionLabel} • ${seatsRequested} ${
                seatsRequested === 1 ? "seat" : "seats"
              }`,
              unitPrice: typeUnitPrice,
              total: typeUnitPrice * seatsRequested,
              seats: seatsRequested,
              badge: "Session Type",
            });
          });
        }
      });
    });

    if (currentStage === "guests" && guestDetails.length > 0) {
      guestDetails.forEach((guest, guestIndex) => {
        const typeIds = Object.keys(guest.selectedSessionTypes ?? {});
        typeIds.forEach((sessionTypeId) => {
          const meta = sessionTypeLookup.get(String(sessionTypeId));
          if (!meta) {
            return;
          }

          entries.push({
            key: `guest-session-type-${guestIndex}-${sessionTypeId}`,
            title: meta.sessionTypeName,
            subtitle: `${meta.sessionName} • Guest ${guestIndex + 1}`,
            unitPrice: meta.unitPrice,
            total: meta.unitPrice,
            seats: 1,
            badge: "Session Type",
          });
        });
      });
    }

    return entries;
  }, [
    seasonSelections,
    programOptions,
    currentStage,
    guestDetails,
    sessionTypeLookup,
  ]);

  const handlePaymentTypeChange = (value) => {
    setFormData(prev => ({
      ...prev,
      payment: value,
    }));
  };

  const validatePhoneNumber = useCallback((countryIso, rawNumber) => {
    const sanitizedNumber =
      typeof rawNumber === "string" ? rawNumber.replace(/[^\d]/g, "") : "";

    if (!sanitizedNumber) {
      setPhoneValidation({ state: "idle", message: "" });
      setValidatedPhoneNumber(null);
      return { isValid: false, parsed: null };
    }

    if (!countryIso) {
      setPhoneValidation({ state: "error", message: "Select a country first." });
      setValidatedPhoneNumber(null);
      return { isValid: false, parsed: null };
    }

    let dialPrefix = "";
    try {
      const dialDigits = getCountryCallingCode(countryIso, metadata);
      dialPrefix = `+${dialDigits}`;
    } catch (error) {
      console.error(`Unable to resolve dial code for country ${countryIso}`, error);
      setPhoneValidation({
        state: "error",
        message: "Unable to resolve the dial code for the selected country.",
      });
      setValidatedPhoneNumber(null);
      return { isValid: false, parsed: null };
    }

    try {
      const candidate = parsePhoneNumberFromString(
        `${dialPrefix}${sanitizedNumber}`
      );

      if (!candidate || !candidate.isValid()) {
        setPhoneValidation({
          state: "error",
          message: "Enter a valid phone number for the selected country.",
        });
        setValidatedPhoneNumber(null);
        return { isValid: false, parsed: null };
      }

      setPhoneValidation({
        state: "success",
        message: candidate.formatInternational(),
      });
      setValidatedPhoneNumber(candidate);
      return { isValid: true, parsed: candidate };
    } catch (error) {
      setPhoneValidation({
        state: "error",
        message: "Enter a valid phone number for the selected country.",
      });
      setValidatedPhoneNumber(null);
      return { isValid: false, parsed: null };
    }
  }, []);


  const getActivityPricingDetails = (seasonId, activity) => {
    if (!activity) {
      return { perSeatLabel: null, totalLabel: null };
    }

    const directPriceCandidates = [
      activity.specialPrice,
      activity.price,
      activity.basePrice,
      activity.defaultPrice,
      activity.minimumPrice,
      activity.minPrice,
      activity.amount,
      activity.cost,
    ];

    const seatCount = Number(
      seasonSelections?.[seasonId]?.seatsRequested ?? 0
    );

    const selectedSessionTypeIds =
      seasonSelections?.[seasonId]?.activities?.[activity.name]?.sessionTypes ?? {};

    const selectedSessionTypePrices = Array.isArray(activity.sessionTypes)
      ? activity.sessionTypes
          .filter((sessionType) => {
            const key = sessionType?.id;
            if (key === null || key === undefined) {
              return false;
            }
            return Boolean(selectedSessionTypeIds[key]);
          })
          .map((sessionType) => {
            const special = parsePriceValue(sessionType?.specialPrice);
            const regular = parsePriceValue(sessionType?.price);
            return special !== null ? special : regular;
          })
          .filter((value) => value !== null)
      : [];

    const directPrice = directPriceCandidates
      .map((candidate) => parsePriceValue(candidate))
      .find((value) => value !== null);

    // Check if we are using the special price as the direct price
    const isUsingSpecialPrice =
      directPrice !== null &&
      activity.specialPrice !== null &&
      activity.specialPrice !== undefined &&
      directPrice === activity.specialPrice &&
      activity.price !== null &&
      activity.price !== undefined;

    const pricePool = selectedSessionTypePrices.length
      ? selectedSessionTypePrices
      : directPrice !== null
        ? [directPrice]
        : [];

    if (!pricePool.length) {
      if (Array.isArray(activity.sessionTypes) && activity.sessionTypes.length > 0) {
        return {
          perSeatLabel: "Select a session type for pricing",
          totalLabel: null,
        };
      }

      return { perSeatLabel: null, totalLabel: null };
    }

    const minPrice = Math.min(...pricePool);
    const maxPrice = Math.max(...pricePool);

    let perSeatLabel;

    if (isUsingSpecialPrice && !selectedSessionTypePrices.length) {
       perSeatLabel = (
         <span className="flex items-center gap-1">
           <span className="line-through opacity-70 text-[10px]">{formatPrice(activity.price)}</span>
           <span className="font-bold text-red-600">{formatPrice(minPrice)}</span>
           <span>per guest</span>
         </span>
       );
    } else {
      perSeatLabel =
        minPrice === maxPrice
          ? `${formatPrice(minPrice)} per guest`
          : `${formatPrice(minPrice)} - ${formatPrice(maxPrice)} per guest`;
    }

    if (!seatCount || seatCount <= 0) {
      return { perSeatLabel, totalLabel: null };
    }

    const minTotal = minPrice * seatCount;
    const maxTotal = maxPrice * seatCount;

    let totalLabel;

    if (isUsingSpecialPrice && !selectedSessionTypePrices.length) {
       const originalTotal = (activity.price || 0) * seatCount;
       totalLabel = (
         <span className="flex items-center gap-1">
           <span className="line-through opacity-70 text-[10px]">{formatPrice(originalTotal)}</span>
           <span>{formatPrice(minTotal)} total for {seatCount} seats</span>
         </span>
       );
    } else {
      totalLabel =
        minTotal === maxTotal
          ? `${formatPrice(minTotal)} total for ${seatCount} seats`
          : `${formatPrice(minTotal)} - ${formatPrice(maxTotal)} total for ${seatCount} seats`;
    }

    return { perSeatLabel, totalLabel };
  };

  const getSeasonAvailabilityTotal = (seasonId) => {
    if (!availabilityForDate) {
      return 0;
    }

    const season = availabilityForDate.find((entry) => entry.id === seasonId);
    return season
      ? season.activities.reduce((acc, activity) => acc + activity.available, 0)
      : 0;
  };

  const clampSeatRequest = (requested, seasonId) => {
    const totalAvailable = getSeasonAvailabilityTotal(seasonId);
    if (totalAvailable <= 0) {
      return 0;
    }
    return Math.max(0, Math.min(requested, totalAvailable));
  };

  const handleSeasonToggle = (seasonId) => {
    const seasonMeta = availabilityForDate?.find((entry) => entry.id === seasonId);
    const resolvedProgramId = seasonMeta?.programId ?? seasonId;
    const normalizedProgramId = String(resolvedProgramId);
    const existingSelection = seasonSelections[seasonId];

    if (existingSelection) {
      const normalizedExistingProgramId = String(
        existingSelection.programId ?? normalizedProgramId
      );
      const programStillUsed = Object.entries(seasonSelections).some(
        ([key, value]) =>
          key !== seasonId && String(value?.programId ?? key) === normalizedExistingProgramId
      );

      setSeasonSelections((prev) => {
        const { [seasonId]: _removed, ...rest } = prev;
        return rest;
      });

      if (!programStillUsed) {
        setFormData((prev) => ({
          ...prev,
          programIds: prev.programIds.filter(
            (id) => String(id) !== normalizedExistingProgramId
          ),
        }));
      }

      return;
    }

    const totalAvailable = getSeasonAvailabilityTotal(seasonId);
    const initialSeats = useGlobalSeatCount
      ? clampSeatRequest(globalSeatCount, seasonId)
      : clampSeatRequest(totalAvailable > 0 ? 1 : 0, seasonId);

    setSeasonSelections((prev) => ({
      ...prev,
      [seasonId]: {
        programId: normalizedProgramId,
        seatsRequested: initialSeats,
        activities: {},
      },
    }));

    setFormData((prev) => {
      if (prev.programIds.some((id) => String(id) === normalizedProgramId)) {
        return prev;
      }
      return {
        ...prev,
        programIds: [...prev.programIds, normalizedProgramId],
      };
    });
  };

  const handleActivityToggle = (seasonId, activityName) => {
    const seasonMeta = availabilityForDate?.find((entry) => entry.id === seasonId);
    const normalizedProgramId = String(seasonMeta?.programId ?? seasonId);
    const targetSession = seasonMeta?.activities?.find(
      (activity) => activity.name === activityName
    );

    setSeasonSelections((prev) => {
      const existing = prev[seasonId] ?? {
        programId: normalizedProgramId,
        seatsRequested: useGlobalSeatCount
          ? clampSeatRequest(globalSeatCount, seasonId)
          : clampSeatRequest(1, seasonId),
        activities: {},
      };

      const activities = { ...existing.activities };
      if (activities[activityName]?.selected) {
        delete activities[activityName];
      } else {
        if (targetSession?.startTime && targetSession?.endTime) {
          const currentSelections = collectSelectedSessions(prev);
          const hasConflict = currentSelections.some((entry) => {
            if (entry.sessionId === targetSession.id) {
              return false;
            }
            return rangesOverlap(entry, targetSession);
          });

          if (hasConflict) {
            alert(
              "You already selected another activity that overlaps with this time slot. Please choose a different session."
            );
            return prev;
          }
        }

        activities[activityName] = {
          selected: true,
          sessionTypes: {},
        };
      }

      return {
        ...prev,
        [seasonId]: {
          ...existing,
          activities,
        },
      };
    });
  };

  const handleSessionTypeToggle = (seasonId, activityName, sessionTypeId) => {
    setSeasonSelections((prev) => {
      const existing = prev[seasonId];
      if (!existing) return prev;

      const activities = { ...existing.activities };
      const activity = activities[activityName];
      if (!activity) return prev;

      const sessionTypes = { ...activity.sessionTypes };
      if (sessionTypes[sessionTypeId]) {
        delete sessionTypes[sessionTypeId];
      } else {
        sessionTypes[sessionTypeId] = true;
      }

      activities[activityName] = {
        ...activity,
        sessionTypes,
      };

      return {
        ...prev,
        [seasonId]: {
          ...existing,
          activities,
        },
      };
    });
  };

  const handleSeatsChange = (seasonId, nextValue) => {
    setSeasonSelections((prev) => {
      if (!prev[seasonId]) {
        return prev;
      }

      const sanitized = clampSeatRequest(nextValue, seasonId);
      return {
        ...prev,
        [seasonId]: {
          ...prev[seasonId],
          seatsRequested: sanitized,
        },
      };
    });
  };

  const handleGlobalSeatToggle = (checked) => {
    setUseGlobalSeatCount(Boolean(checked));
    if (checked) {
      setSeasonSelections((prev) => {
        const next = {};
        Object.entries(prev).forEach(([seasonId, payload]) => {
          next[seasonId] = {
            ...payload,
            seatsRequested: clampSeatRequest(globalSeatCount, seasonId),
          };
        });
        return next;
      });
    }
  };

  const handleGlobalSeatCountChange = (value) => {
    const numericValue = Number.parseInt(value, 10);
    const sanitized = Number.isNaN(numericValue)
      ? 0
      : Math.max(0, numericValue);
    setGlobalSeatCount(sanitized);
    if (useGlobalSeatCount) {
      setSeasonSelections((prev) => {
        const next = {};
        Object.entries(prev).forEach(([seasonId, payload]) => {
          next[seasonId] = {
            ...payload,
            seatsRequested: clampSeatRequest(sanitized, seasonId),
          };
        });
        return next;
      });
    }
  };

  const hasValidSeasonSelection = useMemo(() => {
    if (Object.keys(seasonSelections).length === 0) {
      return false;
    }

    return Object.entries(seasonSelections).every(([seasonId, entry]) => {
      if (!entry || entry.seatsRequested <= 0) {
        return false;
      }

      const selectedActivities = Object.entries(entry.activities ?? {}).filter(
        ([_, activity]) => activity?.selected
      );

      if (selectedActivities.length === 0) {
        return false;
      }

      // Session types are now selected on the second page (guest details)
      // So we only need to check that activities are selected
      return true;
    });
  }, [availabilityForDate, seasonSelections]);

  const seasonSelectionSummary = Object.entries(seasonSelections).map(
    ([seasonId, details]) => {
      const selectedActivities = Object.entries(details.activities).filter(
        ([_, act]) => act.selected
      );
      const activityList = selectedActivities.length
        ? selectedActivities
            .map(([name, act]) => {
              const sessionTypeNames = Object.keys(act.sessionTypes);
              const sessionTypeList = sessionTypeNames.length
                ? ` (${sessionTypeNames.join(", ")})`
                : "";
              return `${name}${sessionTypeList}`;
            })
            .join(", ")
        : "No activities selected";
      return `${seasonId}: ${details.seatsRequested} seats (${activityList})`;
    }
  );

  const handlePromoCodeChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      promoCode: value,
    }));
    setPromoStatus({ state: "idle", message: "" });
    setVerifiedLeader(null);
  };

  const handleVerifyPromoCode = async () => {
    const code = formData.promoCode?.trim();
    if (!code) {
      setPromoStatus({ state: "error", message: "Enter a promo code first." });
      setVerifiedLeader(null);
      return;
    }

    setPromoStatus({ state: "loading", message: "" });

    try {
      const params = new URLSearchParams({ code });
      const response = await fetch(`/api/public/promo?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        const message = data?.error || "Promo code could not be verified.";
        setPromoStatus({ state: "error", message });
        setVerifiedLeader(null);
        return;
      }

      setVerifiedLeader(data.leader);
      setPromoStatus({
        state: "success",
        message: `Promo code verified. Booking under ${
          data.leader?.name || data.leader?.email || "registered leader"
        }`,
      });

      setFormData((prev) => ({
        ...prev,
        name: data.leader?.name || prev.name,
        email: data.leader?.email || prev.email,
      }));
    } catch (error) {
      console.error("Promo code verification failed", error);
      setPromoStatus({
        state: "error",
        message: "Unable to verify promo code. Please try again.",
      });
      setVerifiedLeader(null);
    }
  };

  const handleClearPromoCode = () => {
    setVerifiedLeader(null);
    setPromoStatus({ state: "idle", message: "" });
    setFormData((prev) => ({
      ...prev,
      promoCode: "",
    }));
  };

  const handleCountryCodeChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      countryCode: value,
    }));
    validatePhoneNumber(value, formData.phone);
  };

  const handlePhoneInputChange = (value) => {
    const sanitizedValue = value.replace(/[^\d]/g, "");
    setFormData((prev) => ({
      ...prev,
      phone: sanitizedValue,
    }));
    validatePhoneNumber(formData.countryCode, sanitizedValue);
  };

  const handleProgramToggle = (programId) => {
    const normalizedId = String(programId);
    setFormData((prev) => {
      const exists = prev.programIds.some((id) => String(id) === normalizedId);
      const nextProgramIds = exists
        ? prev.programIds.filter((id) => String(id) !== normalizedId)
        : [...prev.programIds, normalizedId];

      return {
        ...prev,
        programIds: nextProgramIds,
      };
    });
  };

  const handleGuestDetailChange = (index, field, value) => {
    setGuestDetails((prev) => {
      const next = [...prev];
      const existing = next[index] ?? {
        name: "",
        idNumber: "",
        phone: "",
        email: "",
        selectedSessionTypes: {},
      };
      next[index] = {
        ...existing,
        [field]: value,
      };
      return next;
    });
  };

  const handleGuestSessionTypeToggle = (guestIndex, sessionTypeId) => {
    setGuestDetails((prev) => {
      const next = [...prev];
      const guest = next[guestIndex] ?? {
        name: "",
        idNumber: "",
        phone: "",
        email: "",
        selectedSessionTypes: {},
      };
      const currentSelections = guest.selectedSessionTypes ?? {};
      const newSelections = { ...currentSelections };

      if (newSelections[sessionTypeId]) {
        delete newSelections[sessionTypeId];
      } else {
        newSelections[sessionTypeId] = true;
      }

      next[guestIndex] = {
        ...guest,
        selectedSessionTypes: newSelections,
      };
      return next;
    });
  };

  const handleBackToGuests = () => {
    setIsSubmitting(false);
    setCurrentStage("guests");
  };

  const submitPayHereRedirect = useCallback((redirect) => {
    if (!redirect || typeof window === "undefined") {
      return;
    }

    const { actionUrl, params } = redirect;
    if (!actionUrl || !params || typeof params !== "object") {
      return;
    }

    const form = document.createElement("form");
    form.method = "POST";
    form.action = actionUrl;
    form.style.display = "none";

    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = String(value);
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all fields on single page
    if (formData.programIds.length === 0) {
      alert("Select at least one program before proceeding.");
      return;
    }

    if (!hasValidSeasonSelection) {
      alert(
        "Select at least one season, choose activities, and set the seats needed before continuing."
      );
      return;
    }

    if (!selectedDate) {
      alert("Select a date before confirming your booking.");
      return;
    }

    if (totalSeatsRequested === 0) {
      alert("Please specify how many seats you need before confirming.");
      return;
    }

    if (!guestDetailsComplete) {
      alert("Please fill in all guest details before confirming your booking.");
      return;
    }

    const trimmedPersonalName = formData.name.trim();
    const trimmedPersonalEmail = formData.email.trim();
    const trimmedPersonalPhone = formData.phone.trim();
    const primaryGuest = guestDetails[0] || {};
    const guestFallbackName = primaryGuest?.name?.trim() || "";
    const guestFallbackEmail = primaryGuest?.email?.trim() || "";
    const guestFallbackPhone = primaryGuest?.phone?.trim() || "";

    let bookingPhoneResult = validatedPhoneNumber;

    if (!verifiedLeader && trimmedPersonalPhone) {
      const latestPhoneCheck = validatePhoneNumber(
        formData.countryCode,
        formData.phone
      );

      if (!latestPhoneCheck.isValid) {
        alert("Enter a valid phone number or leave it blank before confirming your booking.");
        return;
      }

      bookingPhoneResult = latestPhoneCheck.parsed;
    }

    setIsSubmitting(true);

    try {
      if (!selectedDate) {
        throw new Error("Select a date before confirming your booking.");
      }

      // Send bookedDate as a date-only string (YYYY-MM-DD).
      // The API expects a date-like value; using a plain date string
      // avoids client/server timezone conversion issues.
      const bookingDateString = format(selectedDate, "yyyy-MM-dd");

      const fallbackPersonalContact = (() => {
        if (!trimmedPersonalPhone) {
          return "";
        }
        try {
          if (!formData.countryCode) {
            return trimmedPersonalPhone.replace(/\s+/g, "");
          }
          const dial = getCountryCallingCode(formData.countryCode, metadata);
          return `+${dial}${trimmedPersonalPhone}`.replace(/\s+/g, "");
        } catch (error) {
          console.error(
            `Unable to compute fallback dial code for ${formData.countryCode}`,
            error
          );
          return trimmedPersonalPhone.replace(/\s+/g, "");
        }
      })();

      const resolvedLeaderName = trimmedPersonalName || guestFallbackName || "Guest";
      const resolvedLeaderEmail = trimmedPersonalEmail || guestFallbackEmail;
      if (!resolvedLeaderEmail) {
        throw new Error("Please provide an email for at least one guest so we can send the receipt.");
      }
      const resolvedLeaderContact =
        bookingPhoneResult?.number ||
        fallbackPersonalContact ||
        guestFallbackPhone ||
        "";

      let leaderProfile = verifiedLeader || null;
      let leaderId = leaderProfile?.id;

      if (!leaderId) {
        const leaderPayload = {
          name: resolvedLeaderName,
          email: resolvedLeaderEmail,
          contact: resolvedLeaderContact || null,
        };

        const leaderResponse = await fetch("/api/public/leaders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(leaderPayload),
        });

        const leaderResult = await leaderResponse.json();

        if (!leaderResponse.ok) {
          throw new Error(leaderResult?.error || "Could not save your contact details.");
        }

        leaderId = leaderResult?.leader?.id;
        leaderProfile = leaderResult?.leader || null;
      }

      if (!leaderId) {
        throw new Error("Unable to determine the booking contact.");
      }

      const primaryName = (leaderProfile?.name || resolvedLeaderName || "Guest").trim();
      const [firstName, ...restNames] = primaryName.split(/\s+/);
      const lastName = restNames.join(" ") || "Customer";
      const primaryEmail = (leaderProfile?.email || resolvedLeaderEmail || "guest@example.com").trim();
      const primaryPhone = (
        leaderProfile?.contact ||
        resolvedLeaderContact ||
        guestFallbackPhone ||
        "0000000000"
      ).trim();
      const addressLine = formData.notes?.trim() || formData.location || "N/A";
      const cityValue = formData.location || "Colombo";
      const countryValue = "Sri Lanka";

      const customersPayload = guestDetails.map((guest) => ({
        name: guest.name.trim(),
        email: guest.email.trim(),
        phone: guest.phone?.trim() || null,
        nic: guest.idNumber?.trim() || null,
      }));

      const bookingSelections = [];

      // Build a map of session type info for quick lookup
      const sessionTypeInfoMap = new Map();
      allAvailableSessionTypes.forEach((st) => {
        sessionTypeInfoMap.set(String(st.sessionTypeId), st);
      });

      Object.entries(seasonSelections).forEach(([seasonId, selection]) => {
        const seatsRequested = Number.parseInt(selection?.seatsRequested, 10) || 0;
        if (seatsRequested <= 0) {
          return;
        }

        const resolvedProgramId = selection?.programId ?? seasonId;
        const program = programOptions.find((programOption) => {
          const optionId = programOption.id ?? programOption.title;
          return String(optionId) === String(resolvedProgramId);
        });

        if (!program) {
          return;
        }

        const activityEntries = Object.entries(selection.activities ?? {}).filter(
          ([, details]) => details?.selected
        );

        activityEntries.forEach(([activityName, details]) => {
          const session = program.sessions?.find(
            (item) => item.name === activityName
          );

          if (!session) {
            return;
          }

          const parsedSessionId = Number.parseInt(session.id, 10);
          if (Number.isNaN(parsedSessionId)) {
            return;
          }

          const mergedSessionTypeIds = new Set(
            Object.keys(details.sessionTypes ?? {})
          );

          guestDetails.forEach((guest) => {
            Object.entries(guest.selectedSessionTypes ?? {}).forEach(
              ([typeId, selected]) => {
                if (!selected) {
                  return;
                }
                const meta = sessionTypeInfoMap.get(String(typeId));
                if (!meta) {
                  return;
                }
                if (String(meta.sessionId) === String(session.id)) {
                  mergedSessionTypeIds.add(String(typeId));
                }
              }
            );
          });

          const sessionTypeIds = Array.from(mergedSessionTypeIds);

          if (sessionTypeIds.length === 0) {
            // No session types - all guests go to this session
            bookingSelections.push({
              sessionId: parsedSessionId,
              seatsRequested,
              customers: customersPayload,
            });
            return;
          }

          // Group guests by their selected session types for this session
          sessionTypeIds.forEach((typeId) => {
            const parsedTypeId = Number.parseInt(typeId, 10);
            if (Number.isNaN(parsedTypeId)) {
              return;
            }

            // Find guests who selected this session type
            const guestsForThisType = guestDetails
              .filter((guest) => {
                const selectedTypes = guest.selectedSessionTypes ?? {};
                return selectedTypes[typeId] === true;
              })
              .map((guest) => ({
                name: guest.name.trim(),
                email: guest.email.trim(),
                phone: guest.phone?.trim() || null,
                nic: guest.idNumber?.trim() || null,
              }));

            if (guestsForThisType.length > 0) {
              bookingSelections.push({
                sessionId: parsedSessionId,
                sessionTypeId: parsedTypeId,
                seatsRequested: guestsForThisType.length,
                customers: guestsForThisType,
              });
            }
          });
        });
      });

      if (bookingSelections.length === 0) {
        throw new Error("No activities were selected for this booking.");
      }

      const payload = {
        leaderId,
        bookedDate: bookingDateString,
        additionalNotes: formData.notes,
        selections: bookingSelections,
        payment: {
          paymentType: formData.payment,
          provider: formData.payment === "Later" ? "MANUAL" : "PAYHERE",
          currency: "USD",
          method: formData.payment === "Later" ? "Pay Later" : "PayHere Checkout",
        },
        customer: {
          name: primaryName,
          firstName,
          lastName,
          email: primaryEmail,
          phone: primaryPhone,
          address: addressLine,
          city: cityValue,
          country: countryValue,
        },
      };

      const response = await fetch("/api/booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Booking failed. Please try again.");
      }

      if (result.paymentRedirect) {
        submitPayHereRedirect(result.paymentRedirect);
        return;
      }

      const bookingReference =
        result.referenceCode ??
        (result.bookingId ? `RV-${String(result.bookingId)}` : null);
      setReferenceCode(bookingReference || "");
      setBookingConfirmed(true);
    } catch (error) {
      console.error("Booking error:", error);
      alert(error?.message || "An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (bookingConfirmed) {
    const fallbackGuestName = guestDetails[0]?.name?.trim() || "Guest";
    const fallbackGuestEmail = guestDetails[0]?.email?.trim() || "guest@example.com";
    const summaryName =
      verifiedLeader?.name?.trim() ||
      formData.name?.trim() ||
      fallbackGuestName;
    const summaryEmail =
      verifiedLeader?.email?.trim() ||
      formData.email?.trim() ||
      fallbackGuestEmail;
    const contactName = summaryName;
    const guestSummaryText = guestDetails.length
      ? guestDetails
          .map((guest, index) => {
            const namePart = guest?.name?.trim() || `Guest ${index + 1}`;
            const idPart = guest?.idNumber?.trim() || "ID N/A";
            const phonePart = guest?.phone?.trim() || "Phone N/A";
            const emailPart = guest?.email?.trim() || "Email N/A";
            return `${index + 1}. ${namePart} • ${idPart} • ${phonePart} • ${emailPart}`;
          })
          .join(" | ")
      : "No guest details provided";

    const whatsappMessage = encodeURIComponent(
      `Hi! I've just booked a tea tour.\n\nReference Code: ${referenceCode}\nName: ${
        contactName
      }\nDate: ${format(
        selectedDate,
        "PPP"
      )}\nSeasons: ${seasonSelectionSummary.join(
        " | "
      )}\nPrograms: ${selectedProgramTitles.join(", ")}\nGuests: ${guestSummaryText}`
    );
    const whatsappLink = `https://wa.me/1234567890?text=${whatsappMessage}`;

    return (
      <>
        <Header />
        <main className="min-h-screen py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="max-w-2xl mx-auto">
              <CardContent className="pt-8 text-center">
                <FaCheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h1 className="text-3xl font-serif font-bold mb-4 text-primary">
                  Booking Confirmed!
                </h1>
                <div className="mb-6">
                  <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    Your Reference Code
                  </p>
                  <p className="text-2xl font-bold text-primary tracking-wider">
                    {referenceCode}
                  </p>
                </div>
                <div className="bg-secondary/20 p-6 rounded-lg mb-6 text-left">
                  <h3 className="font-bold mb-3">Booking Details:</h3>
                  <div className="space-y-2 text-muted-foreground">
                    <p>
                      <strong>Name:</strong> {summaryName}
                    </p>
                    <p>
                      <strong>Email:</strong> {summaryEmail}
                    </p>
                    <p>
                      <strong>Date:</strong> {format(selectedDate, "PPP")}
                    </p>
                    <p>
                      <strong>Seasons:</strong>{" "}
                      {seasonSelectionSummary.join(" | ")}
                    </p>
                    <p>
                      <strong>Programs:</strong>{" "}
                      {selectedProgramTitles.join(", ")}
                    </p>
                    <p>
                      <strong>Location:</strong> {formData.location}
                    </p>
                    {guestDetails.length > 0 && (
                      <div>
                        <strong>Guests:</strong>
                        <ul className="mt-2 space-y-1">
                          {guestDetails.map((guest, index) => (
                            <li key={`guest-summary-${index}`}>
                              <span className="font-medium text-foreground">
                                Guest {index + 1}:
                              </span>{" "}
                              {guest.name || "Name pending"} • {guest.idNumber || "ID pending"} • {guest.phone || "Phone pending"} • {guest.email || "Email pending"}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">

                  <Button asChild size="lg" variant="outline">
                    <Link href="/">Return to Home</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      {isLoading && <LoadingScreen onComplete={() => setIsLoading(false)} />}
      <Header />
      <FloatingActionButtons />
      <main className="min-h-screen">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary via-primary/95 to-primary/80 text-primary-foreground py-20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl animate-pulse" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-yellow-300/20 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6 animate-fade-in">
              <span className="w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></span>
              <span className="text-sm font-medium">Book Your Tea Experience</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold mb-4 drop-shadow-2xl animate-fade-in">
              Reserve Your Perfect
              <span className="block text-yellow-300 mt-2">Tea Journey</span>
            </h1>
            <p className="text-lg sm:text-xl opacity-95 drop-shadow max-w-2xl mx-auto animate-fade-in">
              Fill in your details below to reserve your authentic Ceylon tea experience
            </p>
          </div>
        </section>

        {/* Booking Form */}
        <section className="py-16 bg-gradient-to-b from-background via-secondary/5 to-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">

            <Card className="max-w-6xl mx-auto border-2 border-primary/20 shadow-2xl bg-white/95 backdrop-blur overflow-hidden">
              <CardContent className="pt-8 pb-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Section 1: Booking Details */}
                    <div className="space-y-4">
                      <h2 className="text-2xl font-serif font-bold text-primary text-center mb-8">
                        Booking Details
                      </h2>
                      <div className="grid gap-6 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="location" className="text-base font-semibold flex items-center gap-2">
                            <span className="w-2 h-2 bg-primary rounded-full"></span>
                            Select Location *
                          </Label>
                          <Select
                            value={formData.location}
                            onValueChange={(value) =>
                              setFormData({ ...formData, location: value })
                            }
                          >
                            <SelectTrigger id="location" className="h-12 w-full border-2 border-primary/30 focus:border-primary">
                              <SelectValue placeholder="Choose Your Location" />
                            </SelectTrigger>
                            <SelectContent>
                              {locationChoices.map((loc) => (
                                <SelectItem key={loc} value={loc} className="cursor-pointer">
                                  {loc}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-base font-semibold flex items-center gap-2">
                            <span className="w-2 h-2 bg-primary rounded-full"></span>
                            Select Date *
                          </Label>
                          <div className="relative" ref={calendarRef}>
                            <div
                              onClick={() => setShowCalendar(!showCalendar)}
                              className="h-12 border-2 border-primary/30 rounded-lg px-3 bg-white flex items-center justify-between cursor-pointer hover:border-primary transition-colors"
                            >
                              <span className={selectedDate ? "text-foreground" : "text-muted-foreground"}>
                                {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                              </span>
                              <FaCalendarAlt className="text-primary" />
                            </div>
                            {showCalendar && (
                              <div className="absolute z-50 mt-2 border-2 border-primary/30 rounded-lg p-3 bg-white shadow-xl">
                                <Calendar
                                  mode="single"
                                  selected={selectedDate}
                                  onSelect={(date) => {
                                    setSelectedDate(date);
                                    setShowCalendar(false);
                                  }}
                                  disabled={(date) => date < new Date()}
                                  className="rounded-md"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                        {/* <div className="space-y-3">
                          <Label className="text-base font-medium">
                            Select Program(s) *
                          </Label>
                          {programsLoading ? (
                            <p className="text-sm text-muted-foreground">
                              Loading available programs...
                            </p>
                          ) : programsError ? (
                            <p className="text-sm text-red-600">
                              {programsError}
                            </p>
                          ) : programOptions.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              No programs are available for booking right now. Please check back later or contact us for assistance.
                            </p>
                          ) : (
                            <div className="grid gap-3 md:grid-cols-2">
                              {programOptions.map((program) => {
                                const resolvedId = program.id ?? program.title;
                                const checkboxId = `program-${String(resolvedId)
                                  .toLowerCase()
                                  .replace(/[^a-z0-9]+/g, "-")}`;
                                const isSelected = formData.programIds.includes(resolvedId);
                                const timeRange =
                                  program?.startTime && program?.endTime
                                    ? formatTimeRange(program.startTime, program.endTime)
                                    : null;
                                return (
                                  <div
                                    key={String(resolvedId)}
                                    className={`rounded-lg border p-4 transition-colors ${
                                      isSelected
                                        ? "border-primary bg-primary/5"
                                        : "border-muted-foreground/30 bg-background"
                                    }`}
                                  >
                                    <div className="flex items-start gap-3">
                                      <Checkbox
                                        id={checkboxId}
                                        checked={isSelected}
                                        onCheckedChange={() => handleProgramToggle(resolvedId)}
                                      />
                                      <label
                                        htmlFor={checkboxId}
                                        className="flex-1 cursor-pointer space-y-2"
                                      >
                                        <div>
                                          <p className="text-sm font-semibold text-foreground">
                                            {program.title || "Untitled Program"}
                                          </p>
                                          {program?.location?.name && (
                                            <p className="text-xs text-muted-foreground">
                                              {program.location.name}
                                            </p>
                                          )}
                                        </div>
                                        <div className="space-y-1 text-xs text-muted-foreground">
                                          {timeRange && <p>Time: {timeRange}</p>}
                                          {typeof program?.seats === "number" && (
                                            <p>Seats available: {program.seats}</p>
                                          )}
                                          {program?.description && (
                                            <p className="line-clamp-3">
                                              {program.description}
                                            </p>
                                          )}
                                        </div>
                                      </label>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div> */}





                        {selectedDate && (
                          <div className="space-y-6 rounded-xl border border-primary/20 p-6 bg-gradient-to-br from-primary/5 via-background to-primary/3 shadow-lg">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-8 bg-gradient-to-b from-primary to-primary/60 rounded-full" />
                                <div>
                                  <h3 className="text-xl font-bold text-primary">
                                    Availability Overview
                                  </h3>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Select your preferred time slots and activities
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                                  {format(selectedDate, "PPP")}
                                </span>
                                <span className="text-xs text-muted-foreground mt-1">
                                  Seasons & Activities
                                </span>
                              </div>
                            </div>
                            {availabilityForDate ? (
                              <div className="space-y-4">
                                <div className="rounded-lg border border-muted-foreground/20 bg-gradient-to-r from-background to-muted/30 p-5 shadow-sm">
                                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-3">
                                      <Checkbox
                                        id="use-global-seats"
                                        checked={useGlobalSeatCount}
                                        onCheckedChange={(checked) =>
                                          handleGlobalSeatToggle(checked)
                                        }
                                        className="border-2 border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                      />
                                      <label
                                        htmlFor="use-global-seats"
                                        className="cursor-pointer text-sm font-medium text-foreground"
                                      >
                                        Use the same seat count for every selected
                                        season
                                      </label>
                                    </div>
                                    {useGlobalSeatCount && (
                                      <div className="flex items-center gap-3 bg-primary/5 px-3 py-2 rounded-md">
                                        <Label
                                          htmlFor="global-seat-count"
                                          className="text-xs font-semibold uppercase tracking-wide text-primary"
                                        >
                                          Seats per season
                                        </Label>
                                        <Input
                                          id="global-seat-count"
                                          type="number"
                                          min="0"
                                          className="w-20 text-center font-medium border-primary/30 focus:border-primary"
                                          value={
                                            Number.isNaN(globalSeatCount)
                                              ? ""
                                              : globalSeatCount
                                          }
                                          onChange={(e) =>
                                            handleGlobalSeatCountChange(
                                              e.target.value
                                            )
                                          }
                                        />
                                      </div>
                                    )}
                                  </div>
                                  {!useGlobalSeatCount && (
                                    <p className="mt-2 text-xs text-muted-foreground">
                                      Adjust seat counts individually inside each
                                      season card below.
                                    </p>
                                  )}
                                </div>
                                <div className="grid gap-3">
                                  {availabilityForDate.map((season) => {
                                    const totalAvailable =
                                      getSeasonAvailabilityTotal(season.id);
                                    const seasonSelection =
                                      seasonSelections[season.id];
                                    const isSelected = Boolean(seasonSelection);
                                    const seatValue =
                                      isSelected &&
                                      typeof seasonSelection.seatsRequested ===
                                        "number"
                                        ? String(seasonSelection.seatsRequested)
                                        : "";
                                    const seatInputId = `seats-${season.id}`;

                                    return (
                                      <div
                                        key={season.id}
                                        className={`rounded-xl border transition-all duration-200 px-5 py-4 shadow-md hover:shadow-lg ${
                                          isSelected
                                            ? "bg-gradient-to-br from-primary/10 via-background to-primary/5 border-primary/30"
                                            : "bg-gradient-to-br from-background to-muted/20 border-muted-foreground/20 hover:border-primary/20"
                                        }`}
                                      >
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                          <div className="flex items-start gap-3">
                                            <Checkbox
                                              id={`season-${season.id}`}
                                              checked={isSelected}
                                              onCheckedChange={() =>
                                                handleSeasonToggle(season.id)
                                              }
                                              aria-label={`Select ${season.id}`}
                                              className="border-2 border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                            />
                                            <label
                                              htmlFor={`season-${season.id}`}
                                              className="cursor-pointer"
                                            >
                                              <div className="flex items-center gap-2 mb-1">
                                                <span className="text-lg font-bold text-primary">
                                                  {season.id}
                                                </span>
                                                <span className="text-sm text-muted-foreground">•</span>
                                                <span className="text-sm font-medium text-foreground">
                                                  {season.window}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${
                                                  totalAvailable > 5 ? "bg-green-500" :
                                                  totalAvailable > 2 ? "bg-yellow-500" : "bg-red-500"
                                                }`} />
                                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                  {totalAvailable} seats available
                                                </p>
                                              </div>
                                            </label>
                                          </div>
                                          <div className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                                            isSelected ? "bg-primary/10" : "bg-muted/30"
                                          }`}>
                                            <Label
                                              htmlFor={seatInputId}
                                              className="text-xs font-semibold uppercase tracking-wide text-primary"
                                            >
                                              Seats needed
                                            </Label>
                                            <Input
                                              id={seatInputId}
                                              type="number"
                                              min="0"
                                              max={totalAvailable}
                                              className={`w-20 text-center font-medium transition-colors ${
                                                isSelected
                                                  ? "border-primary/30 focus:border-primary"
                                                  : "border-muted-foreground/30"
                                              }`}
                                              value={isSelected ? seatValue : ""}
                                              onChange={(e) =>
                                                handleSeatsChange(
                                                  season.id,
                                                  Number.parseInt(
                                                    e.target.value,
                                                    10
                                                  ) || 0
                                                )
                                              }
                                              disabled={!isSelected}
                                              placeholder="0"
                                            />
                                          </div>
                                        </div>
                                        <div className="mt-4 grid gap-3 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                                          {season.activities.map((activity) => {
                                            const seatsTaken =
                                              activity.capacity !== null &&
                                              activity.capacity !== undefined
                                                ? Math.max(
                                                    0,
                                                    activity.capacity - activity.available
                                                  )
                                                : 0;
                                            const capacityLabel =
                                              activity.capacity !== null &&
                                              activity.capacity !== undefined
                                                ? `${activity.available} of ${activity.capacity} seats available`
                                                : `${activity.available} seats available`;
                                            const pricingDetails = getActivityPricingDetails(
                                              season.id,
                                              activity
                                            );
                                            const fillPercent = activity.capacity
                                              ? Math.round(
                                                  (seatsTaken / activity.capacity) *
                                                    100
                                                )
                                              : 0;
                                            const normalizedActivityId =
                                              activity.name
                                                .replace(/\s+/g, "-")
                                                .toLowerCase();
                                            const activityCheckboxId = `activity-${season.id}-${normalizedActivityId}`;
                                            const activitySelected = Boolean(
                                              seasonSelection?.activities?.[
                                                activity.name
                                              ]?.selected
                                            );
                                            const conflictsWithSelection = selectedSessions.some(
                                              (entry) => {
                                                if (entry.sessionId === activity.id) {
                                                  return false;
                                                }
                                                return rangesOverlap(entry, activity);
                                              }
                                            );
                                            const activityDisabled =
                                              !activitySelected && conflictsWithSelection;
                                            return (
                                              <div
                                                key={activity.name}
                                                className={`rounded-lg border p-3 sm:p-4 transition-all duration-200 hover:shadow-md ${
                                                  activitySelected
                                                    ? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-sm"
                                                    : "border-muted-foreground/20 bg-gradient-to-br from-muted/20 to-muted/10 hover:border-primary/30"
                                                }`}
                                              >
                                                <div className="flex flex-col gap-3">
                                                  <div className="flex items-start justify-between gap-2">
                                                    <label
                                                      htmlFor={activityCheckboxId}
                                                      className={`flex items-center gap-2 text-sm font-bold transition-colors cursor-pointer flex-1 min-w-0 ${
                                                        isSelected
                                                          ? activitySelected
                                                            ? "text-primary"
                                                            : "text-foreground hover:text-primary"
                                                          : "text-muted-foreground"
                                                      }`}
                                                    >
                                                      <Checkbox
                                                        id={activityCheckboxId}
                                                        checked={activitySelected}
                                                        disabled={!isSelected || activityDisabled}
                                                        onCheckedChange={() =>
                                                          handleActivityToggle(
                                                            season.id,
                                                            activity.name
                                                          )
                                                        }
                                                        className="border-2 border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary flex-shrink-0"
                                                      />
                                                      <span className="truncate">{activity.name}</span>
                                                    </label>
                                                  </div>
                                                  <div className="flex flex-col gap-2 text-xs">
                                                    <div className="flex items-center gap-2">
                                                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                                        activity.available > (activity.capacity || 10) * 0.7 ? "bg-green-500" :
                                                        activity.available > (activity.capacity || 10) * 0.3 ? "bg-yellow-500" : "bg-red-500"
                                                      }`} />
                                                      <span className="text-muted-foreground font-medium text-xs">{capacityLabel}</span>
                                                    </div>
                                                    {pricingDetails.perSeatLabel && (
                                                      <div className="bg-primary/10 px-2 py-1 rounded text-primary font-semibold text-xs whitespace-nowrap">
                                                        {pricingDetails.perSeatLabel}
                                                      </div>
                                                    )}
                                                    {pricingDetails.totalLabel && (
                                                      <div className="bg-primary text-primary-foreground px-2 py-1 rounded font-bold text-xs whitespace-nowrap">
                                                        {pricingDetails.totalLabel}
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                                <div className="h-2 w-full overflow-hidden rounded-full bg-muted shadow-inner">
                                                  <div
                                                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                                                      activitySelected
                                                        ? "bg-gradient-to-r from-primary to-primary/80"
                                                        : "bg-gradient-to-r from-primary/40 to-primary/20"
                                                    }`}
                                                    style={{
                                                      width: `${Math.min(
                                                        100,
                                                        Math.max(0, fillPercent)
                                                      )}%`,
                                                    }}
                                                  />
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                Availability information will appear once slots are
                                published for this date.
                              </p>
                            )}
                            {Object.keys(seasonSelections).length > 0 &&
                              !hasValidSeasonSelection && (
                                <p className="text-sm text-amber-600">
                                  Select at least one activity, choose session
                                  types, and enter the seats needed for each chosen
                                  season.
                                </p>
                              )}
                            {seasonSelectionSummary.length > 0 && (
                              <div className="rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
                                <p className="font-medium text-primary">
                                  Your selections
                                </p>
                                <ul className="mt-2 space-y-1 text-muted-foreground">
                                  {Object.entries(seasonSelections).map(
                                    ([seasonId, details]) => {
                                      const activities = Object.keys(
                                        details.activities
                                      );
                                      const activityList = activities.length
                                        ? activities.join(", ")
                                        : "No activities selected";
                                      return (
                                        <li key={seasonId}>
                                          <span className="font-medium text-foreground">
                                            {seasonId}:
                                          </span>{" "}
                                          {details.seatsRequested} seats •{" "}
                                          {activityList}
                                        </li>
                                      );
                                    }
                                  )}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="notes" className="text-base font-semibold">Additional Notes (Optional)</Label>
                          <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) =>
                              setFormData({ ...formData, notes: e.target.value })
                            }
                            placeholder="Any special requirements or questions?"
                            rows={4}
                            className="border-2 border-primary/30 focus:border-primary resize-none"
                          />
                        </div>
                      </div>
                      {/* Personal Information */}
                      <div className="space-y-4">
                        <h2 className="text-2xl font-serif font-bold text-primary">
                          Personal Information
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          Optional – if you skip this section we will use the first guest&apos;s details instead.
                        </p>
                        <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-4">
                          <Label htmlFor="promoCode" className="text-base font-semibold flex items-center gap-2">
                            {/* <FaStar className="text-yellow-500" /> */}
                            Enter Affiliate Code (Optional)
                          </Label>
                          <div className="flex gap-2 mt-2">
                            <Input
                              id="promoCode"
                              value={formData.promoCode || ""}
                              onChange={(e) => handlePromoCodeChange(e.target.value)}
                              placeholder="Enter promo code if you have one"
                              className="flex-1 h-12 border-2 border-primary/30 focus:border-primary"
                              disabled={promoStatus.state === "loading"}
                            />
                            {verifiedLeader ? (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleClearPromoCode}
                                disabled={promoStatus.state === "loading"}
                                className="h-12 border-2"
                              >
                                Clear
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                onClick={handleVerifyPromoCode}
                                disabled={promoStatus.state === "loading"}
                                className="h-12 bg-gradient-to-r from-primary to-primary/80"
                              >
                                {promoStatus.state === "loading" ? "Verifying..." : "Verify"}
                              </Button>
                            )}
                          </div>
                          {promoStatus.message && (
                            <p
                              className={`mt-2 text-sm ${
                                promoStatus.state === "error"
                                  ? "text-red-600"
                                  : "text-emerald-600"
                              }`}
                            >
                              {promoStatus.message}
                            </p>
                          )}
                        </div>
                        {verifiedLeader ? (
                          <div className="rounded-lg border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-5 shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                                <FaCheck className="text-white" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-emerald-700">Promo Code Applied</p>
                                <p className="text-base font-semibold text-emerald-900">
                                  Linked to {verifiedLeader.name || verifiedLeader.email}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="name" className="text-base font-semibold">Full Name (Optional)</Label>
                              <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) =>
                                  setFormData({ ...formData, name: e.target.value })
                                }
                                placeholder="John Doe"
                                className="h-12 border-2 border-primary/30 focus:border-primary"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="email" className="text-base font-semibold">Email (Optional)</Label>
                              <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) =>
                                  setFormData({ ...formData, email: e.target.value })
                                }
                                placeholder="john@example.com"
                                className="h-12 border-2 border-primary/30 focus:border-primary"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="phone" className="text-base font-semibold">Phone Number (Optional)</Label>
                              <div className="flex gap-2">
                                <Select
                                  value={formData.countryCode}
                                  onValueChange={handleCountryCodeChange}
                                >
                                  <SelectTrigger className="w-48 h-12 border-2 border-primary/30 focus:border-primary">
                                    <SelectValue placeholder="Select country" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {countryOptions.map((option) => (
                                      <SelectItem key={option.iso} value={option.iso}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Input
                                  id="phone"
                                  type="tel"
                                  className={`flex-1 h-12 border-2 ${phoneValidation.state === "error"
                                      ? "border-red-500 focus-visible:ring-red-500"
                                      : "border-primary/30 focus:border-primary"
                                  }`}
                                  value={formData.phone}
                                  onChange={(e) =>
                                    handlePhoneInputChange(e.target.value)
                                  }
                                  placeholder="234567890"
                                  aria-invalid={phoneValidation.state === "error"}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Leave blank if this booking shares the first guest&apos;s contact details.
                              </p>
                              {phoneValidation.state === "error" && (
                                <p className="mt-1 text-xs text-red-600">
                                  {phoneValidation.message ||
                                    "Enter a valid phone number for the selected country."}
                                </p>
                              )}
                              {phoneValidation.state === "success" && (
                                <p className="mt-1 text-xs text-emerald-600">
                                  Verified: {phoneValidation.message}
                                </p>
                              )}
                            </div>
                          </>
                        )}

                      </div>

                    {/* Section 2: Guest Details */}
                    {totalSeatsRequested > 0 && (
                      <div className="space-y-6 border-t-2 border-primary/20 pt-8">
                        <div className="flex items-center gap-3 pb-4 border-b-2 border-primary/20">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                            <FaUsers className="text-white" />
                          </div>
                          <div>
                            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-primary">
                              Guest Details
                            </h2>
                            <p className="text-sm text-muted-foreground">
                              {totalSeatsRequested} {totalSeatsRequested === 1 ? 'guest' : 'guests'} joining the tour
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                          Please provide information for each guest. These details help our guides welcome everyone smoothly.
                        </p>

                        <div className="space-y-4">
                          {guestDetails.map((guest, index) => (
                            <div
                              key={`guest-${index}`}
                              className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-white to-primary/5 p-6 shadow-lg hover:shadow-xl transition-all duration-300"
                            >
                              <div className="flex items-center justify-between gap-2 mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold">
                                    {index + 1}
                                  </div>
                                  <h3 className="text-xl font-bold text-primary">
                                    Guest {index + 1}
                                  </h3>
                                </div>
                                <span className="text-xs font-semibold uppercase tracking-wide bg-primary/10 text-primary px-3 py-1 rounded-full">
                                  Seat #{index + 1}
                                </span>
                              </div>
                              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <div className="sm:col-span-1">
                                  <Label htmlFor={`guest-name-${index}`} className="text-sm font-semibold">
                                    Full Name *
                                  </Label>
                                  <Input
                                    id={`guest-name-${index}`}
                                    value={guest.name}
                                    onChange={(e) =>
                                      handleGuestDetailChange(index, "name", e.target.value)
                                    }
                                    placeholder="Guest name"
                                    required
                                  />
                                </div>
                                <div className="sm:col-span-1">
                                  <Label htmlFor={`guest-id-${index}`} className="text-sm">
                                    ID / Passport Number
                                  </Label>
                                  <Input
                                    id={`guest-id-${index}`}
                                    value={guest.idNumber}
                                    onChange={(e) =>
                                      handleGuestDetailChange(index, "idNumber", e.target.value)
                                    }
                                    placeholder="ID number"
                                    required
                                  />
                                </div>
                                <div className="sm:col-span-1">
                                  <Label htmlFor={`guest-phone-${index}`} className="text-sm">
                                    Phone Number
                                  </Label>
                                  <Input
                                    id={`guest-phone-${index}`}
                                    value={guest.phone}
                                    onChange={(e) =>
                                      handleGuestDetailChange(index, "phone", e.target.value)
                                    }
                                    placeholder="Contact number"
                                    required
                                  />
                                </div>
                                <div className="sm:col-span-1">
                                  <Label htmlFor={`guest-email-${index}`} className="text-sm">
                                    Email
                                  </Label>
                                  <Input
                                    id={`guest-email-${index}`}
                                    type="email"
                                    value={guest.email}
                                    onChange={(e) =>
                                      handleGuestDetailChange(index, "email", e.target.value)
                                    }
                                    placeholder="guest@example.com"
                                    required
                                  />
                                </div>
                              </div>

                              {/* Session Type Selection for this guest */}
                              {allAvailableSessionTypes.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-primary/20">
                                  <Label className="text-sm font-semibold text-primary mb-3 block">
                                    Select Session Type(s) for this guest *
                                  </Label>
                                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {allAvailableSessionTypes.map((st) => {
                                      const checkboxId = `guest-${index}-st-${st.sessionTypeId}`;
                                      const isSelected = guest.selectedSessionTypes?.[st.sessionTypeId] === true;
                                      return (
                                        <div
                                          key={checkboxId}
                                          className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                                            isSelected
                                              ? "border-primary bg-primary/10"
                                              : "border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5"
                                          }`}
                                        >
                                          <Checkbox
                                            id={checkboxId}
                                            checked={isSelected}
                                            onCheckedChange={() => handleGuestSessionTypeToggle(index, st.sessionTypeId)}
                                            className="border-2 border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                          />
                                          <label
                                            htmlFor={checkboxId}
                                            className="text-sm cursor-pointer flex-1"
                                          >
                                            <span className={`font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
                                              {st.sessionTypeName}
                                            </span>
                                            <span className="text-xs text-muted-foreground block">
                                              {st.activityName}
                                            </span>
                                            <span className="text-xs font-semibold block mt-1">
                                              {st.specialPrice ? (
                                                <>
                                                  <span className="line-through text-muted-foreground mr-1">{formatPrice(st.price)}</span>
                                                  <span className="text-red-600">{formatPrice(st.specialPrice)}</span>
                                                </>
                                              ) : (
                                                <span className="text-primary">{formatPrice(st.price)}</span>
                                              )}
                                            </span>
                                          </label>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  {Object.keys(guest.selectedSessionTypes ?? {}).length === 0 && (
                                    <p className="text-xs text-amber-600 mt-2">
                                      Please select at least one session type for this guest.
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Section 3: Payment Options */}
                    <div className="space-y-4 border-t-2 border-primary/20 pt-8">
                      <h2 className="text-2xl font-serif font-bold text-primary">Payment Options</h2>

                      {paymentBreakdown.length > 0 ? (
                        <div className="rounded-lg border-2 border-dashed border-primary/30 bg-white/80 p-4 shadow-sm">
                          <div className="mb-3 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                                Payment Breakdown
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Detailed view of each session and session type you selected.
                              </p>
                            </div>
                            <span className="text-xs font-medium text-muted-foreground">
                              {paymentBreakdown.length} item{paymentBreakdown.length === 1 ? "" : "s"}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {paymentBreakdown.map((entry) => (
                              <div
                                key={entry.key}
                                className="flex items-center justify-between rounded-md border border-primary/20 bg-primary/5 px-3 py-2"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-foreground">{entry.title}</p>
                                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                      {entry.badge}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{entry.subtitle}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold text-primary">
                                    {formatPrice(entry.total)}
                                  </p>
                                  {entry.seats > 1 && (
                                    <p className="text-[11px] text-muted-foreground">
                                      {formatPrice(entry.unitPrice)} each
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Select sessions and session types to see a detailed payment breakdown.
                        </p>
                      )}

                      {/* Price Summary */}
                      <div className="rounded-lg border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Base Price:</span>
                            <span className="font-semibold">
                              {formatPrice(totalCost)}
                            </span>
                          </div>
                          {discountInfo?.appliedRule && (
                            <>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-emerald-600 flex items-center gap-2">
                                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                    Combo Discount
                                  </span>
                                  {discountInfo.appliedRule.name}
                                </span>
                                <span className="text-emerald-600 font-medium">
                                  -{formatPrice(Number(discountInfo.discountAmount) || 0)}
                                </span>
                              </div>
                              {discountInfo.appliedRule.description && (
                                <p className="text-xs text-muted-foreground italic">
                                  {discountInfo.appliedRule.description}
                                </p>
                              )}
                            </>
                          )}
                          <div className="flex justify-between items-center pt-2 border-t border-primary/20">
                            <span className="font-semibold">Total to Pay:</span>
                            <span className="text-xl font-bold text-primary">
                              {formatPrice(discountedTotalCost)}
                            </span>
                          </div>
                          {discountLoading && (
                            <p className="text-xs text-muted-foreground animate-pulse">Checking for eligible discounts...</p>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="payment">Payment Type *</Label>
                          <Select
                            value={formData.payment}
                            onValueChange={handlePaymentTypeChange}
                            required
                          >
                            <SelectTrigger id="payment">
                              <SelectValue placeholder="Choose payment option" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Full">Full Payment ({formatPrice(discountedTotalCost)})</SelectItem>
                              <SelectItem value="Partial">
                                Partial Payment (Pay 50% now: {formatPrice(partialPlanPreview.amountDueNow)})
                              </SelectItem>
                              <SelectItem value="Later">Pay Later</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {formData.payment === "Partial" && (
                          <div className="grid gap-2 p-4 bg-secondary/20 rounded-lg">
                            <p className="text-sm font-medium">Partial Payment</p>
                            <div className="flex justify-between text-sm">
                              <span>Pay 50% now:</span>
                              <span className="font-bold text-primary">
                                {formatPrice(partialPlanPreview.amountDueNow)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm mt-2 pt-2 border-t border-primary/10">
                              <span>Remaining balance:</span>
                              <span className="font-bold text-primary">
                                {formatPrice(partialPlanPreview.balance)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Confirm Booking Button */}
                    <div className="pt-6 border-t-2 border-primary/20">
                      <Button
                        type="submit"
                        size="lg"
                        className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-700 hover:via-emerald-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-300"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <span className="flex items-center gap-2">
                            <span className="animate-spin">⏳</span> Processing...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <FaCheck /> Confirm Booking
                          </span>
                        )}
                      </Button>
                    </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
