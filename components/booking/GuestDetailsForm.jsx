"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FaUsers, FaChevronDown, FaCheckCircle, FaIdBadge, FaClock } from "react-icons/fa";
import { useBooking } from "./BookingContext";
import { validateGuestField, EMAIL_REGEX } from "@/lib/validation";

export default function GuestDetailsForm() {
  const {
    programSelections, programOptions,
    guestDetails, setGuestDetails,
    totalSeatsRequested,
    isAgentBooking, setIsAgentBooking,
    verifiedLeader, setVerifiedLeader
  } = useBooking();

  // Keep guest tabs collapsed (-1) when 2 or more seats are selected, unless toggled by user
  const [userExpandedIndex, setUserExpandedIndex] = useState(null);
  const [prevTotalSeats, setPrevTotalSeats] = useState(totalSeatsRequested);

  if (prevTotalSeats !== totalSeatsRequested) {
    setPrevTotalSeats(totalSeatsRequested);
    setUserExpandedIndex(null);
  }

  const expandedIndex =
    userExpandedIndex !== null
      ? userExpandedIndex
      : totalSeatsRequested >= 2
      ? -1
      : 0;
  const [guestErrors, setGuestErrors] = useState({});
  const [touched, setTouched] = useState({}); // { "0-idNumber": true, ... }

  // Agent flow state
  const [agentSearchCode, setAgentSearchCode] = useState("");
  const [agentStatus, setAgentStatus] = useState({ loading: false, error: null });
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [registerData, setRegisterData] = useState({ name: "", email: "", contact: "" });
  const [registrationPendingInfo, setRegistrationPendingInfo] = useState(null);

  const handleSearchAgent = async () => {
    if (!agentSearchCode) return;
    setAgentStatus({ loading: true, error: null });
    try {
      const res = await fetch(`/api/public/promo?code=${encodeURIComponent(agentSearchCode)}`);
      const data = await res.json();
      if (res.ok) {
        setVerifiedLeader({
          id: data.leader.id,
          name: data.leader.name,
          email: data.leader.email,
          promoteCode: data.leader.promoteCode
        });
        setAgentStatus({ loading: false, error: null });
        setShowRegisterForm(false);
      } else {
        setAgentStatus({ loading: false, error: data.error || "Agent not found" });
      }
    } catch (err) {
      setAgentStatus({ loading: false, error: "Network error" });
    }
  };

  const handleRegisterAgent = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!registerData.name || !registerData.email) {
      setAgentStatus({ loading: false, error: "Full Name and Email are required." });
      return;
    }
    if (!EMAIL_REGEX.test(registerData.email.trim())) {
      setAgentStatus({ loading: false, error: "Enter a valid email address." });
      return;
    }

    setAgentStatus({ loading: true, error: null });
    try {
      const res = await fetch("/api/public/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerData)
      });
      const data = await res.json();
      if (res.ok) {
        setAgentStatus({ loading: false, error: null });
        if (data.pending) {
          setRegistrationPendingInfo({
            name: data.leader.name,
            email: data.leader.email,
            promoteCode: data.leader.promoteCode
          });
        } else {
          setVerifiedLeader({
            id: data.leader.id,
            name: data.leader.name,
            email: data.leader.email,
            promoteCode: data.leader.promoteCode
          });
          setShowRegisterForm(false);
        }
      } else {
        setAgentStatus({ loading: false, error: data.error || "Failed to register" });
      }
    } catch (err) {
      setAgentStatus({ loading: false, error: "Network error" });
    }
  };

  const handleGuestDetailChange = (index, field, value, requiredNow) => {
    setGuestDetails(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });

    // Only surface an error once the user has touched the field
    const key = `${index}-${field}`;
    if (touched[key]) {
      const error = validateGuestField(field, value, requiredNow);
      setGuestErrors(prev => ({
        ...prev,
        [index]: { ...prev[index], [field]: error }
      }));
    }
  };

  const handleGuestFieldBlur = (index, field, value, requiredNow) => {
    const key = `${index}-${field}`;
    setTouched(prev => ({ ...prev, [key]: true }));
    const error = validateGuestField(field, value, requiredNow);
    setGuestErrors(prev => ({
      ...prev,
      [index]: { ...prev[index], [field]: error }
    }));
  };

  const handleSessionTypeToggle = (guestIndex, typeId) => {
    setGuestDetails(prev => {
      const next = [...prev];
      const guest = next[guestIndex];
      const selected = { ...(guest.selectedSessionTypes || {}) };
      const selectedType = availableTypes.find(type => String(type.id) === String(typeId));
      if (!selectedType) return prev;

      if (selected[typeId]) {
        delete selected[typeId];
      } else {
        // Exactly one option allowed per session - clear any other option for this session
        availableTypes
          .filter(type => type.sessionId === selectedType.sessionId)
          .forEach(type => delete selected[type.id]);
        selected[typeId] = true;
      }
      next[guestIndex] = { ...guest, selectedSessionTypes: selected };
      return next;
    });
  };

  // Collect all available session types and group by session for selected sessions
  const { availableTypes, typesBySession } = useMemo(() => {
    const types = [];
    const groups = [];
    const groupMap = new Map();

    Object.entries(programSelections).forEach(([programId, selection]) => {
      if (!selection || selection.seatsRequested <= 0) return;
      const program = programOptions.find(p => String(p.id) === String(programId));
      if (!program) return;

      Object.entries(selection.activities || {}).forEach(([sessionId, state]) => {
        if (!state.selected) return;
        const session = program.sessions?.find(s => String(s.id) === String(sessionId));
        if (session?.sessionTypes?.length > 0) {
          session.sessionTypes.forEach(st => {
            const resolvedPrice = (st.specialPrice != null && st.specialPrice !== "")
              ? Number(st.specialPrice)
              : Number(st.price || 0);
            const item = {
              id: st.id,
              sessionId: session.id,
              name: st.name,
              sessionName: session.name,
              programName: program.title,
              price: isNaN(resolvedPrice) ? 0 : resolvedPrice
            };
            types.push(item);

            if (!groupMap.has(session.id)) {
              const group = {
                sessionId: session.id,
                sessionName: session.name,
                programName: program.title,
                types: [],
              };
              groupMap.set(session.id, group);
              groups.push(group);
            }
            groupMap.get(session.id).types.push(item);
          });
        }
      });
    });

    return { availableTypes: types, typesBySession: groups };
  }, [programSelections, programOptions]);

  const formatPrice = (val) => {
    if (val == null) return "Included";
    const n = Number(val);
    return isNaN(n) ? "Included" : `USD ${n.toLocaleString()}`;
  };

  if (totalSeatsRequested === 0) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* AGENT BOOKING SECTION */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <label htmlFor="agent-booking-toggle" className="flex items-center gap-3 cursor-pointer select-none">
            <Checkbox
              id="agent-booking-toggle"
              checked={isAgentBooking}
              onCheckedChange={(checked) => {
                const isChecked = checked === true;
                setIsAgentBooking(isChecked);
                if (!isChecked) {
                  setVerifiedLeader(null);
                  setAgentSearchCode("");
                  setAgentStatus({ loading: false, error: null });
                }
              }}
              className="h-5 w-5 rounded-md"
            />
            <div className="flex items-center gap-2">
              <FaIdBadge className="text-primary h-4 w-4" />
              <span className="font-bold text-foreground text-sm sm:text-base">
                Are you a Travel Agent?
              </span>
            </div>
          </label>
        </div>

        {isAgentBooking && (
          <div className="pt-3 border-t border-primary/15 space-y-3">
            {verifiedLeader ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-primary/30 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <FaCheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-sm">{verifiedLeader.name}</span>
                      <span className="bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded">
                        {verifiedLeader.promoteCode}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{verifiedLeader.email}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setVerifiedLeader(null);
                    setAgentSearchCode("");
                  }}
                  className="text-xs self-end sm:self-auto"
                >
                  Change Agent
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Enter your Agent ID / Promo code to link this booking with your agent account.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Enter Agent Code (e.g. AGENT1234)"
                      value={agentSearchCode}
                      onChange={(e) => {
                        setAgentSearchCode(e.target.value);
                        if (agentStatus.error) setAgentStatus(prev => ({ ...prev, error: null }));
                      }}
                      className="bg-card uppercase h-10"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleSearchAgent}
                    disabled={!agentSearchCode.trim() || agentStatus.loading}
                    className="h-10"
                  >
                    {agentStatus.loading ? "Verifying..." : "Verify Agent"}
                  </Button>
                </div>

                {agentStatus.error && (
                  <p className="text-xs text-destructive font-medium">{agentStatus.error}</p>
                )}

                <div className="pt-1 text-xs text-muted-foreground">
                  Don&apos;t have an agent code?{" "}
                  <button
                    type="button"
                    onClick={() => setShowRegisterForm(true)}
                    className="text-primary font-bold hover:underline cursor-pointer"
                  >
                    Register as a New Partner
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* GUEST DETAILS SECTION */}
      <div className="flex items-center gap-3 pb-4 border-b border-primary/20 mb-6">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm">
          <FaUsers className="text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-serif font-bold text-primary">Guest Details</h2>
          <p className="text-sm text-muted-foreground">
            {totalSeatsRequested} {totalSeatsRequested === 1 ? 'guest' : 'guests'} joining
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {guestDetails.map((guest, index) => {
          const isExpanded = expandedIndex === index;
          const isPrimary = index === 0;
          const requiresFullDetails = isPrimary || !isAgentBooking;

          const errors = guestErrors[index] || {};
          const isComplete =
            guest.name &&
            !validateGuestField("name", guest.name, true) &&
            (requiresFullDetails
              ? !validateGuestField("idNumber", guest.idNumber, true) &&
                !validateGuestField("phone", guest.phone, true) &&
                !validateGuestField("email", guest.email, true)
              : true);

          let guestLabel = `Guest ${index + 1}`;
          if (isAgentBooking && isPrimary) {
            guestLabel = "Primary Contact";
          }

          const guestName = guest.name?.trim() || guestLabel;

          return (
            <div key={index} className="rounded-xl border border-border bg-card shadow-sm hover:border-primary/50 transition-all overflow-hidden">
              <div
                className="p-4 flex items-center justify-between cursor-pointer select-none bg-card hover:bg-muted/20"
                onClick={() => setUserExpandedIndex(isExpanded ? -1 : index)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${isComplete ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary'}`}>
                    {isComplete ? <FaCheckCircle /> : index + 1}
                  </div>
                  <h3 className={`text-lg font-bold ${guest.name ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {guestName}
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  {!isExpanded && !isComplete && (
                    <span className="text-xs text-orange-500 font-semibold uppercase tracking-wider hidden sm:block">Incomplete</span>
                  )}
                  <FaChevronDown className={`text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {isExpanded && (
                <div className="p-6 border-t border-border bg-card/50">
                  <div className="grid gap-5 grid-cols-1 xl:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold">Full Name *</Label>
                      <Input
                        value={guest.name}
                        onChange={(e) => handleGuestDetailChange(index, 'name', e.target.value, true)}
                        onBlur={(e) => handleGuestFieldBlur(index, 'name', e.target.value, true)}
                        placeholder="e.g. Roshan"
                        required
                        className={`bg-white ${errors.name ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      />
                      {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold">ID / Passport {requiresFullDetails ? '*' : '(Optional)'}</Label>
                      <Input
                        value={guest.idNumber}
                        onChange={(e) => handleGuestDetailChange(index, 'idNumber', e.target.value, requiresFullDetails)}
                        onBlur={(e) => handleGuestFieldBlur(index, 'idNumber', e.target.value, requiresFullDetails)}
                        placeholder="e.g. 801254256320"
                        required={requiresFullDetails}
                        className={`bg-white ${errors.idNumber ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      />
                      {errors.idNumber && <p className="text-xs text-destructive mt-1">{errors.idNumber}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold">WhatsApp No {requiresFullDetails ? '*' : '(Optional)'}</Label>
                      <Input
                        value={guest.phone}
                        onChange={(e) => handleGuestDetailChange(index, 'phone', e.target.value, requiresFullDetails)}
                        onBlur={(e) => handleGuestFieldBlur(index, 'phone', e.target.value, requiresFullDetails)}
                        placeholder="e.g. +94 710792615"
                        required={requiresFullDetails}
                        className={`bg-white ${errors.phone ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      />
                      {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold">Email {requiresFullDetails ? '*' : '(Optional)'}</Label>
                      <Input
                        type="email"
                        value={guest.email}
                        onChange={(e) => handleGuestDetailChange(index, 'email', e.target.value, requiresFullDetails)}
                        onBlur={(e) => handleGuestFieldBlur(index, 'email', e.target.value, requiresFullDetails)}
                        placeholder="e.g. roshan@gmail.com"
                        required={requiresFullDetails}
                        className={`bg-white ${errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      />
                      {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                    </div>
                  </div>

                  {typesBySession.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-border/50 space-y-6">
                      <div>
                        <Label className="text-base font-bold flex items-center gap-2">
                          <span className="w-1.5 h-4 bg-primary rounded-full inline-block"></span>
                          Select Tickets for {guestName} *
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Choose one ticket option for each activity
                        </p>
                      </div>

                      <div className="space-y-5">
                        {typesBySession.map((sessionGroup) => (
                          <div
                            key={sessionGroup.sessionId}
                            className="bg-muted/15 p-4 rounded-xl border border-border/70 space-y-3"
                          >
                            <div className="flex items-center justify-between pb-2 border-b border-border/40">
                              <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                                Activity: {sessionGroup.sessionName}
                              </span>
                              <span className="text-[11px] font-medium text-muted-foreground">
                                {sessionGroup.programName}
                              </span>
                            </div>

                            <div className="grid gap-2.5 grid-cols-1">
                              {sessionGroup.types.map((st) => {
                                const isSelected = !!guest.selectedSessionTypes?.[st.id];
                                return (
                                  <div
                                    key={st.id}
                                    onClick={() => handleSessionTypeToggle(index, st.id)}
                                    className={`flex items-center gap-3.5 p-3.5 rounded-xl border-2 cursor-pointer transition-all select-none ${
                                      isSelected
                                        ? "border-primary bg-primary/5 ring-1 ring-primary/30 shadow-sm"
                                        : "border-border bg-white hover:border-primary/40 hover:bg-muted/10"
                                    }`}
                                  >
                                    <div
                                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                        isSelected
                                          ? "border-primary bg-primary"
                                          : "border-muted-foreground/40 bg-background"
                                      }`}
                                    >
                                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                    </div>
                                    <div className="flex-1 flex justify-between items-center text-sm">
                                      <div>
                                        <span className="font-bold text-base block text-foreground">
                                          {st.name}
                                        </span>
                                      </div>
                                      <span className="font-bold text-lg text-primary">
                                        {formatPrice(st.price)}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* AGENT REGISTRATION DIALOG */}
      <Dialog 
        open={showRegisterForm} 
        onOpenChange={(open) => {
          setShowRegisterForm(open);
          if (!open) {
            setRegistrationPendingInfo(null);
            setAgentStatus({ loading: false, error: null });
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          {registrationPendingInfo ? (
            <div className="py-3 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xl">
                <FaClock />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">Registration Submitted!</h3>
                <p className="text-sm text-muted-foreground">
                  Thank you for applying, <span className="font-semibold text-foreground">{registrationPendingInfo.name}</span>.
                </p>
              </div>
              <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 text-left space-y-1.5">
                <p className="font-semibold flex items-center gap-1.5 text-amber-800">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                  Pending Admin Verification
                </p>
                <p className="leading-relaxed opacity-90">
                  Your travel agent account has been registered and is currently awaiting administrator review. Once verified by an admin, your agent code will become active for bookings and commissions.
                </p>
              </div>
              <Button 
                type="button"
                onClick={() => {
                  setRegistrationPendingInfo(null);
                  setShowRegisterForm(false);
                  setRegisterData({ name: "", email: "", contact: "" });
                }}
                className="w-full mt-2"
              >
                Got It
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                  <FaIdBadge className="text-primary" />
                  Register as Travel Partner
                </DialogTitle>
              </DialogHeader>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRegisterAgent(e);
                }}
                className="space-y-4 pt-2"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="agent-name" className="text-xs font-semibold uppercase">Full Name *</Label>
                  <Input
                    id="agent-name"
                    placeholder="Agent or Agency Name"
                    value={registerData.name}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="agent-email" className="text-xs font-semibold uppercase">Email Address *</Label>
                  <Input
                    id="agent-email"
                    type="email"
                    placeholder="agent@agency.com"
                    value={registerData.email}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="agent-contact" className="text-xs font-semibold uppercase">WhatsApp / Contact Number</Label>
                  <Input
                    id="agent-contact"
                    placeholder="e.g. +94 77 123 4567"
                    value={registerData.contact}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, contact: e.target.value }))}
                  />
                </div>

                {agentStatus.error && (
                  <p className="text-xs text-destructive font-medium">{agentStatus.error}</p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowRegisterForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={agentStatus.loading}>
                    {agentStatus.loading ? "Registering..." : "Submit Registration"}
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}