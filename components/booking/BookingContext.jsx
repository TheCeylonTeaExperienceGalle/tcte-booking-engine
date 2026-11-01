"use client";

import { createContext, useContext, useState, useMemo, useEffect, useCallback } from "react";
import { format } from "date-fns";

const BookingContext = createContext(undefined);

export function BookingProvider({ children }) {
  const [selectedDate, setSelectedDate] = useState();
  const [locationsList, setLocationsList] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [selectedLocationId, setSelectedLocationIdState] = useState("");
  const [programOptions, setProgramOptions] = useState([]);
  const [programsLoading, setProgramsLoading] = useState(false);
  const [programsError, setProgramsError] = useState("");
  
  const [programSelections, setProgramSelections] = useState({});
  const [guestDetails, setGuestDetails] = useState([]);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    countryCode: "LK",
    phone: "",
    location: "",
    payment: "Later",
    notes: "",
    promoCode: "",
    partialAmount: "",
  });
  
  const [discountInfo, setDiscountInfo] = useState(null);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [verifiedLeader, setVerifiedLeader] = useState(null);
  const [promoStatus, setPromoStatus] = useState({ state: "idle", message: "" });
  const [currentStage, setCurrentStage] = useState("selection"); // 'selection', 'guests'
  const [isAgentBooking, setIsAgentBooking] = useState(false);

  // Set location and reset program selections if switching location
  const setSelectedLocationId = useCallback((newLocId) => {
    setSelectedLocationIdState((prev) => {
      const resolved = typeof newLocId === "function" ? newLocId(prev) : newLocId;
      if (prev && resolved && String(prev) !== String(resolved)) {
        setProgramSelections({});
      }
      return resolved;
    });
  }, []);

  // Fetch Locations from backend on mount
  useEffect(() => {
    let isMounted = true;
    const fetchLocations = async () => {
      setLocationsLoading(true);
      try {
        const response = await fetch("/api/public/locations", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load locations");
        const data = await response.json();
        if (isMounted) {
          const locs = Array.isArray(data.locations) ? data.locations : [];
          setLocationsList(locs);
          setSelectedLocationIdState((prev) => (prev && prev !== "all" ? prev : ""));
        }
      } catch (err) {
        console.error("Error fetching locations:", err);
      } finally {
        if (isMounted) setLocationsLoading(false);
      }
    };
    fetchLocations();
    return () => { isMounted = false; };
  }, []);

  // Sync formData.location with selectedLocationId
  useEffect(() => {
    if (!selectedLocationId || selectedLocationId === "all") {
      setFormData(prev => ({ ...prev, location: "" }));
    } else {
      const loc = locationsList.find(l => String(l.id) === String(selectedLocationId));
      if (loc) {
        setFormData(prev => ({ ...prev, location: loc.name }));
      }
    }
  }, [selectedLocationId, locationsList]);

  // Fetch Programs when date or location changes (must have a specific location selected)
  useEffect(() => {
    let isMounted = true;
    const fetchPrograms = async () => {
      if (!selectedLocationId || selectedLocationId === "all") {
        setProgramOptions([]);
        setProgramsLoading(false);
        return;
      }

      setProgramsLoading(true);
      setProgramsError("");
      try {
        const params = new URLSearchParams();
        if (selectedDate) {
          params.set("date", format(selectedDate, "yyyy-MM-dd"));
        }
        params.set("locationId", String(selectedLocationId));

        const response = await fetch(`/api/public/programs?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load programs");
        const data = await response.json();
        if (isMounted) setProgramOptions(Array.isArray(data.programs) ? data.programs : []);
      } catch (error) {
        if (isMounted) setProgramsError(error.message);
      } finally {
        if (isMounted) setProgramsLoading(false);
      }
    };
    fetchPrograms();
    return () => { isMounted = false; };
  }, [selectedDate, selectedLocationId]);

  const totalSeatsRequested = useMemo(() => {
    let total = 0;
    Object.values(programSelections).forEach(selection => {
      if (selection.seatsRequested > total) {
        total = selection.seatsRequested; 
      }
    });
    return total;
  }, [programSelections]);

  // Adjust guest details array based on seats
  useEffect(() => {
    if (totalSeatsRequested === 0) return;
    setGuestDetails(prev => {
      if (prev.length === totalSeatsRequested) return prev;
      if (prev.length < totalSeatsRequested) {
        const additional = Array.from({ length: totalSeatsRequested - prev.length }, () => ({
          name: "", idNumber: "", phone: "", email: "", selectedSessionTypes: {}
        }));
        return [...prev, ...additional];
      }
      return prev.slice(0, totalSeatsRequested);
    });
  }, [totalSeatsRequested]);

  // Helper to parse price
  const parsePrice = (val) => {
    if (val == null || val === "") return 0;
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  };

  const costBreakdown = useMemo(() => {
    let programBaseTotal = 0;
    let activityTotal = 0;
    let baseTotal = 0;
    let typeTotal = 0;
    const selectedActivities = [];
    
    Object.entries(programSelections).forEach(([programId, selection]) => {
      if (!selection || selection.seatsRequested <= 0) return;
      
      const program = programOptions.find(p => String(p.id) === String(programId));
      if (!program) return;

      const pBase = parsePrice(program.price) * selection.seatsRequested;
      programBaseTotal += pBase;
      baseTotal += pBase;
      
      Object.entries(selection.activities || {}).forEach(([sessionId, actState]) => {
        if (!actState?.selected) return;
        const session = program.sessions?.find(s => String(s.id) === String(sessionId));
        if (!session) return;
        
        const sessionPrice = (session.specialPrice != null && session.specialPrice !== "")
          ? parsePrice(session.specialPrice)
          : parsePrice(session.price);
        const actCost = sessionPrice * selection.seatsRequested;
        activityTotal += actCost;
        baseTotal += actCost;

        selectedActivities.push({
          sessionId: session.id,
          name: session.name,
          programTitle: program.title,
          startTime: session.startTime,
          endTime: session.endTime,
          unitPrice: sessionPrice,
          seats: selection.seatsRequested,
          totalPrice: actCost
        });
        
        if (guestDetails.length > 0) {
          guestDetails.forEach(guest => {
            Object.keys(guest.selectedSessionTypes || {}).forEach(typeId => {
              const st = session.sessionTypes?.find(t => String(t.id) === String(typeId));
              if (st) {
                const optPrice = (st.specialPrice != null && st.specialPrice !== "")
                  ? parsePrice(st.specialPrice)
                  : parsePrice(st.price);
                typeTotal += optPrice;
              }
            });
          });
        }
      });
    });
    
    return {
      programBaseTotal,
      activityTotal,
      selectedActivities,
      baseTotal,
      typeTotal,
      total: baseTotal + typeTotal
    };
  }, [programSelections, programOptions, guestDetails]);

  const value = {
    selectedDate, setSelectedDate,
    locationsList, locationsLoading,
    selectedLocationId, setSelectedLocationId,
    programOptions, programsLoading, programsError,
    programSelections, setProgramSelections,
    guestDetails, setGuestDetails,
    formData, setFormData,
    discountInfo, setDiscountInfo,
    discountLoading, setDiscountLoading,
    verifiedLeader, setVerifiedLeader,
    promoStatus, setPromoStatus,
    currentStage, setCurrentStage,
    isAgentBooking, setIsAgentBooking,
    totalSeatsRequested,
    costBreakdown
  };

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error("useBooking must be used within a BookingProvider");
  }
  return context;
}
