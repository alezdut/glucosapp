/**
 * Date utility functions
 */

/**
 * Calculate age from birth date
 * @param birthDate - Birth date as Date object, ISO string, or undefined
 * @returns Age in years, or null if birthDate is not provided or invalid
 */
export const calculateAge = (birthDate: Date | string | undefined): number | null => {
  if (!birthDate) return null;

  // Normalize string input (trim whitespace)
  const normalizedBirthDate = typeof birthDate === "string" ? birthDate.trim() : birthDate;

  // Return null if string is empty after trimming
  if (typeof normalizedBirthDate === "string" && normalizedBirthDate.length === 0) {
    return null;
  }

  const birthDateObj =
    normalizedBirthDate instanceof Date ? normalizedBirthDate : new Date(normalizedBirthDate);

  // Validate date to prevent NaN values
  if (isNaN(birthDateObj.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDateObj.getFullYear();
  const monthDiff = today.getMonth() - birthDateObj.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
    age--;
  }
  return age;
};

/**
 * Format a date string to show relative time (e.g., "Hace 3 minutos")
 * @param dateString - ISO date string
 * @returns Formatted relative time string
 */
export const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);

  // Validate date to prevent NaN values
  if (isNaN(date.getTime())) {
    return "Fecha inválida";
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Hace un momento";
  if (diffMins < 60) return `Hace ${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `Hace ${diffDays} días`;
  const diffMonths = Math.floor(diffDays / 30);
  return `Hace ${diffMonths} mes${diffMonths > 1 ? "es" : ""}`;
};

/**
 * Formats a local date as YYYY-MM-DD string using local date components
 * This avoids timezone shifts that occur with toISOString()
 *
 * Example:
 * - Input: March 8, 2025 (local time)
 * - Output: "2025-03-08"
 *
 * @param date - The local date to format
 * @returns Date string in YYYY-MM-DD format
 */
export const formatLocalDateAsYYYYMMDD = (date: Date): string => {
  if (isNaN(date.getTime())) {
    throw new Error("Invalid date provided to formatLocalDateAsYYYYMMDD");
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Converts a local date to UTC start of day (00:00:00.000)
 * This takes the local calendar day and sets it to midnight in local time,
 * then converts that to UTC (which will shift based on timezone offset)
 *
 * Example (in UTC-5):
 * - Input: March 8, 2025 (any time)
 * - Output: 2025-03-08T05:00:00.000Z (midnight local time converted to UTC)
 *
 * @param localDate - The local date to convert
 * @returns Date object representing the start of the local day in UTC
 */
export const getUtcStartOfLocalDay = (localDate: Date): Date => {
  // Validate input Date
  if (!(localDate instanceof Date)) {
    throw new TypeError("invalid Date input: expected Date instance");
  }
  if (isNaN(localDate.getTime())) {
    throw new TypeError("invalid Date input: Date has invalid time");
  }

  const start = new Date(localDate);
  start.setHours(0, 0, 0, 0);
  return start;
};

/**
 * Converts a local date to UTC end of day (23:59:59.999)
 * This takes the local calendar day and sets it to end of day in local time,
 * then converts that to UTC (which will shift based on timezone offset)
 *
 * Example (in UTC-5):
 * - Input: March 8, 2025 (any time)
 * - Output: 2025-03-09T04:59:59.999Z (23:59:59 local time converted to UTC)
 *
 * @param localDate - The local date to convert
 * @returns Date object representing the end of the local day in UTC
 */
export const getUtcEndOfLocalDay = (localDate: Date): Date => {
  // Validate input Date
  if (!(localDate instanceof Date)) {
    throw new TypeError("invalid Date input: expected Date instance");
  }
  if (isNaN(localDate.getTime())) {
    throw new TypeError("invalid Date input: Date has invalid time");
  }

  const end = new Date(localDate);
  end.setHours(23, 59, 59, 999);
  return end;
};

/**
 * Converts a local date range to UTC-aligned ISO strings
 * Useful for API calls that expect UTC timestamps but should filter by local calendar days
 *
 * @param startDate - Start date in local time
 * @param endDate - End date in local time
 * @returns Object with UTC-aligned ISO strings for start and end
 */
export const getUtcDateRangeIsoStrings = (
  startDate: Date,
  endDate: Date,
): { startDateIso: string; endDateIso: string } => {
  const utcStart = getUtcStartOfLocalDay(startDate);
  const utcEnd = getUtcEndOfLocalDay(endDate);

  return {
    startDateIso: utcStart.toISOString(),
    endDateIso: utcEnd.toISOString(),
  };
};

/**
 * Format minutes as HH:MM string for display
 *
 * @param minutes - Minutes since midnight (0-1439)
 * @returns Formatted time string (HH:MM)
 */
export const formatTimeFromMinutes = (minutes: number): string => {
  // Validate input: must be a finite number
  if (typeof minutes !== "number" || !Number.isFinite(minutes)) {
    throw new TypeError("invalid minutes input: expected a finite number");
  }
  // Validate range: 0-1439 (0 minutes to 23:59)
  if (minutes < 0 || minutes > 1439) {
    throw new RangeError(`invalid minutes input: must be between 0 and 1439 (got ${minutes})`);
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
};

/**
 * Validate time string format (HH:mm)
 *
 * @param timeStr - Time string to validate
 * @returns true if format is valid HH:mm, false otherwise
 */
export const validateTimeFormat = (timeStr: string): boolean => {
  if (!timeStr || typeof timeStr !== "string") {
    return false;
  }
  return /^\d{2}:\d{2}$/.test(timeStr);
};

/**
 * Parse time string (HH:mm) to minutes since midnight
 * Validates format and hour/minute ranges
 *
 * @param timeStr - Time string in HH:mm format
 * @returns Minutes since midnight (0-1439), or null if invalid
 */
export const parseTimeString = (timeStr: string): number | null => {
  if (!timeStr || typeof timeStr !== "string") {
    return null;
  }

  // Validate format matches HH:mm
  if (!validateTimeFormat(timeStr)) {
    return null;
  }

  const parts = timeStr.split(":");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }

  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);

  // Validate hour and minute ranges
  if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return hour * 60 + minute;
};

/**
 * Get current time in a specific timezone
 *
 * @param timezone - IANA timezone string (e.g., "America/Argentina/Buenos_Aires")
 * @returns Object with hour, minute, and totalMinutes, or null if timezone is invalid
 */
export const getCurrentTimeInTimezone = (
  timezone: string,
): { hour: number; minute: number; totalMinutes: number } | null => {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
    const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
    const totalMinutes = hour * 60 + minute;

    return { hour, minute, totalMinutes };
  } catch (error) {
    return null;
  }
};

/**
 * Check if a time (in minutes) is within a range, handling midnight crossover
 *
 * @param currentMinutes - Current time in minutes since midnight (0-1439)
 * @param startMinutes - Range start in minutes since midnight (0-1439)
 * @param endMinutes - Range end in minutes since midnight (0-1439)
 * @returns true if current time is within the range, false otherwise
 *
 * @example
 * // Normal range: 09:00 to 17:00
 * isTimeInRange(600, 540, 1020) // 10:00 is within 09:00-17:00 -> true
 *
 * // Midnight crossover: 22:00 to 07:00
 * isTimeInRange(300, 1320, 420) // 05:00 is within 22:00-07:00 -> true
 */
export const isTimeInRange = (
  currentMinutes: number,
  startMinutes: number,
  endMinutes: number,
): boolean => {
  // Handle midnight crossover (e.g., 22:00 to 07:00)
  if (startMinutes <= endMinutes) {
    // Normal case: start < end (e.g., 09:00 to 17:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Midnight crossover: start > end (e.g., 22:00 to 07:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
};

/**
 * Format a date in a specific timezone with locale
 *
 * @param date - Date to format
 * @param timezone - IANA timezone string (e.g., "America/Argentina/Buenos_Aires")
 * @param locale - Locale string (e.g., "es-ES", "en-US")
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string, or null if timezone is invalid
 */
export const formatDateInTimezone = (
  date: Date,
  timezone: string | undefined,
  locale: string = "en-US",
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  },
): string | null => {
  if (!timezone) {
    return null;
  }
  try {
    const formatter = new Intl.DateTimeFormat(locale, {
      ...options,
      timeZone: timezone,
    });
    return formatter.format(date);
  } catch (error) {
    return null;
  }
};
