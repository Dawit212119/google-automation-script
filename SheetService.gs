/**
 * Sheet Service
 * Handles all Google Sheets operations
 */

/**
 * Gets the sheet object
 * @return {GoogleAppsScript.Spreadsheet.Sheet|null} Sheet object or null
 */
function getSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    throw new Error(`Sheet "${CONFIG.SHEET_NAME}" not found`);
  }
  return sheet;
}

/**
 * Updates a cell in the sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet object
 * @param {number} row - Row number
 * @param {number} col - Column number (0-indexed)
 * @param {*} value - Value to set
 */
function updateCell(sheet, row, col, value) {
  sheet.getRange(row, col + 1).setValue(value);
}

/**
 * Updates sheet status and log
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The spreadsheet sheet
 * @param {number} row - Row number
 * @param {string} status - Status value
 * @param {string} logMessage - Log message
 */
function updateSheetStatus(sheet, row, status, logMessage) {
  updateCell(sheet, row, COLUMNS.STATUS, status);
  updateCell(sheet, row, COLUMNS.LOG, logMessage);
}

/**
 * Detects if a row contains headers (not actual data)
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The spreadsheet sheet
 * @param {number} row - Row number to check
 * @return {boolean} True if the row appears to be headers
 */
function isHeaderRow(sheet, row) {
  try {
    const range = sheet.getRange(row, 1, 1, COLUMNS.LOG + 1);
    const values = range.getValues()[0];
    
    const nameValue = safeString(values[COLUMNS.NAME]);
    const emailValue = safeString(values[COLUMNS.EMAIL]);
    const timestampValue = safeString(values[COLUMNS.TIMESTAMP]);
    
    // If email contains @, it's definitely NOT a header
    if (emailValue.includes('@')) return false;
    
    // If name looks like a real name, it's probably data
    if (nameValue.length > 10 || nameValue.includes(' ')) return false;
    
    // Check header patterns
    const headerPatterns = {
      name: ['name', 'full name', 'participant name', 'user name', 'your name'],
      email: ['email', 'e-mail', 'email address', 'e-mail address', 'your email'],
      timestamp: ['timestamp', 'date', 'submitted', 'time', 'submission time']
    };
    
    const nameIsHeader = headerPatterns.name.some(p => 
      nameValue.toLowerCase() === p.toLowerCase()
    );
    const emailIsHeader = headerPatterns.email.some(p => 
      emailValue.toLowerCase() === p.toLowerCase()
    );
    const timestampIsHeader = headerPatterns.timestamp.some(p => 
      timestampValue.toLowerCase() === p.toLowerCase()
    );
    
    return nameIsHeader && emailIsHeader && timestampIsHeader;
  } catch (e) {
    Logger.log('Error checking if row is header: ' + e.toString());
    return false;
  }
}

/**
 * Gets the first data row (skips headers if they exist)
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The spreadsheet sheet
 * @return {number} Row number where data starts (1 or 2)
 */
function getFirstDataRow(sheet) {
  return isHeaderRow(sheet, 1) ? 2 : 1;
}

/**
 * Reads form data from the sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The spreadsheet sheet
 * @param {number} row - Row number to read
 * @return {Object} Form data object
 */
function readFormData(sheet, row) {
  const range = sheet.getRange(row, 1, 1, COLUMNS.LOG + 1);
  const values = range.getValues()[0];
  
  return {
    timestamp: values[COLUMNS.TIMESTAMP],
    name: safeString(values[COLUMNS.NAME]),
    email: safeString(values[COLUMNS.EMAIL]),
    profileLink: safeString(values[COLUMNS.PROFILE_LINK]),
    phone: safeString(values[COLUMNS.PHONE]),
    notes: safeString(values[COLUMNS.NOTES]),
    preferredTimeWindow: safeString(values[COLUMNS.PREFERRED_TIME_WINDOW]),
    preferredDates: safeString(values[COLUMNS.PREFERRED_DATES]),
    status: safeString(values[COLUMNS.STATUS]) || STATUS.PENDING,
    meetingTime: safeString(values[COLUMNS.MEETING_TIME]),
    assignedSlotISO: safeString(values[COLUMNS.ASSIGNED_SLOT_ISO]),
    timezone: safeString(values[COLUMNS.TIMEZONE]),
    calendarEventId: safeString(values[COLUMNS.CALENDAR_EVENT_ID]),
    log: safeString(values[COLUMNS.LOG]),
  };
}

/**
 * Checks if row is already processed
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The spreadsheet sheet
 * @param {number} row - Row number
 * @return {boolean} True if already processed
 */
function isAlreadyProcessed(sheet, row) {
  const status = sheet.getRange(row, COLUMNS.STATUS + 1).getValue();
  return status === STATUS.CONFIRMED || status === STATUS.REJECTED;
}

/**
 * Updates sheet with meeting details
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The spreadsheet sheet
 * @param {number} targetRow - Target row number
 * @param {Object} formData - Form submission data
 * @param {Object} meetingSlot - Meeting slot
 * @param {GoogleAppsScript.Calendar.CalendarEvent} event - Calendar event
 * @param {string} userTimezone - User's timezone
 */
function updateSheetWithMeetingDetails(sheet, targetRow, formData, meetingSlot, event, userTimezone) {
  const meetingTimeFormatted = formatDateTime(meetingSlot.startTime, userTimezone);
  const assignedSlotISO = meetingSlot.startTime.toISOString();
  
  updateCell(sheet, targetRow, COLUMNS.STATUS, STATUS.CONFIRMED);
  updateCell(sheet, targetRow, COLUMNS.MEETING_TIME, meetingTimeFormatted);
  updateCell(sheet, targetRow, COLUMNS.ASSIGNED_SLOT_ISO, assignedSlotISO);
  updateCell(sheet, targetRow, COLUMNS.TIMEZONE, userTimezone);
  updateCell(sheet, targetRow, COLUMNS.CALENDAR_EVENT_ID, event.getId());
  updateCell(sheet, targetRow, COLUMNS.LOG, `Event created successfully. Event ID: ${event.getId()}`);
  
  Logger.log('Meeting scheduled for: ' + meetingTimeFormatted);
}

