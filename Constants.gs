/**
 * Constants and Enums
 */

// Status values
const STATUS = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  CONFIRMED: 'Confirmed',
  REJECTED: 'Rejected',
  ERROR: 'Error'
};

// Time window definitions (in minutes from midnight)
const TIME_WINDOWS = {
  MORNING: { start: 9 * 60, end: 12 * 60 },    // 9 AM to 12 PM
  AFTERNOON: { start: 12 * 60, end: 17 * 60 }, // 12 PM to 5 PM
  EVENING: { start: 17 * 60, end: 20 * 60 }    // 5 PM to 8 PM
};

// Slot increment for searching available times
const SLOT_INCREMENT_MINUTES = 15;

// Column mapping - ⚠️ CRITICAL: ORDER MATTERS!
// The script reads data by COLUMN POSITION (index), NOT by header names.
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

