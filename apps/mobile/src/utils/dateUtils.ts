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
