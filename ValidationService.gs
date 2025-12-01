/**
 * Validation Service
 * Handles data validation and form data extraction
 */

/**
 * Validates form data has required fields
 * @param {Object} formData - Form data object
 * @return {boolean} True if valid
 */
function isValidFormData(formData) {
  if (!formData) return false;
  
  const name = safeString(formData.name);
  const email = safeString(formData.email);
  
  return name && email && email.includes('@');
}

/**
 * Validates form data and target row
 * @param {Object} formData - Form data object
 * @param {number} targetRow - Target row number
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The spreadsheet sheet
 * @return {boolean} True if valid
 */
function validateFormData(formData, targetRow, sheet) {
  if (!targetRow || targetRow < 1) {
    Logger.log('ERROR: Invalid target row: ' + targetRow);
    return false;
  }
  
  if (isHeaderRow(sheet, targetRow)) {
    Logger.log('ERROR: Target row ' + targetRow + ' appears to be headers');
    return false;
  }
  
  if (!isValidFormData(formData)) {
    Logger.log('ERROR: Row ' + targetRow + ' is empty or missing required fields');
    updateSheetStatus(sheet, targetRow, STATUS.ERROR, 'Missing required fields: Name and Email are required');
    return false;
  }
  
  if (isAlreadyProcessed(sheet, targetRow)) {
    Logger.log('Submission already processed, skipping');
    return false;
  }
  
  return true;
}

/**
 * Extracts form data from event or sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The spreadsheet sheet
 * @param {GoogleAppsScript.Events.FormsOnFormSubmit} e - Form submit event
 * @return {Object} Object with formData and targetRow, or null values if failed
 */
function extractFormData(sheet, e) {
  let targetRow = getTargetRowFromEvent(e);
  
  if (targetRow) {
    if (isHeaderRow(sheet, targetRow)) {
      Logger.log('Row ' + targetRow + ' appears to be headers - Skipping');
      return { formData: null, targetRow: null };
    }
    
    if (isAlreadyProcessed(sheet, targetRow)) {
      return { formData: null, targetRow: null };
    }
    
    const formData = readFormDataFromEvent(e, targetRow, sheet);
    if (formData && isValidFormData(formData)) {
      return { formData, targetRow };
    }
    
    Logger.log('⚠️ Row ' + targetRow + ' from event appears to be empty');
    targetRow = null; // Trigger fallback search
  }
  
  // Fallback: find last row with data
  if (!targetRow) {
    targetRow = findLastDataRow(sheet);
    if (!targetRow) {
      Logger.log('ERROR: No data rows found with valid name and email.');
      return { formData: null, targetRow: null };
    }
  }
  
  const formData = readFormData(sheet, targetRow);
  Logger.log('✓ Using row ' + targetRow + ' as target');
  
  return { formData, targetRow };
}

/**
 * Gets target row from form submit event
 * @param {GoogleAppsScript.Events.FormsOnFormSubmit} e - Form submit event
 * @return {number|null} Row number or null
 */
function getTargetRowFromEvent(e) {
  if (!e) return null;
  
  if (e.range) {
    const row = e.range.getRow();
    Logger.log('✓ Form submitted to row: ' + row + ' (FROM EVENT RANGE)');
    return row;
  }
  
  Logger.log('⚠️ Event range not available');
  return null;
}

/**
 * Reads form data from event or sheet
 * @param {GoogleAppsScript.Events.FormsOnFormSubmit} e - Form submit event
 * @param {number} targetRow - Target row number
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The spreadsheet sheet
 * @return {Object|null} Form data object or null
 */
function readFormDataFromEvent(e, targetRow, sheet) {
  if (e && e.values && e.values.length > 0) {
    const nameFromEvent = safeString(e.values[COLUMNS.NAME]);
    const emailFromEvent = safeString(e.values[COLUMNS.EMAIL]);
    
    if (nameFromEvent && emailFromEvent && emailFromEvent.includes('@')) {
      Logger.log('Using event values (name: ' + nameFromEvent + ', email: ' + emailFromEvent + ')');
      return createFormDataFromValues(e.values);
    }
  }
  
  Logger.log('Reading from sheet row ' + targetRow);
  return readFormData(sheet, targetRow);
}

/**
 * Creates form data object from event values
 * @param {Array} values - Event values array
 * @return {Object} Form data object
 */
function createFormDataFromValues(values) {
  return {
    timestamp: values[COLUMNS.TIMESTAMP] || new Date(),
    name: safeString(values[COLUMNS.NAME]),
    email: safeString(values[COLUMNS.EMAIL]),
    profileLink: safeString(values[COLUMNS.PROFILE_LINK]),
    phone: safeString(values[COLUMNS.PHONE]),
    notes: safeString(values[COLUMNS.NOTES]),
    preferredTimeWindow: safeString(values[COLUMNS.PREFERRED_TIME_WINDOW]),
    preferredDates: safeString(values[COLUMNS.PREFERRED_DATES]),
    status: STATUS.PENDING,
    meetingTime: '',
    assignedSlotISO: '',
    timezone: '',
    calendarEventId: '',
    log: '',
  };
}

/**
 * Finds the last row with valid data
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The spreadsheet sheet
 * @return {number|null} Row number or null
 */
function findLastDataRow(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 1) {
    Logger.log('ERROR: No rows found. Sheet is empty.');
    return null;
  }
  
  const firstDataRow = getFirstDataRow(sheet);
  Logger.log('First data row (after headers): ' + firstDataRow);
  
  for (let r = lastRow; r >= firstDataRow; r--) {
    if (isHeaderRow(sheet, r)) continue;
    
    const testData = readFormData(sheet, r);
    if (isValidFormData(testData)) {
      Logger.log('✓ Found last row with data: ' + r);
      return r;
    }
  }
  
  return null;
}

