/**
 * Date & Timezone utilities for Sri Lanka (Asia/Colombo)
 */

export function getColomboNow() {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());
  const getPart = (type) => parts.find((p) => p.type === type)?.value;
  const year = parseInt(getPart("year"), 10);
  const month = parseInt(getPart("month"), 10);
  const day = parseInt(getPart("day"), 10);
  const hour = parseInt(getPart("hour"), 10);
  const minute = parseInt(getPart("minute"), 10);
  const second = parseInt(getPart("second"), 10);

  const dateString = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const minutesFromMidnight = hour * 60 + minute;

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    dateString,
    minutesFromMidnight,
  };
}

export function getCurrentColomboDateString() {
  return getColomboNow().dateString;
}

export const SESSION_BOOKING_CUTOFF_HOURS = 4;

/**
 * Checks if a session on a given date is past or within the booking cutoff window (4 hours before start) in Asia/Colombo.
 * @param {string|Date} dateInput - The target date of the session (e.g. "2026-10-20" or Date object)
 * @param {string|Date} startTimeInput - Session start time (e.g. "1970-01-01T08:30:00.000Z")
 * @param {number} [cutoffHours=4] - Cutoff window in hours before session start time (defaults to 4)
 * @returns {boolean} True if the session is within 4 hours of starting, in progress, or in the past.
 */
export function isSessionPastInColombo(dateInput, startTimeInput, cutoffHours = SESSION_BOOKING_CUTOFF_HOURS) {
  if (!dateInput || !startTimeInput) return false;

  let bookedDateStr = "";
  if (typeof dateInput === "string") {
    bookedDateStr = dateInput.split("T")[0];
  } else if (dateInput instanceof Date) {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Colombo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(dateInput);
    const getPart = (type) => parts.find((p) => p.type === type)?.value;
    bookedDateStr = `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
  }

  const parts = (bookedDateStr || "").split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return false;
  const [year, month, day] = parts;
  if (year < 1970 || month < 1 || month > 12 || day < 1 || day > 31) return false;

  const startDate = new Date(startTimeInput);
  if (Number.isNaN(startDate.getTime())) return false;

  // Session times in TCTE are stored in UTC (e.g. 1970-01-01T08:30:00.000Z where 08:30 is the local Colombo time)
  const sessionHour = startDate.getUTCHours();
  const sessionMinute = startDate.getUTCMinutes();

  // Convert Colombo local session time to UTC timestamp (Colombo is UTC+05:30)
  const sessionUtcMs =
    Date.UTC(year, month - 1, day, sessionHour, sessionMinute) - (5.5 * 60 * 60 * 1000);
  const nowUtcMs = Date.now();
  const diffMs = sessionUtcMs - nowUtcMs;
  const cutoffMs = cutoffHours * 60 * 60 * 1000;

  // Unavailable if session starts in cutoffHours (e.g. 4 hours) or less, or is already in progress/past
  return diffMs <= cutoffMs;
}

/**
 * Formats a stored UTC session time (e.g. "1970-01-01T09:30:00.000Z") into standard 12-hour AM/PM display
 * without shifting by client/server local timezones.
 * @param {string|Date} value - Stored session time
 * @returns {string} Formatted time string (e.g. "9:30 AM")
 */
export function formatSessionTime(value) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    if (typeof value === "string" && /^\d{2}:\d{2}/.test(value)) {
      const [h, m] = value.slice(0, 5).split(":").map(Number);
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
    }
    return String(value);
  }
  let hours = date.getUTCHours();
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Formats a stored UTC session time into 24-hour HH:mm (e.g. "09:30")
 * @param {string|Date} value - Stored session time
 * @returns {string} Formatted time string (e.g. "09:30")
 */
export function formatSessionTime24(value) {
  if (!value) return "--:--";
  const date = typeof value === "string" ? new Date(value) : value;
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    if (typeof value === "string" && /^\d{2}:\d{2}/.test(value)) {
      return value.slice(0, 5);
    }
    return "--:--";
  }
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

