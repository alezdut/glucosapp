/**
 * Date utility functions for handling timezone-safe date operations
 */

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
 * Time utility functions for handling meal time picker conversions
 * These functions handle timezone compensation for React Native DateTimePicker
 */

/**
 * Convert minutes since midnight (0-1439) to Date object for time picker
 * Uses a fixed date base (2000-01-01) to ensure picker works correctly
 * Adds 1 hour so that when timeToMinutes subtracts 1, the picker displays correctly
 *
 * @param minutes - Minutes since midnight (0-1439)
 * @returns Date object with the time set for the picker
 */
export const minutesToTime = (minutes: number): Date => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const date = new Date(2000, 0, 1, hours + 1, mins, 0, 0);
  return date;
};

/**
 * Convert Date object to minutes since midnight (0-1439)
 * Subtracts 1 hour to compensate for picker's timezone offset
 * This ensures correct reading when minutesToTime added 1 hour
 *
 * @param date - Date object to convert
 * @returns Minutes since midnight (0-1439)
 */
export const timeToMinutes = (date: Date): number => {
  let hours = date.getHours();
  let minutes = date.getMinutes();

  // Subtract 1 hour to compensate for picker's timezone offset
  hours = hours - 1;
  if (hours < 0) {
    hours = 23;
  }

  return hours * 60 + minutes;
};

/**
 * Calculate age from birth date
 * @param birthDate - Birth date as Date object, ISO string, or undefined
 * @returns Age in years, or null if birthDate is not provided
 */
export const calculateAge = (birthDate: Date | string | undefined): number | null => {
  if (!birthDate) return null;

  const birthDateObj = birthDate instanceof Date ? birthDate : new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birthDateObj.getFullYear();
  const monthDiff = today.getMonth() - birthDateObj.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
    age--;
  }
  return age;
};

/**
 * Format minutes as HH:MM string for display
 *
 * @param minutes - Minutes since midnight (0-1439)
 * @returns Formatted time string (HH:MM)
 */
export const formatTimeFromMinutes = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
};

/**
 * Extract time from picker date - ensures we get exactly what user selected
 * The picker returns the time directly (what user sees), so we use it as-is
 *
 * @param date - Date object returned by the picker
 * @returns Date object with the selected time on a fixed base date
 */
export const extractTimeFromPicker = (date: Date): Date => {
  // Get the local time that the user saw/selected in the picker
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const result = new Date(2000, 0, 1, hours, minutes, 0, 0);
  return result;
};
