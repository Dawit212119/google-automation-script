/**
 * Google Apps Script - Automated Scheduling System
 * 
 * This script automates meeting scheduling from Google Form submissions.
 * It handles time zones, DST, calendar availability, event creation, and email confirmations.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a Google Form with the required fields (see documentation)
 * 2. Create a Google Sheet linked to the form
 * 3. Add the required columns to the sheet (see documentation)
 * 4. Copy this entire script to Google Apps Script editor
 * 5. Update the CONFIGURATION section below with your details
 * 6. Set up the onFormSubmit trigger (see setup instructions at bottom)
 */

// ============================================================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================================================

const CONFIG = {
  // Your email address (the scheduler)
  SCHEDULER_EMAIL: 'your-email@gmail.com',
  
  // Calendar ID - usually your email, or use 'primary' for default calendar
  CALENDAR_ID: 'primary',
  
  // Meeting duration in minutes
  MEETING_DURATION_MINUTES: 30,
  
  // Available time slots (24-hour format, in your timezone)
  // Format: { start: '09:00', end: '17:00' } - means 9 AM to 5 PM
  WORKING_HOURS: {
    start: '09:00',
    end: '17:00'
  },
  
  // Days of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  WORKING_DAYS: [1, 2, 3, 4, 5], // Monday to Friday
  
  // Buffer time between meetings (minutes)
  BUFFER_TIME_MINUTES: 15,
  
  // How many days ahead to look for available slots
  DAYS_AHEAD_TO_SEARCH: 14,
  
  // Event title template (use {name} for participant name)
  EVENT_TITLE: 'Meeting with {name}',
  
  // Event description template
  EVENT_DESCRIPTION: 'Meeting scheduled via form submission.\n\nParticipant Details:\nName: {name}\nEmail: {email}\nPhone: {phone}\nProfile: {profile}\nNotes: {notes}',
  
  // Email subject template
  EMAIL_SUBJECT: 'Meeting Confirmation - {date}',
  
  // Email body template
  EMAIL_BODY: `Hello {name},

Your meeting has been scheduled for:
Date: {date}
Time: {time} ({timezone})

Meeting Link: {meetingLink}

We look forward to speaking with you!

Best regards,
Automated Scheduling System`,
  
  // Reminder minutes before meeting
  REMINDER_MINUTES: [10, 30],
  
  // Sheet name (tab name in your spreadsheet)
  SHEET_NAME: 'Form Responses 1', // Default name, change if different
};

// ============================================================================
// COLUMN MAPPING - Update if your sheet columns are different
// 
// ⚠️ CRITICAL: ORDER MATTERS!
// The script reads data by COLUMN POSITION (index), NOT by header names.
// 
// Form fields MUST be in this exact order:
//   1. Name
//   2. Email
//   3. Profile Link
//   4. Phone Number
//   5. Additional Notes
//   6. Preferred Time Window
//   7. Preferred Dates
//
// Spreadsheet columns MUST be in this exact order (A-N):
//   A: Timestamp (auto-filled by Forms)
//   B: Name (auto-filled by Forms)
//   C: Email (auto-filled by Forms)
//   D: Profile Link (auto-filled by Forms)
//   E: Phone (auto-filled by Forms)
//   F: Notes (auto-filled by Forms)
//   G: Preferred Time Window (auto-filled by Forms)
//   H: Preferred Dates (auto-filled by Forms)
//   I: Status (filled by script)
//   J: Meeting Time (filled by script)
//   K: Assigned Slot (ISO) (filled by script)
//   L: Timezone (filled by script)
//   M: Calendar Event ID (filled by script)
//   N: Log (filled by script)
//
// NOTE: Data starts from ROW 1 (not row 2)
// If your sheet has headers, they should be in a separate row or handled separately
//
// If you change the order, you MUST update these indices accordingly!
// ============================================================================

const COLUMNS = {
  TIMESTAMP: 0,              // Column A (0-indexed)
  NAME: 1,                   // Column B
  EMAIL: 2,                  // Column C
  PROFILE_LINK: 3,           // Column D
  PHONE: 4,                  // Column E
  NOTES: 5,                  // Column F
  PREFERRED_TIME_WINDOW: 6,  // Column G
  PREFERRED_DATES: 7,        // Column H
  STATUS: 8,                 // Column I
  MEETING_TIME: 9,           // Column J
  ASSIGNED_SLOT_ISO: 10,     // Column K
  TIMEZONE: 11,              // Column L
  CALENDAR_EVENT_ID: 12,     // Column M
  LOG: 13,                   // Column N
};

// ============================================================================
// MAIN TRIGGER FUNCTION
// ============================================================================

/**
 * Triggered automatically when a form is submitted
 * @param {GoogleAppsScript.Events.FormsOnFormSubmit} e - Form submit event
 */
function onFormSubmit(e) {
  try {
    Logger.log('=== FORM SUBMISSION TRIGGERED ===');
    Logger.log('Timestamp: ' + new Date().toLocaleString());
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
    if (!sheet) {
      throw new Error(`Sheet "${CONFIG.SHEET_NAME}" not found`);
    }
    
    // Get form response data directly from the event (more reliable than reading sheet)
    let formData;
    let targetRow; // The row number we'll update in the sheet
    
    // Check if we have event data (form submission trigger)
    if (e) {
      // Try to get row from event range (most reliable)
      if (e.range) {
        targetRow = e.range.getRow();
        Logger.log('✓ Form submitted to row: ' + targetRow + ' (FROM EVENT RANGE)');
        Logger.log('✓ This is the NEWEST/MOST RECENT row - data was just added here');
      } 
      // Try to get row from event values (alternative method)
      else if (e.values && Array.isArray(e.values)) {
        // For form submit events, sometimes the row info is in the response
        // We'll need to find it by checking the sheet
        Logger.log('⚠️ Event range not available, but event values exist');
        Logger.log('Will search for the newest row with data...');
      }
    }
    
    // If we got targetRow from event, use it
    if (targetRow) {
      
      // Check if this is a header row and skip it
      if (isHeaderRow(sheet, targetRow)) {
        Logger.log('Row ' + targetRow + ' appears to be headers - Skipping');
        return;
      }
      
      // First, check the current status from the sheet to see if already processed
      const currentStatus = sheet.getRange(targetRow, COLUMNS.STATUS + 1).getValue();
      if (currentStatus === 'Confirmed' || currentStatus === 'Rejected') {
        Logger.log('Row ' + targetRow + ' already processed (Status: ' + currentStatus + ') - Skipping');
        return;
      }
      
      // Validate the target row has data before proceeding
      const rowData = readFormData(sheet, targetRow);
      const rowHasData = rowData.name && rowData.name.trim() && 
                        rowData.email && rowData.email.trim() && 
                        rowData.email.includes('@');
      
      if (!rowHasData) {
        Logger.log('⚠️ Row ' + targetRow + ' from event appears to be empty');
        Logger.log('  Name: "' + (rowData.name || '') + '"');
        Logger.log('  Email: "' + (rowData.email || '') + '"');
        Logger.log('Searching for the actual last row with data...');
        targetRow = null; // Will trigger fallback search
      } else {
        Logger.log('✓ Row ' + targetRow + ' has valid data');
      }
    }
    
    // If we have a valid targetRow from event, process it
    if (targetRow) {
      // Read data from the event values if available and valid, otherwise read from sheet
      if (e && e.values && e.values.length > 0) {
        // Validate that e.values has actual data (not just empty strings)
        const nameFromEvent = (e.values[COLUMNS.NAME] || '').toString().trim();
        const emailFromEvent = (e.values[COLUMNS.EMAIL] || '').toString().trim();
        
        // Only use event values if they contain actual data
        if (nameFromEvent && emailFromEvent && emailFromEvent.includes('@')) {
          // Use event data directly (most reliable)
          formData = {
            timestamp: e.values[COLUMNS.TIMESTAMP] || new Date(),
            name: nameFromEvent,
            email: emailFromEvent,
            profileLink: (e.values[COLUMNS.PROFILE_LINK] || '').toString().trim(),
            phone: (e.values[COLUMNS.PHONE] || '').toString().trim(),
            notes: (e.values[COLUMNS.NOTES] || '').toString().trim(),
            preferredTimeWindow: (e.values[COLUMNS.PREFERRED_TIME_WINDOW] || '').toString().trim(),
            preferredDates: (e.values[COLUMNS.PREFERRED_DATES] || '').toString().trim(),
            status: 'Pending',
            meetingTime: '',
            assignedSlotISO: '',
            timezone: '',
            calendarEventId: '',
            log: '',
          };
          Logger.log('Using event values (name: ' + nameFromEvent + ', email: ' + emailFromEvent + ')');
        } else {
          // Event values are empty or invalid, read from sheet instead
          Logger.log('Event values empty or invalid, reading from sheet row ' + targetRow);
          formData = readFormData(sheet, targetRow);
        }
      } else {
        // Event has range but no values, read from sheet
        Logger.log('No event values, reading from sheet row ' + targetRow);
        formData = readFormData(sheet, targetRow);
      }
    } else {
      // Fallback: If event doesn't have range, find the last row with actual data
      // This should rarely happen, but it's a safety fallback
      const lastRow = sheet.getLastRow();
      Logger.log('⚠️ Event range not available, searching for last row with data...');
      Logger.log('Sheet last row (may include empty rows): ' + lastRow);
      
      // Check if we have any rows
      if (lastRow < 1) {
        Logger.log('ERROR: No rows found. Sheet is empty.');
        Logger.log('Please submit at least one form response first.');
        return;
      }
      
      // Get the first data row (skips headers if they exist)
      const firstDataRow = getFirstDataRow(sheet);
      Logger.log('First data row (after headers): ' + firstDataRow);
      
      // Find the last row that has actual data (not empty, not headers)
      targetRow = null;
      for (let r = lastRow; r >= firstDataRow; r--) {
        // Skip header rows
        if (isHeaderRow(sheet, r)) {
          Logger.log('Row ' + r + ': Header row - Skipping');
          continue;
        }
        
        // Read the row to check if it has data
        const testData = readFormData(sheet, r);
        
        // Debug: Log what we're reading
        Logger.log('Checking row ' + r + ':');
        Logger.log('  Raw name: "' + (testData.name || '') + '"');
        Logger.log('  Raw email: "' + (testData.email || '') + '"');
        
        const hasName = testData.name && testData.name.toString().trim() !== '';
        const hasEmail = testData.email && testData.email.toString().trim() !== '' && testData.email.toString().includes('@');
        
        // If this row has actual data, use it
        if (hasName && hasEmail) {
          targetRow = r;
          Logger.log('✓ Found last row with data: ' + targetRow);
          Logger.log('  Name: ' + testData.name);
          Logger.log('  Email: ' + testData.email);
          break;
        } else {
          Logger.log('Row ' + r + ': Empty or invalid data - Skipping');
          Logger.log('  Name valid: ' + hasName);
          Logger.log('  Email valid: ' + hasEmail);
        }
      }
      
      // If no data row found, error out
      if (!targetRow || targetRow < firstDataRow) {
        Logger.log('ERROR: No data rows found with valid name and email.');
        Logger.log('Please submit at least one form response with name and email.');
        return;
      }
      
      // Read the actual data from the target row
      formData = readFormData(sheet, targetRow);
      Logger.log('✓ Using row ' + targetRow + ' as target (LAST ROW WITH DATA)');
    }
    
    Logger.log('');
    Logger.log('=== READING DATA FROM ROW ' + targetRow + ' ===');
    Logger.log('This is the NEWEST/MOST RECENT form submission');
    Logger.log('Form data: ' + JSON.stringify(formData));
    Logger.log('');
    
    // Validate we have a valid target row
    if (!targetRow || targetRow < 1) {
      Logger.log('ERROR: Invalid target row: ' + targetRow);
      Logger.log('Row must be 1 or higher');
      return;
    }
    
    // Validate required fields - check if row has actual data
    const nameValue = (formData.name || '').toString().trim();
    const emailValue = (formData.email || '').toString().trim();
    
    if (!nameValue || !emailValue || !emailValue.includes('@')) {
      Logger.log('ERROR: Row ' + targetRow + ' is empty or missing required fields');
      Logger.log('  Name: "' + nameValue + '"');
      Logger.log('  Email: "' + emailValue + '"');
      Logger.log('');
      Logger.log('This row appears to be empty. Looking for the actual last data row...');
      
      // Try to find the actual last row with data
      const firstDataRow = getFirstDataRow(sheet);
      let foundRow = null;
      for (let r = targetRow - 1; r >= firstDataRow; r--) {
        if (isHeaderRow(sheet, r)) continue;
        const testData = readFormData(sheet, r);
        const testName = (testData.name || '').toString().trim();
        const testEmail = (testData.email || '').toString().trim();
        if (testName && testEmail && testEmail.includes('@')) {
          foundRow = r;
          Logger.log('✓ Found data in row ' + foundRow + ', using that instead');
          targetRow = foundRow;
          formData = testData;
          break;
        }
      }
      
      if (!foundRow) {
        updateCell(sheet, targetRow, COLUMNS.STATUS, 'Error');
        updateCell(sheet, targetRow, COLUMNS.LOG, 'Missing required fields: Name and Email are required');
        Logger.log('ERROR: No valid data rows found. Please check your form submissions.');
        return;
      }
    }
    
    // Additional validation: Check if we're reading headers instead of data
    if (isHeaderRow(sheet, targetRow)) {
      Logger.log('ERROR: Target row ' + targetRow + ' appears to be headers - Skipping');
      Logger.log('This should not happen if header detection is working correctly.');
      return;
    }
    
    // Check if already processed
    if (formData.status === 'Confirmed' || formData.status === 'Rejected') {
      Logger.log('Submission already processed, skipping');
      return;
    }
    
    // Update status to processing
    updateCell(sheet, targetRow, COLUMNS.STATUS, 'Processing');
    updateCell(sheet, targetRow, COLUMNS.LOG, `Processing started at ${new Date().toLocaleString()}`);
    
    // Detect timezone from user's location or use default
    const userTimezone = detectTimezone(formData.email) || Session.getScriptTimeZone();
    
    // Find available meeting slot considering user preferences
    const meetingSlot = findAvailableSlot(userTimezone, formData.preferredTimeWindow, formData.preferredDates);
    
    if (!meetingSlot) {
      // No slot available
      updateCell(sheet, targetRow, COLUMNS.STATUS, 'Rejected');
      updateCell(sheet, targetRow, COLUMNS.LOG, `No available slots found. Searched ${CONFIG.DAYS_AHEAD_TO_SEARCH} days ahead.`);
      sendRejectionEmail(formData);
      return;
    }
    
    // Create calendar event
    const event = createCalendarEvent(formData, meetingSlot);
    
    if (!event) {
      updateCell(sheet, targetRow, COLUMNS.STATUS, 'Error');
      updateCell(sheet, targetRow, COLUMNS.LOG, 'Failed to create calendar event');
      return;
    }
    
    // Update sheet with meeting details
    const meetingTimeFormatted = formatDateTime(meetingSlot.startTime, userTimezone);
    const assignedSlotISO = meetingSlot.startTime.toISOString();
    updateCell(sheet, targetRow, COLUMNS.STATUS, 'Confirmed');
    updateCell(sheet, targetRow, COLUMNS.MEETING_TIME, meetingTimeFormatted);
    updateCell(sheet, targetRow, COLUMNS.ASSIGNED_SLOT_ISO, assignedSlotISO);
    updateCell(sheet, targetRow, COLUMNS.TIMEZONE, userTimezone);
    updateCell(sheet, targetRow, COLUMNS.CALENDAR_EVENT_ID, event.getId());
    updateCell(sheet, targetRow, COLUMNS.LOG, `Event created successfully. Event ID: ${event.getId()}`);
    
    // Send confirmation email
    sendConfirmationEmail(formData, meetingSlot, event);
    
    Logger.log('');
    Logger.log('=== PROCESSING COMPLETED SUCCESSFULLY ===');
    Logger.log('Row ' + targetRow + ' has been processed');
    Logger.log('Status: Confirmed');
    Logger.log('Meeting scheduled for: ' + meetingTimeFormatted);
    Logger.log('==========================================');
    
  } catch (error) {
    Logger.log('Error in onFormSubmit: ' + error.toString());
    Logger.log('Stack trace: ' + error.stack);
    
    // Try to log error to sheet
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
      if (sheet) {
        // Try to find the row - use event range if available, otherwise use last row
        let errorRow;
        if (e && e.range) {
          errorRow = e.range.getRow();
        } else {
          errorRow = sheet.getLastRow();
        }
        
        // Only update if we have a valid row (row 1 or higher)
        if (errorRow >= 1) {
          updateCell(sheet, errorRow, COLUMNS.STATUS, 'Error');
          updateCell(sheet, errorRow, COLUMNS.LOG, `Error: ${error.toString()}`);
        }
      }
    } catch (e) {
      // If we can't even log to sheet, send email to admin
      MailApp.sendEmail(CONFIG.SCHEDULER_EMAIL, 'Scheduling System Error', error.toString());
    }
  }
}

// ============================================================================
// DATA READING FUNCTIONS
// ============================================================================

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
    
    // Check if row contains common header indicators
    const nameValue = (values[COLUMNS.NAME] || '').toString().trim();
    const emailValue = (values[COLUMNS.EMAIL] || '').toString().trim();
    const timestampValue = (values[COLUMNS.TIMESTAMP] || '').toString().trim();
    
    // If email contains @, it's definitely NOT a header (headers don't have email addresses)
    if (emailValue.includes('@')) {
      return false;
    }
    
    // If name looks like a real name (has spaces, multiple words, or is longer than 10 chars), it's probably data
    if (nameValue.length > 10 || nameValue.includes(' ')) {
      return false;
    }
    
    // Common header patterns (exact matches only, case-insensitive)
    const headerPatterns = {
      name: ['name', 'full name', 'participant name', 'user name', 'your name'],
      email: ['email', 'e-mail', 'email address', 'e-mail address', 'your email'],
      timestamp: ['timestamp', 'date', 'submitted', 'time', 'submission time']
    };
    
    // Check if values match header patterns (exact or contains)
    const nameIsHeader = headerPatterns.name.some(pattern => 
      nameValue.toLowerCase() === pattern.toLowerCase()
    );
    const emailIsHeader = headerPatterns.email.some(pattern => 
      emailValue.toLowerCase() === pattern.toLowerCase()
    );
    const timestampIsHeader = headerPatterns.timestamp.some(pattern => 
      timestampValue.toLowerCase() === pattern.toLowerCase()
    );
    
    // If ALL three columns match header patterns exactly, it's likely a header row
    // This is more strict - requires all three to match, not just 2
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
  // Check if row 1 is headers
  if (isHeaderRow(sheet, 1)) {
    Logger.log('Detected headers in row 1, data starts from row 2');
    return 2;
  } else {
    Logger.log('No headers detected, data starts from row 1');
    return 1;
  }
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
    name: values[COLUMNS.NAME] || '',
    email: values[COLUMNS.EMAIL] || '',
    profileLink: values[COLUMNS.PROFILE_LINK] || '',
    phone: values[COLUMNS.PHONE] || '',
    notes: values[COLUMNS.NOTES] || '',
    preferredTimeWindow: values[COLUMNS.PREFERRED_TIME_WINDOW] || '',
    preferredDates: values[COLUMNS.PREFERRED_DATES] || '',
    status: values[COLUMNS.STATUS] || 'Pending',
    meetingTime: values[COLUMNS.MEETING_TIME] || '',
    assignedSlotISO: values[COLUMNS.ASSIGNED_SLOT_ISO] || '',
    timezone: values[COLUMNS.TIMEZONE] || '',
    calendarEventId: values[COLUMNS.CALENDAR_EVENT_ID] || '',
    log: values[COLUMNS.LOG] || '',
  };
}

// ============================================================================
// TIMEZONE FUNCTIONS
// ============================================================================

/**
 * Detects timezone from email domain or user data
 * For simplicity, returns script timezone. Can be enhanced with timezone detection API
 * 
 * TIMEZONE FORMAT: IANA timezone identifier (Olson/TZ database format)
 * Examples:
 *   - "America/New_York" (Eastern Time)
 *   - "America/Los_Angeles" (Pacific Time)
 *   - "America/Chicago" (Central Time)
 *   - "Europe/London" (UK Time)
 *   - "Europe/Paris" (Central European Time)
 *   - "Asia/Tokyo" (Japan Time)
 *   - "Australia/Sydney" (Australian Eastern Time)
 *   - "UTC" (Coordinated Universal Time)
 * 
 * Full list: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
 * 
 * @param {string} email - User email
 * @return {string} Timezone string in IANA format (e.g., "America/New_York")
 */
function detectTimezone(email) {
  // Default to script timezone
  // You can enhance this by:
  // 1. Storing timezone preferences in a separate sheet
  // 2. Using a timezone detection service
  // 3. Adding timezone as a form field
  // 
  // Session.getScriptTimeZone() returns a string like "America/New_York"
  return Session.getScriptTimeZone();
}

/**
 * Converts a time in one timezone to another
 * @param {Date} date - Date object
 * @param {string} fromTimezone - Source timezone (IANA format, e.g., "America/New_York")
 * @param {string} toTimezone - Target timezone (IANA format, e.g., "Europe/London")
 * @return {Date} Converted date
 */
function convertTimezone(date, fromTimezone, toTimezone) {
  const fromOffset = Utilities.formatDate(date, fromTimezone, 'Z');
  const toOffset = Utilities.formatDate(date, toTimezone, 'Z');
  
  // Calculate offset difference in hours
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
  
  // If current offset matches summer offset, DST is active
  return currentOffset === julOffset;
}

// ============================================================================
// PREFERENCE PARSING FUNCTIONS
// ============================================================================

/**
 * Parses preferred dates from a string, Date object, or array
 * Supports formats: "2024-01-15", "01/15/2024", "2024-01-15, 2024-01-16"
 * Also handles Date objects and arrays of dates
 * @param {string|Date|Array|Object} preferredDatesInput - Date input (string, Date, array, or other)
 * @return {Array<Date>} Array of Date objects
 */
function parsePreferredDates(preferredDatesInput) {
  // Handle null, undefined, or empty values
  if (!preferredDatesInput) {
    return [];
  }
  
  // If it's already a Date object, return it as an array
  if (preferredDatesInput instanceof Date) {
    if (!isNaN(preferredDatesInput.getTime())) {
      return [preferredDatesInput];
    }
    return [];
  }
  
  // If it's an array, process each element
  if (Array.isArray(preferredDatesInput)) {
    const dates = [];
    for (const item of preferredDatesInput) {
      if (item instanceof Date && !isNaN(item.getTime())) {
        dates.push(item);
      } else if (typeof item === 'string' && item.trim()) {
        const parsed = parseDateString(item.trim());
        if (parsed) dates.push(parsed);
      }
    }
    return dates;
  }
  
  // Convert to string if it's not already
  let preferredDatesStr;
  if (typeof preferredDatesInput === 'string') {
    preferredDatesStr = preferredDatesInput;
  } else {
    // Try to convert to string (handles Date objects, numbers, etc.)
    preferredDatesStr = String(preferredDatesInput);
  }
  
  // Trim and check if empty
  preferredDatesStr = preferredDatesStr.trim();
  if (preferredDatesStr === '' || preferredDatesStr === 'undefined' || preferredDatesStr === 'null') {
    return [];
  }
  
  const dates = [];
  const dateStrings = preferredDatesStr.split(',').map(s => s.trim()).filter(s => s !== '');
  
  for (const dateStr of dateStrings) {
    try {
      const parsed = parseDateString(dateStr);
      if (parsed) {
        dates.push(parsed);
      }
    } catch (e) {
      Logger.log('Error parsing date: ' + dateStr + ' - ' + e.toString());
    }
  }
  
  return dates;
}

/**
 * Helper function to parse a single date string
 * @param {string} dateStr - Date string to parse
 * @return {Date|null} Parsed Date object or null if invalid
 */
function parseDateString(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    return null;
  }
  
  dateStr = dateStr.trim();
  if (dateStr === '') {
    return null;
  }
  
  let date;
  
  // Try ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    date = new Date(dateStr + 'T00:00:00');
  }
  // Try ISO datetime format (YYYY-MM-DDTHH:mm:ss.sssZ)
  else if (/^\d{4}-\d{2}-\d{2}T/.test(dateStr)) {
    date = new Date(dateStr);
  }
  // Try MM/DD/YYYY or M/D/YYYY
  else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    const parts = dateStr.split('/');
    date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
  }
  // Try other common formats
  else {
    date = new Date(dateStr);
  }
  
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  return null;
}

/**
 * Gets time window constraints based on preference
 * @param {string} preferredTimeWindow - Time window preference (Morning, Afternoon, Evening, etc.)
 * @param {string} userTimezone - User's timezone
 * @return {Object|null} Object with start and end minutes from midnight, or null if no preference
 */
function getTimeWindowConstraints(preferredTimeWindow, userTimezone) {
  if (!preferredTimeWindow || preferredTimeWindow.trim() === '') {
    return null;
  }
  
  const window = preferredTimeWindow.toLowerCase().trim();
  
  // Define time windows (in minutes from midnight in user's timezone)
  // Morning: 9:00 AM - 12:00 PM
  // Afternoon: 12:00 PM - 5:00 PM
  // Evening: 5:00 PM - 8:00 PM
  // Anytime: null (no constraints)
  
  if (window.includes('morning')) {
    return { start: 9 * 60, end: 12 * 60 }; // 9 AM to 12 PM
  } else if (window.includes('afternoon')) {
    return { start: 12 * 60, end: 17 * 60 }; // 12 PM to 5 PM
  } else if (window.includes('evening')) {
    return { start: 17 * 60, end: 20 * 60 }; // 5 PM to 8 PM
  } else if (window.includes('anytime') || window.includes('any time')) {
    return null; // No constraints
  }
  
  // Default: no constraints if unrecognized
  return null;
}

/**
 * Generates an array of dates from now to N days ahead
 * @param {Date} startDate - Starting date
 * @param {number} daysAhead - Number of days to generate
 * @return {Array<Date>} Array of Date objects
 */
function generateDateRange(startDate, daysAhead) {
  const dates = [];
  for (let i = 0; i < daysAhead; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    date.setHours(0, 0, 0, 0);
    dates.push(date);
  }
  return dates;
}

/**
 * Checks if two dates are on the same day
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @return {boolean} True if same day
 */
function isSameDay(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

// ============================================================================
// CALENDAR AVAILABILITY FUNCTIONS
// ============================================================================

/**
 * Finds the next available meeting slot considering user preferences
 * @param {string} userTimezone - User's timezone
 * @param {string} preferredTimeWindow - User's preferred time window (e.g., "Morning", "Afternoon", "Evening")
 * @param {string} preferredDates - User's preferred dates (comma-separated dates in format YYYY-MM-DD or MM/DD/YYYY)
 * @return {Object|null} Meeting slot object with startTime and endTime, or null if none found
 */
function findAvailableSlot(userTimezone, preferredTimeWindow, preferredDates) {
  const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
  const now = new Date();
  const schedulerTimezone = Session.getScriptTimeZone();
  
  // Parse preferred dates if provided
  const preferredDatesList = parsePreferredDates(preferredDates);
  
  // Determine search dates - prioritize preferred dates if provided
  const datesToSearch = preferredDatesList.length > 0 
    ? preferredDatesList 
    : generateDateRange(now, CONFIG.DAYS_AHEAD_TO_SEARCH);
  
  // Search through dates (preferred dates first, then others)
  for (const checkDate of datesToSearch) {
    // Skip if not a working day
    if (!CONFIG.WORKING_DAYS.includes(checkDate.getDay())) {
      continue;
    }
    
    // Skip if date is in the past
    if (checkDate < now) {
      continue;
    }
    
    // Get time window constraints based on preference
    const timeWindow = getTimeWindowConstraints(preferredTimeWindow, userTimezone);
    
    // Parse working hours
    const [startHour, startMinute] = CONFIG.WORKING_HOURS.start.split(':').map(Number);
    const [endHour, endMinute] = CONFIG.WORKING_HOURS.end.split(':').map(Number);
    
    // Convert working hours to user's timezone
    const dayStart = new Date(checkDate);
    dayStart.setHours(startHour, startMinute, 0, 0);
    const dayStartUserTZ = convertTimezone(dayStart, schedulerTimezone, userTimezone);
    
    const dayEnd = new Date(checkDate);
    dayEnd.setHours(endHour, endMinute, 0, 0);
    const dayEndUserTZ = convertTimezone(dayEnd, schedulerTimezone, userTimezone);
    
    // Apply time window preference if specified
    let searchStart = dayStartUserTZ;
    let searchEnd = dayEndUserTZ;
    
    if (timeWindow) {
      // Adjust search window based on preference
      const dayStartTime = dayStartUserTZ.getHours() * 60 + dayStartUserTZ.getMinutes();
      const dayEndTime = dayEndUserTZ.getHours() * 60 + dayEndUserTZ.getMinutes();
      const dayDuration = dayEndTime - dayStartTime;
      
      if (timeWindow.start !== null) {
        searchStart = new Date(dayStartUserTZ);
        searchStart.setHours(Math.floor(timeWindow.start / 60), timeWindow.start % 60, 0, 0);
      }
      
      if (timeWindow.end !== null) {
        searchEnd = new Date(dayStartUserTZ);
        searchEnd.setHours(Math.floor(timeWindow.end / 60), timeWindow.end % 60, 0, 0);
      }
    }
    
    // Check available slots throughout the day
    const slot = findSlotInDay(calendar, searchStart, searchEnd, userTimezone);
    
    if (slot) {
      return slot;
    }
  }
  
  // If preferred dates didn't work, try general search (if we haven't already)
  if (preferredDatesList.length > 0) {
    const generalDates = generateDateRange(now, CONFIG.DAYS_AHEAD_TO_SEARCH);
    for (const checkDate of generalDates) {
      if (preferredDatesList.some(pd => isSameDay(pd, checkDate))) {
        continue; // Skip if already checked
      }
      
      if (!CONFIG.WORKING_DAYS.includes(checkDate.getDay()) || checkDate < now) {
        continue;
      }
      
      const [startHour, startMinute] = CONFIG.WORKING_HOURS.start.split(':').map(Number);
      const [endHour, endMinute] = CONFIG.WORKING_HOURS.end.split(':').map(Number);
      
      const dayStart = new Date(checkDate);
      dayStart.setHours(startHour, startMinute, 0, 0);
      const dayStartUserTZ = convertTimezone(dayStart, schedulerTimezone, userTimezone);
      
      const dayEnd = new Date(checkDate);
      dayEnd.setHours(endHour, endMinute, 0, 0);
      const dayEndUserTZ = convertTimezone(dayEnd, schedulerTimezone, userTimezone);
      
      const slot = findSlotInDay(calendar, dayStartUserTZ, dayEndUserTZ, userTimezone);
      if (slot) {
        return slot;
      }
    }
  }
  
  return null; // No available slot found
}

/**
 * Finds an available slot within a specific day
 * @param {GoogleAppsScript.Calendar.Calendar} calendar - Calendar object
 * @param {Date} dayStart - Start of day in user timezone
 * @param {Date} dayEnd - End of day in user timezone
 * @param {string} userTimezone - User's timezone
 * @return {Object|null} Available slot or null
 */
function findSlotInDay(calendar, dayStart, dayEnd, userTimezone) {
  const schedulerTimezone = Session.getScriptTimeZone();
  const durationMs = CONFIG.MEETING_DURATION_MINUTES * 60 * 1000;
  const bufferMs = CONFIG.BUFFER_TIME_MINUTES * 60 * 1000;
  
  // Get existing events for this day (convert to scheduler timezone for calendar query)
  const dayStartSchedulerTZ = convertTimezone(dayStart, userTimezone, schedulerTimezone);
  const dayEndSchedulerTZ = convertTimezone(dayEnd, userTimezone, schedulerTimezone);
  
  const existingEvents = calendar.getEvents(dayStartSchedulerTZ, dayEndSchedulerTZ);
  
  // Sort events by start time
  existingEvents.sort((a, b) => a.getStartTime().getTime() - b.getStartTime().getTime());
  
  // Try slots starting from day start
  let currentSlotStart = new Date(dayStart);
  
  while (currentSlotStart.getTime() + durationMs <= dayEnd.getTime()) {
    const currentSlotEnd = new Date(currentSlotStart.getTime() + durationMs);
    
    // Check if this slot conflicts with existing events
    const hasConflict = existingEvents.some(event => {
      const eventStart = convertTimezone(event.getStartTime(), schedulerTimezone, userTimezone);
      const eventEnd = convertTimezone(event.getEndTime(), schedulerTimezone, userTimezone);
      
      // Check for overlap (with buffer)
      const slotStartWithBuffer = new Date(currentSlotStart.getTime() - bufferMs);
      const slotEndWithBuffer = new Date(currentSlotEnd.getTime() + bufferMs);
      
      return (eventStart < slotEndWithBuffer && eventEnd > slotStartWithBuffer);
    });
    
    if (!hasConflict) {
      // Found available slot
      return {
        startTime: new Date(currentSlotStart),
        endTime: new Date(currentSlotEnd),
      };
    }
    
    // Move to next potential slot (increment by 15 minutes)
    currentSlotStart = new Date(currentSlotStart.getTime() + 15 * 60 * 1000);
  }
  
  return null; // No slot found in this day
}

// ============================================================================
// CALENDAR EVENT FUNCTIONS
// ============================================================================

/**
 * Creates a calendar event for the meeting
 * @param {Object} formData - Form submission data
 * @param {Object} meetingSlot - Meeting slot with startTime and endTime
 * @return {GoogleAppsScript.Calendar.CalendarEvent|null} Created event or null
 */
function createCalendarEvent(formData, meetingSlot) {
  try {
    const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
    
    // Convert meeting time to scheduler's timezone for calendar
    const schedulerTimezone = Session.getScriptTimeZone();
    const userTimezone = formData.timezone || Session.getScriptTimeZone();
    
    const eventStartSchedulerTZ = convertTimezone(meetingSlot.startTime, userTimezone, schedulerTimezone);
    const eventEndSchedulerTZ = convertTimezone(meetingSlot.endTime, userTimezone, schedulerTimezone);
    
    // Create event title and description
    const eventTitle = CONFIG.EVENT_TITLE.replace('{name}', formData.name);
    const eventDescription = CONFIG.EVENT_DESCRIPTION
      .replace('{name}', formData.name)
      .replace('{email}', formData.email)
      .replace('{phone}', formData.phone)
      .replace('{profile}', formData.profileLink)
      .replace('{notes}', formData.notes);
    
    // Validate email before using it
    const guestEmail = (formData.email || '').toString().trim();
    if (!guestEmail || !guestEmail.includes('@')) {
      throw new Error('Invalid or missing email address: ' + guestEmail);
    }
    
    // Create the event first (without guests in options)
    // Note: createEvent() doesn't support guests in options object
    // We'll add guests separately using addGuest() method
    const event = calendar.createEvent(eventTitle, eventStartSchedulerTZ, eventEndSchedulerTZ, {
      description: eventDescription
    });
    
    // Add guest to the event
    // Note: addGuest() automatically sends an email invite to the guest
    event.addGuest(guestEmail);
    
    // Configure guest permissions
    event.setGuestsCanModify(false);
    event.setGuestsCanInviteOthers(false);
    
    // Ensure the event is saved with guest information
    // The invite email is sent automatically when addGuest() is called
    Logger.log('Guest added: ' + guestEmail);
    Logger.log('Calendar invite will be sent automatically to: ' + guestEmail);
    
    // Add Google Meet link
    // Note: Google Calendar automatically adds Meet links when guests are invited
    // But we'll try to add it explicitly for better compatibility
    try {
      // Check if ConferenceServiceType exists and has the constants we need
      const ConferenceServiceType = CalendarApp.ConferenceServiceType;
      if (ConferenceServiceType) {
        // Try MEET first (newer API) - check if property exists
        if ('MEET' in ConferenceServiceType) {
          event.addConferenceLink(ConferenceServiceType.MEET);
        }
        // Fallback to HANGOUT (older API, still works for Meet)
        else if ('HANGOUT' in ConferenceServiceType) {
          event.addConferenceLink(ConferenceServiceType.HANGOUT);
        }
      }
      // If constants don't exist, Google will add Meet link automatically when guests are invited
    } catch (conferenceError) {
      // Non-fatal error - Google Calendar will add Meet link automatically
      // when the event has guests and sendInvites is true
      Logger.log('Note: Conference link will be added automatically by Google Calendar when guests receive invites.');
    }
    
    // Add reminders
    CONFIG.REMINDER_MINUTES.forEach(minutes => {
      event.addPopupReminder(minutes);
    });
    
    Logger.log('Calendar event created: ' + event.getId());
    return event;
    
  } catch (error) {
    Logger.log('Error creating calendar event: ' + error.toString());
    return null;
  }
}

// ============================================================================
// EMAIL FUNCTIONS
// ============================================================================

/**
 * Sends confirmation email to the participant
 * @param {Object} formData - Form submission data
 * @param {Object} meetingSlot - Meeting slot
 * @param {GoogleAppsScript.Calendar.CalendarEvent} event - Calendar event
 */
function sendConfirmationEmail(formData, meetingSlot, event) {
  try {
    const userTimezone = formData.timezone || Session.getScriptTimeZone();
    const meetingDate = formatDate(meetingSlot.startTime, userTimezone);
    const meetingTime = formatTime(meetingSlot.startTime, userTimezone);
    
    // Get meeting link from event
    const meetingLink = event.getConferenceLink() || 'Check calendar event for meeting link';
    
    // Format email content
    const emailSubject = CONFIG.EMAIL_SUBJECT.replace('{date}', meetingDate);
    const emailBody = CONFIG.EMAIL_BODY
      .replace('{name}', formData.name)
      .replace('{date}', meetingDate)
      .replace('{time}', meetingTime)
      .replace('{timezone}', userTimezone)
      .replace('{meetingLink}', meetingLink);
    
    // Send email
    MailApp.sendEmail({
      to: formData.email,
      subject: emailSubject,
      body: emailBody,
      name: 'Automated Scheduling System',
    });
    
    Logger.log('Confirmation email sent to: ' + formData.email);
    
  } catch (error) {
    Logger.log('Error sending confirmation email: ' + error.toString());
  }
}

/**
 * Sends rejection email when no slots are available
 * @param {Object} formData - Form submission data
 */
function sendRejectionEmail(formData) {
  try {
    const emailSubject = 'Meeting Request - No Available Slots';
    const emailBody = `Hello ${formData.name},

Thank you for your meeting request. Unfortunately, we are unable to find an available time slot in the next ${CONFIG.DAYS_AHEAD_TO_SEARCH} days.

Please try submitting again at a later time, or contact us directly to schedule a meeting.

Best regards,
Automated Scheduling System`;
    
    MailApp.sendEmail({
      to: formData.email,
      subject: emailSubject,
      body: emailBody,
      name: 'Automated Scheduling System',
    });
    
    Logger.log('Rejection email sent to: ' + formData.email);
    
  } catch (error) {
    Logger.log('Error sending rejection email: ' + error.toString());
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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

// ============================================================================
// SETUP FUNCTION - Run this once to set up the trigger
// ============================================================================

/**
 * SETUP FUNCTION - Run this once manually to set up the form submission trigger
 * Go to Apps Script editor > Run > setupFormTrigger
 * 
 * Alternatively, you can set up the trigger manually:
 * 1. Click on the clock icon (Triggers) in the left sidebar
 * 2. Click "Add Trigger"
 * 3. Select function: onFormSubmit
 * 4. Select event source: From form
 * 5. Select event type: On form submit
 * 6. Click Save
 */
function setupFormTrigger() {
  const form = FormApp.getActiveForm();
  if (!form) {
    Logger.log('No active form found. Make sure you open the form first.');
    return;
  }
  
  // Check if trigger already exists
  const triggers = ScriptApp.getProjectTriggers();
  const existingTrigger = triggers.find(trigger => 
    trigger.getEventType() === ScriptApp.EventType.ON_FORM_SUBMIT
  );
  
  if (existingTrigger) {
    Logger.log('Form submission trigger already exists');
    return;
  }
  
  // Create trigger
  ScriptApp.newTrigger('onFormSubmit')
    .onFormSubmit()
    .create();
  
  Logger.log('Form submission trigger created successfully!');
}

// ============================================================================
// VALIDATION FUNCTION - Check if column order is correct
// ============================================================================

/**
 * VALIDATION FUNCTION - Run this to verify your spreadsheet column order
 * This will check if columns are in the expected positions
 * Go to Apps Script editor > Run > validateColumnOrder
 */
function validateColumnOrder() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    Logger.log('ERROR: Sheet "' + CONFIG.SHEET_NAME + '" not found');
    return;
  }
  
  // Expected headers (for reference - script doesn't use these, but helps validation)
  const expectedHeaders = [
    'Timestamp',
    'Name',
    'Email',
    'Profile Link',
    'Phone',
    'Notes',
    'Preferred Time Window',
    'Preferred Dates',
    'Status',
    'Meeting Time',
    'Assigned Slot (ISO)',
    'Timezone',
    'Calendar Event ID',
    'Log'
  ];
  
  // Get headers from row 1 (if headers exist in row 1, otherwise this will read first data row)
  // Note: Script processes data starting from row 1
  const headerRange = sheet.getRange(1, 1, 1, expectedHeaders.length);
  const actualHeaders = headerRange.getValues()[0];
  
  Logger.log('=== COLUMN ORDER VALIDATION ===');
  Logger.log('');
  
  let hasErrors = false;
  
  // Check each column
  for (let i = 0; i < expectedHeaders.length; i++) {
    const columnLetter = String.fromCharCode(65 + i); // A, B, C, etc.
    const expected = expectedHeaders[i];
    const actual = actualHeaders[i] || '(empty)';
    
    // Check if column exists (not empty)
    if (!actual || actual.toString().trim() === '') {
      Logger.log('⚠️  Column ' + columnLetter + ': EMPTY (Expected: "' + expected + '")');
      hasErrors = true;
    } else {
      // Note: We don't enforce exact spelling, but we log what we see
      Logger.log('✓  Column ' + columnLetter + ': "' + actual + '" (Expected: "' + expected + '")');
    }
  }
  
  Logger.log('');
  Logger.log('=== IMPORTANT NOTES ===');
  Logger.log('1. The script reads by POSITION, not by header name');
  Logger.log('2. Column ORDER is critical - positions must match');
  Logger.log('3. Header spelling doesn\'t affect the script, but should be clear for humans');
  Logger.log('4. Form fields must be in the same order as columns A-G');
  Logger.log('');
  
  if (hasErrors) {
    Logger.log('⚠️  WARNING: Some columns are empty or missing!');
    Logger.log('   Please verify your form field order matches the expected order.');
  } else {
    Logger.log('✅ Column structure looks good!');
    Logger.log('   Remember: The script uses column positions, so order is what matters.');
  }
  
  Logger.log('');
  Logger.log('=== CURRENT COLUMN MAPPING ===');
  Logger.log('The script expects data in these positions:');
  Logger.log('  Column A (index 0): Timestamp');
  Logger.log('  Column B (index 1): Name');
  Logger.log('  Column C (index 2): Email');
  Logger.log('  Column D (index 3): Profile Link');
  Logger.log('  Column E (index 4): Phone');
  Logger.log('  Column F (index 5): Notes');
  Logger.log('  Column G (index 6): Preferred Time Window');
  Logger.log('  Column H (index 7): Preferred Dates');
  Logger.log('  Column I (index 8): Status (script fills)');
  Logger.log('  Column J (index 9): Meeting Time (script fills)');
  Logger.log('  Column K (index 10): Assigned Slot ISO (script fills)');
  Logger.log('  Column L (index 11): Timezone (script fills)');
  Logger.log('  Column M (index 12): Calendar Event ID (script fills)');
  Logger.log('  Column N (index 13): Log (script fills)');
}

// ============================================================================
// TEST FUNCTION - Use this to test the script manually
// ============================================================================

/**
 * TEST FUNCTION - Use this to test the script with sample data
 * This processes the LAST form submission in the sheet
 * Go to Apps Script editor > Run > testScript
 */
function testScript() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    Logger.log('ERROR: Sheet "' + CONFIG.SHEET_NAME + '" not found');
    Logger.log('Please check CONFIG.SHEET_NAME in the script');
    return;
  }
  
  // Get the last row
  const lastRow = sheet.getLastRow();
  Logger.log('Sheet last row: ' + lastRow);
  
  // Get the first data row (skips headers if they exist)
  const firstDataRow = getFirstDataRow(sheet);
  
  // Check if we have data
  if (lastRow < firstDataRow) {
    Logger.log('ERROR: No form submissions found!');
    Logger.log('The sheet only has headers (or is empty).');
    Logger.log('Please submit at least ONE form response first.');
    Logger.log('');
    Logger.log('To test:');
    Logger.log('1. Open your Google Form');
    Logger.log('2. Fill it out and submit');
    Logger.log('3. Check the spreadsheet - you should see data');
    Logger.log('4. Then run this test function again');
    return;
  }
  
  const dataRowCount = lastRow - firstDataRow + 1;
  Logger.log('Found ' + dataRowCount + ' form submission(s) (rows ' + firstDataRow + '-' + lastRow + ')');
  Logger.log('Processing the most recent submission (row ' + lastRow + ')...');
  Logger.log('');
  
  // Check if last row is headers
  if (isHeaderRow(sheet, lastRow)) {
    Logger.log('ERROR: Last row appears to be headers!');
    Logger.log('Please check your spreadsheet structure.');
    return;
  }
  
  // Read the last submission
  const formData = readFormData(sheet, lastRow);
  Logger.log('Form data: ' + JSON.stringify(formData));
  
  // Check if it's already processed
  if (formData.status === 'Confirmed' || formData.status === 'Rejected') {
    Logger.log('This submission is already processed (Status: ' + formData.status + ')');
    Logger.log('To process it again, change the Status column to "Pending" first');
    return;
  }
  
  // Process the submission
  Logger.log('Processing submission for: ' + formData.name + ' (' + formData.email + ')');
  
  const userTimezone = detectTimezone(formData.email) || Session.getScriptTimeZone();
  const meetingSlot = findAvailableSlot(userTimezone, formData.preferredTimeWindow, formData.preferredDates);
  
  if (meetingSlot) {
    Logger.log('✓ Found available slot: ' + formatDateTime(meetingSlot.startTime, userTimezone));
    const event = createCalendarEvent(formData, meetingSlot);
    if (event) {
      Logger.log('✓ Calendar event created: ' + event.getId());
      
      // Update the sheet
      const meetingTimeFormatted = formatDateTime(meetingSlot.startTime, userTimezone);
      const assignedSlotISO = meetingSlot.startTime.toISOString();
      updateCell(sheet, lastRow, COLUMNS.STATUS, 'Confirmed');
      updateCell(sheet, lastRow, COLUMNS.MEETING_TIME, meetingTimeFormatted);
      updateCell(sheet, lastRow, COLUMNS.ASSIGNED_SLOT_ISO, assignedSlotISO);
      updateCell(sheet, lastRow, COLUMNS.TIMEZONE, userTimezone);
      updateCell(sheet, lastRow, COLUMNS.CALENDAR_EVENT_ID, event.getId());
      updateCell(sheet, lastRow, COLUMNS.LOG, 'Processed via testScript');
      
      sendConfirmationEmail(formData, meetingSlot, event);
      Logger.log('✓ Confirmation email sent');
      Logger.log('');
      Logger.log('SUCCESS! Submission processed.');
    }
  } else {
    Logger.log('✗ No available slot found');
    updateCell(sheet, lastRow, COLUMNS.STATUS, 'Rejected');
    updateCell(sheet, lastRow, COLUMNS.LOG, 'No available slots found');
  }
}

/**
 * PROCESS ALL PENDING - Process all unprocessed form submissions
 * Use this to process multiple submissions at once
 * Go to Apps Script editor > Run > processAllPending
 */
function processAllPending() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    Logger.log('ERROR: Sheet "' + CONFIG.SHEET_NAME + '" not found');
    return;
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 1) {
    Logger.log('No form submissions found');
    return;
  }
  
  Logger.log('Processing all pending submissions...');
  Logger.log('Total data rows: ' + lastRow);
  Logger.log('');
  
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  
  // Get the first data row (skips headers if they exist)
  const firstDataRow = getFirstDataRow(sheet);
  
  // Process each row from firstDataRow to lastRow (skips headers)
  for (let row = firstDataRow; row <= lastRow; row++) {
    // Skip header rows
    if (isHeaderRow(sheet, row)) {
      Logger.log('Row ' + row + ': Header row - Skipping');
      skipped++;
      continue;
    }
    
    const formData = readFormData(sheet, row);
    
    // Skip if already processed
    if (formData.status === 'Confirmed' || formData.status === 'Rejected') {
      Logger.log('Row ' + row + ': Already processed (' + formData.status + ') - Skipping');
      skipped++;
      continue;
    }
    
    // Validate required fields
    if (!formData.name || !formData.email) {
      Logger.log('Row ' + row + ': Missing name or email - Skipping');
      updateCell(sheet, row, COLUMNS.STATUS, 'Error');
      updateCell(sheet, row, COLUMNS.LOG, 'Missing required fields');
      errors++;
      continue;
    }
    
    Logger.log('Row ' + row + ': Processing ' + formData.name + ' (' + formData.email + ')');
    
    try {
      // Process this submission
      updateCell(sheet, row, COLUMNS.STATUS, 'Processing');
      
      const userTimezone = detectTimezone(formData.email) || Session.getScriptTimeZone();
      const meetingSlot = findAvailableSlot(userTimezone, formData.preferredTimeWindow, formData.preferredDates);
      
      if (meetingSlot) {
        const event = createCalendarEvent(formData, meetingSlot);
        if (event) {
          const meetingTimeFormatted = formatDateTime(meetingSlot.startTime, userTimezone);
          const assignedSlotISO = meetingSlot.startTime.toISOString();
          updateCell(sheet, row, COLUMNS.STATUS, 'Confirmed');
          updateCell(sheet, row, COLUMNS.MEETING_TIME, meetingTimeFormatted);
          updateCell(sheet, row, COLUMNS.ASSIGNED_SLOT_ISO, assignedSlotISO);
          updateCell(sheet, row, COLUMNS.TIMEZONE, userTimezone);
          updateCell(sheet, row, COLUMNS.CALENDAR_EVENT_ID, event.getId());
          updateCell(sheet, row, COLUMNS.LOG, 'Processed successfully');
          sendConfirmationEmail(formData, meetingSlot, event);
          Logger.log('  ✓ Successfully processed');
          processed++;
        } else {
          updateCell(sheet, row, COLUMNS.STATUS, 'Error');
          updateCell(sheet, row, COLUMNS.LOG, 'Failed to create calendar event');
          errors++;
        }
      } else {
        updateCell(sheet, row, COLUMNS.STATUS, 'Rejected');
        updateCell(sheet, row, COLUMNS.LOG, 'No available slots found');
        Logger.log('  ✗ No available slots');
        processed++;
      }
    } catch (error) {
      Logger.log('  ✗ Error: ' + error.toString());
      updateCell(sheet, row, COLUMNS.STATUS, 'Error');
      updateCell(sheet, row, COLUMNS.LOG, 'Error: ' + error.toString());
      errors++;
    }
  }
  
  Logger.log('');
  Logger.log('=== SUMMARY ===');
  Logger.log('Processed: ' + processed);
  Logger.log('Skipped: ' + skipped);
  Logger.log('Errors: ' + errors);
  Logger.log('Total: ' + (processed + skipped + errors));
}

