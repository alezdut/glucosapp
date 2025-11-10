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
  const minutes = date.getMinutes();

  // Subtract 1 hour to compensate for picker's timezone offset
  hours = hours - 1;
  if (hours < 0) {
    hours = 23;
  }

  return hours * 60 + minutes;
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
