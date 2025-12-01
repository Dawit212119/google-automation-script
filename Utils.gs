/**
 * Utility Functions
 */

/**
 * Safely converts value to string
 * @param {*} value - Value to convert
 * @return {string} String value or empty string
 */
function safeString(value) {
  return (value || '').toString().trim();
}

/**
 * Replaces template placeholders with values
 * @param {string} template - Template string with {placeholder} syntax
 * @param {Object} values - Object with placeholder values
 * @return {string} Replaced string
 */
function replaceTemplate(template, values) {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.replace(new RegExp('\\{' + key + '\\}', 'g'), value || '');
  }
  return result;
}

/**
 * Logs a section header
 * @param {string} title - Section title
 * @param {string} subtitle - Optional subtitle
 */
function logSection(title, subtitle) {
  Logger.log('');
  Logger.log('=== ' + title + ' ===');
  if (subtitle) Logger.log(subtitle);
  Logger.log('Timestamp: ' + new Date().toLocaleString());
  Logger.log('');
}

/**
 * Formats a date for display
 * @param {Date} date - Date object
 * @param {string} timezone - Timezone string
 * @return {string} Formatted date string
 */
function formatDate(date, timezone) {
  return Utilities.formatDate(date, timezone, 'EEEE, MMMM d, yyyy');
}

/**
 * Formats a time for display
 * @param {Date} date - Date object
 * @param {string} timezone - Timezone string
 * @return {string} Formatted time string
 */
function formatTime(date, timezone) {
  return Utilities.formatDate(date, timezone, 'h:mm a');
}

/**
 * Formats date and time together
 * @param {Date} date - Date object
 * @param {string} timezone - Timezone string
 * @return {string} Formatted datetime string
 */
function formatDateTime(date, timezone) {
  return formatDate(date, timezone) + ' at ' + formatTime(date, timezone);
}

