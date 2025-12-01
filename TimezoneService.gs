/**
 * Timezone Service
 * Handles timezone detection, conversion, and DST calculations
 */

/**
 * Detects timezone from email domain or user data
 * @param {string} email - User email
 * @return {string} Timezone string in IANA format
 */
function detectTimezone(email) {
  // Default to script timezone
  // Can be enhanced with timezone detection service or form field
  return Session.getScriptTimeZone();
}

/**
 * Converts a time in one timezone to another
 * @param {Date} date - Date object
 * @param {string} fromTimezone - Source timezone (IANA format)
 * @param {string} toTimezone - Target timezone (IANA format)
 * @return {Date} Converted date
 */
function convertTimezone(date, fromTimezone, toTimezone) {
  const fromOffset = Utilities.formatDate(date, fromTimezone, 'Z');
  const toOffset = Utilities.formatDate(date, toTimezone, 'Z');
  
  const fromHours = parseInt(fromOffset.substring(1, 3)) + parseInt(fromOffset.substring(3, 5)) / 60;
  const toHours = parseInt(toOffset.substring(1, 3)) + parseInt(toOffset.substring(3, 5)) / 60;
  const offsetDiff = (fromOffset[0] === '-' ? -1 : 1) * fromHours - (toOffset[0] === '-' ? -1 : 1) * toHours;
  
  const result = new Date(date);
  result.setHours(result.getHours() - offsetDiff);
  return result;
}

/**
 * Checks if a date is in daylight saving time
 * @param {Date} date - Date to check
 * @param {string} timezone - Timezone string
 * @return {boolean} True if DST is active
 */
function isDST(date, timezone) {
  const jan = new Date(date.getFullYear(), 0, 1);
  const jul = new Date(date.getFullYear(), 6, 1);
  
  const janOffset = Utilities.formatDate(jan, timezone, 'Z');
  const julOffset = Utilities.formatDate(jul, timezone, 'Z');
  const currentOffset = Utilities.formatDate(date, timezone, 'Z');
  
  return currentOffset === julOffset;
}

