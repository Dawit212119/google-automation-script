/**
 * Main Entry Point
 * 
 * Google Apps Script - Automated Scheduling System
 * 
 * This script automates meeting scheduling from Google Form submissions.
 * It handles time zones, DST, calendar availability, event creation, and email confirmations.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a Google Form with the required fields (see documentation)
 * 2. Create a Google Sheet linked to the form
 * 3. Add the required columns to the sheet (see documentation)
 * 4. Copy all script files to Google Apps Script editor
 * 5. Update the CONFIGURATION in Config.gs with your details
 * 6. Set up the onFormSubmit trigger (see setup instructions below)
 */

// ============================================================================
// MAIN TRIGGER FUNCTION
// ============================================================================

/**
 * Triggered automatically when a form is submitted
 * @param {GoogleAppsScript.Events.FormsOnFormSubmit} e - Form submit event
 */
function onFormSubmit(e) {
  try {
    logSection('FORM SUBMISSION TRIGGERED');
    
    const sheet = getSheet();
    if (!sheet) return;
    
    const { formData, targetRow } = extractFormData(sheet, e);
    if (!formData || !targetRow) return;
    
    if (!validateFormData(formData, targetRow, sheet)) return;
    
    processSubmission(sheet, formData, targetRow);
    
  } catch (error) {
    handleError(error, e);
  }
}

// ============================================================================
// SUBMISSION PROCESSING
// ============================================================================

/**
 * Processes a form submission
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The spreadsheet sheet
 * @param {Object} formData - Form submission data
 * @param {number} targetRow - Target row number
 */
function processSubmission(sheet, formData, targetRow) {
  logSection('PROCESSING SUBMISSION', `Row ${targetRow}: ${formData.name} (${formData.email})`);
  
  updateSheetStatus(sheet, targetRow, STATUS.PROCESSING, `Processing started at ${new Date().toLocaleString()}`);
  
  const userTimezone = detectTimezone(formData.email) || Session.getScriptTimeZone();
  const meetingSlot = findAvailableSlot(userTimezone, formData.preferredTimeWindow, formData.preferredDates);
  
  if (!meetingSlot) {
    handleNoSlotAvailable(sheet, targetRow, formData);
    return;
  }
  
  const event = createCalendarEvent(formData, meetingSlot);
  if (!event) {
    updateSheetStatus(sheet, targetRow, STATUS.ERROR, 'Failed to create calendar event');
    return;
  }
  
  updateSheetWithMeetingDetails(sheet, targetRow, formData, meetingSlot, event, userTimezone);
  sendConfirmationEmail(formData, meetingSlot, event);
  
  logSection('PROCESSING COMPLETED', `Row ${targetRow} - Status: ${STATUS.CONFIRMED}`);
}

/**
 * Handles case when no slot is available
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The spreadsheet sheet
 * @param {number} targetRow - Target row number
 * @param {Object} formData - Form submission data
 */
function handleNoSlotAvailable(sheet, targetRow, formData) {
  const message = `No available slots found. Searched ${CONFIG.DAYS_AHEAD_TO_SEARCH} days ahead.`;
  updateSheetStatus(sheet, targetRow, STATUS.REJECTED, message);
  sendRejectionEmail(formData);
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Handles errors and logs to sheet
 * @param {Error} error - Error object
 * @param {GoogleAppsScript.Events.FormsOnFormSubmit} e - Form submit event
 */
function handleError(error, e) {
  Logger.log('Error in onFormSubmit: ' + error.toString());
  Logger.log('Stack trace: ' + error.stack);
  
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
    if (sheet) {
      const errorRow = (e && e.range) ? e.range.getRow() : sheet.getLastRow();
      if (errorRow >= 1) {
        updateSheetStatus(sheet, errorRow, STATUS.ERROR, `Error: ${error.toString()}`);
      }
    }
  } catch (e) {
    MailApp.sendEmail(CONFIG.SCHEDULER_EMAIL, 'Scheduling System Error', error.toString());
  }
}

// ============================================================================
// SETUP FUNCTION - Run this once to set up the trigger
// ============================================================================

/**
 * SETUP FUNCTION - Run this once manually to set up the form submission trigger
 * Go to Apps Script editor > Run > setupFormTrigger
 */
function setupFormTrigger() {
  const form = FormApp.getActiveForm();
  if (!form) {
    Logger.log('No active form found. Make sure you open the form first.');
    return;
  }
  
  const triggers = ScriptApp.getProjectTriggers();
  const existingTrigger = triggers.find(trigger => 
    trigger.getEventType() === ScriptApp.EventType.ON_FORM_SUBMIT
  );
  
  if (existingTrigger) {
    Logger.log('Form submission trigger already exists');
    return;
  }
  
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
 * Go to Apps Script editor > Run > validateColumnOrder
 */
function validateColumnOrder() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    Logger.log('ERROR: Sheet "' + CONFIG.SHEET_NAME + '" not found');
    return;
  }
  
  const expectedHeaders = [
    'Timestamp', 'Name', 'Email', 'Profile Link', 'Phone', 'Notes',
    'Preferred Time Window', 'Preferred Dates', 'Status', 'Meeting Time',
    'Assigned Slot (ISO)', 'Timezone', 'Calendar Event ID', 'Log'
  ];
  
  const headerRange = sheet.getRange(1, 1, 1, expectedHeaders.length);
  const actualHeaders = headerRange.getValues()[0];
  
  Logger.log('=== COLUMN ORDER VALIDATION ===');
  Logger.log('');
  
  let hasErrors = false;
  
  for (let i = 0; i < expectedHeaders.length; i++) {
    const columnLetter = String.fromCharCode(65 + i);
    const expected = expectedHeaders[i];
    const actual = actualHeaders[i] || '(empty)';
    
    if (!actual || actual.toString().trim() === '') {
      Logger.log('⚠️  Column ' + columnLetter + ': EMPTY (Expected: "' + expected + '")');
      hasErrors = true;
    } else {
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
  } else {
    Logger.log('✅ Column structure looks good!');
  }
}

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

/**
 * TEST FUNCTION - Use this to test the script with sample data
 * Go to Apps Script editor > Run > testScript
 */
function testScript() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    Logger.log('ERROR: Sheet "' + CONFIG.SHEET_NAME + '" not found');
    return;
  }
  
  const lastRow = sheet.getLastRow();
  const firstDataRow = getFirstDataRow(sheet);
  
  if (lastRow < firstDataRow) {
    Logger.log('ERROR: No form submissions found!');
    return;
  }
  
  if (isHeaderRow(sheet, lastRow)) {
    Logger.log('ERROR: Last row appears to be headers!');
    return;
  }
  
  const formData = readFormData(sheet, lastRow);
  
  if (formData.status === STATUS.CONFIRMED || formData.status === STATUS.REJECTED) {
    Logger.log('This submission is already processed (Status: ' + formData.status + ')');
    return;
  }
  
  Logger.log('Processing submission for: ' + formData.name + ' (' + formData.email + ')');
  processSubmission(sheet, formData, lastRow);
}

/**
 * PROCESS ALL PENDING - Process all unprocessed form submissions
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
  
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  
  const firstDataRow = getFirstDataRow(sheet);
  
  for (let row = firstDataRow; row <= lastRow; row++) {
    if (isHeaderRow(sheet, row)) {
      skipped++;
      continue;
    }
    
    const formData = readFormData(sheet, row);
    
    if (formData.status === STATUS.CONFIRMED || formData.status === STATUS.REJECTED) {
      skipped++;
      continue;
    }
    
    if (!isValidFormData(formData)) {
      updateSheetStatus(sheet, row, STATUS.ERROR, 'Missing required fields');
      errors++;
      continue;
    }
    
    try {
      processSubmission(sheet, formData, row);
      processed++;
    } catch (error) {
      Logger.log('  ✗ Error: ' + error.toString());
      updateSheetStatus(sheet, row, STATUS.ERROR, 'Error: ' + error.toString());
      errors++;
    }
  }
  
  Logger.log('');
  Logger.log('=== SUMMARY ===');
  Logger.log('Processed: ' + processed);
  Logger.log('Skipped: ' + skipped);
  Logger.log('Errors: ' + errors);
}

