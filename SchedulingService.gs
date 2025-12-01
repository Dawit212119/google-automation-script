/**
 * Scheduling Service
 * Handles scheduling logic, date parsing, and slot finding
 */

/**
 * Parses preferred dates from various input formats
 * @param {string|Date|Array|Object} preferredDatesInput - Date input
 * @return {Array<Date>} Array of Date objects
 */
function parsePreferredDates(preferredDatesInput) {
  if (!preferredDatesInput) return [];
  
  if (preferredDatesInput instanceof Date) {
    return !isNaN(preferredDatesInput.getTime()) ? [preferredDatesInput] : [];
  }
  
  if (Array.isArray(preferredDatesInput)) {
    return preferredDatesInput
      .map(item => {
        if (item instanceof Date && !isNaN(item.getTime())) return item;
        if (typeof item === 'string' && item.trim()) return parseDateString(item.trim());
        return null;
      })
      .filter(date => date !== null);
  }
  
  const preferredDatesStr = String(preferredDatesInput).trim();
  if (preferredDatesStr === '' || preferredDatesStr === 'undefined' || preferredDatesStr === 'null') {
    return [];
  }
  
  return preferredDatesStr
    .split(',')
    .map(s => s.trim())
    .filter(s => s !== '')
    .map(dateStr => {
      try {
        return parseDateString(dateStr);
      } catch (e) {
        Logger.log('Error parsing date: ' + dateStr + ' - ' + e.toString());
        return null;
      }
    })
    .filter(date => date !== null);
}

/**
 * Parses a single date string
 * @param {string} dateStr - Date string to parse
 * @return {Date|null} Parsed Date object or null if invalid
 */
function parseDateString(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  
  dateStr = dateStr.trim();
  if (dateStr === '') return null;
  
  let date;
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    date = new Date(dateStr + 'T00:00:00');
  } else if (/^\d{4}-\d{2}-\d{2}T/.test(dateStr)) {
    date = new Date(dateStr);
  } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    const parts = dateStr.split('/');
    date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
  } else {
    date = new Date(dateStr);
  }
  
  return !isNaN(date.getTime()) ? date : null;
}

/**
 * Gets time window constraints based on preference
 * @param {string} preferredTimeWindow - Time window preference
 * @param {string} userTimezone - User's timezone
 * @return {Object|null} Object with start and end minutes from midnight, or null
 */
function getTimeWindowConstraints(preferredTimeWindow, userTimezone) {
  if (!preferredTimeWindow || preferredTimeWindow.trim() === '') return null;
  
  const window = preferredTimeWindow.toLowerCase().trim();
  
  if (window.includes('morning')) return TIME_WINDOWS.MORNING;
  if (window.includes('afternoon')) return TIME_WINDOWS.AFTERNOON;
  if (window.includes('evening')) return TIME_WINDOWS.EVENING;
  if (window.includes('anytime') || window.includes('any time')) return null;
  
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

/**
 * Finds the next available meeting slot considering user preferences
 * @param {string} userTimezone - User's timezone
 * @param {string} preferredTimeWindow - User's preferred time window
 * @param {string} preferredDates - User's preferred dates
 * @return {Object|null} Meeting slot object with startTime and endTime, or null
 */
function findAvailableSlot(userTimezone, preferredTimeWindow, preferredDates) {
  const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
  const now = new Date();
  const schedulerTimezone = Session.getScriptTimeZone();
  
  const preferredDatesList = parsePreferredDates(preferredDates);
  const datesToSearch = preferredDatesList.length > 0 
    ? preferredDatesList 
    : generateDateRange(now, CONFIG.DAYS_AHEAD_TO_SEARCH);
  
  // Search preferred dates first
  for (const checkDate of datesToSearch) {
    if (!isValidSearchDate(checkDate, now)) continue;
    
    const slot = findSlotForDate(calendar, checkDate, preferredTimeWindow, userTimezone, schedulerTimezone);
    if (slot) return slot;
  }
  
  // If preferred dates didn't work, try general search
  if (preferredDatesList.length > 0) {
    const generalDates = generateDateRange(now, CONFIG.DAYS_AHEAD_TO_SEARCH);
    for (const checkDate of generalDates) {
      if (preferredDatesList.some(pd => isSameDay(pd, checkDate))) continue;
      if (!isValidSearchDate(checkDate, now)) continue;
      
      const slot = findSlotForDate(calendar, checkDate, preferredTimeWindow, userTimezone, schedulerTimezone);
      if (slot) return slot;
    }
  }
  
  return null;
}

/**
 * Checks if a date is valid for searching
 * @param {Date} checkDate - Date to check
 * @param {Date} now - Current date
 * @return {boolean} True if valid
 */
function isValidSearchDate(checkDate, now) {
  return CONFIG.WORKING_DAYS.includes(checkDate.getDay()) && checkDate >= now;
}

/**
 * Finds a slot for a specific date
 * @param {GoogleAppsScript.Calendar.Calendar} calendar - Calendar object
 * @param {Date} checkDate - Date to check
 * @param {string} preferredTimeWindow - Preferred time window
 * @param {string} userTimezone - User's timezone
 * @param {string} schedulerTimezone - Scheduler's timezone
 * @return {Object|null} Available slot or null
 */
function findSlotForDate(calendar, checkDate, preferredTimeWindow, userTimezone, schedulerTimezone) {
  const timeWindow = getTimeWindowConstraints(preferredTimeWindow, userTimezone);
  const { dayStartUserTZ, dayEndUserTZ } = getDayTimeRange(checkDate, schedulerTimezone, userTimezone);
  
  const { searchStart, searchEnd } = applyTimeWindowPreference(
    dayStartUserTZ, 
    dayEndUserTZ, 
    timeWindow
  );
  
  return findSlotInDay(calendar, searchStart, searchEnd, userTimezone);
}

/**
 * Gets day time range in user's timezone
 * @param {Date} checkDate - Date to check
 * @param {string} schedulerTimezone - Scheduler's timezone
 * @param {string} userTimezone - User's timezone
 * @return {Object} Object with dayStartUserTZ and dayEndUserTZ
 */
function getDayTimeRange(checkDate, schedulerTimezone, userTimezone) {
  const [startHour, startMinute] = CONFIG.WORKING_HOURS.start.split(':').map(Number);
  const [endHour, endMinute] = CONFIG.WORKING_HOURS.end.split(':').map(Number);
  
  const dayStart = new Date(checkDate);
  dayStart.setHours(startHour, startMinute, 0, 0);
  const dayStartUserTZ = convertTimezone(dayStart, schedulerTimezone, userTimezone);
  
  const dayEnd = new Date(checkDate);
  dayEnd.setHours(endHour, endMinute, 0, 0);
  const dayEndUserTZ = convertTimezone(dayEnd, schedulerTimezone, userTimezone);
  
  return { dayStartUserTZ, dayEndUserTZ };
}

/**
 * Applies time window preference to day range
 * @param {Date} dayStartUserTZ - Day start in user timezone
 * @param {Date} dayEndUserTZ - Day end in user timezone
 * @param {Object|null} timeWindow - Time window constraints
 * @return {Object} Object with searchStart and searchEnd
 */
function applyTimeWindowPreference(dayStartUserTZ, dayEndUserTZ, timeWindow) {
  if (!timeWindow) {
    return { searchStart: dayStartUserTZ, searchEnd: dayEndUserTZ };
  }
  
  let searchStart = new Date(dayStartUserTZ);
  let searchEnd = new Date(dayStartUserTZ);
  
  if (timeWindow.start !== null) {
    searchStart.setHours(Math.floor(timeWindow.start / 60), timeWindow.start % 60, 0, 0);
  }
  
  if (timeWindow.end !== null) {
    searchEnd.setHours(Math.floor(timeWindow.end / 60), timeWindow.end % 60, 0, 0);
  }
  
  return { searchStart, searchEnd };
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
  
  const dayStartSchedulerTZ = convertTimezone(dayStart, userTimezone, schedulerTimezone);
  const dayEndSchedulerTZ = convertTimezone(dayEnd, userTimezone, schedulerTimezone);
  
  const existingEvents = calendar.getEvents(dayStartSchedulerTZ, dayEndSchedulerTZ);
  existingEvents.sort((a, b) => a.getStartTime().getTime() - b.getStartTime().getTime());
  
  let currentSlotStart = new Date(dayStart);
  
  while (currentSlotStart.getTime() + durationMs <= dayEnd.getTime()) {
    const currentSlotEnd = new Date(currentSlotStart.getTime() + durationMs);
    
    if (!hasConflict(currentSlotStart, currentSlotEnd, existingEvents, schedulerTimezone, userTimezone, bufferMs)) {
      return {
        startTime: new Date(currentSlotStart),
        endTime: new Date(currentSlotEnd),
      };
    }
    
    currentSlotStart = new Date(currentSlotStart.getTime() + SLOT_INCREMENT_MINUTES * 60 * 1000);
  }
  
  return null;
}

/**
 * Checks if a slot conflicts with existing events
 * @param {Date} slotStart - Slot start time
 * @param {Date} slotEnd - Slot end time
 * @param {Array} existingEvents - Array of existing calendar events
 * @param {string} schedulerTimezone - Scheduler's timezone
 * @param {string} userTimezone - User's timezone
 * @param {number} bufferMs - Buffer time in milliseconds
 * @return {boolean} True if conflict exists
 */
function hasConflict(slotStart, slotEnd, existingEvents, schedulerTimezone, userTimezone, bufferMs) {
  const slotStartWithBuffer = new Date(slotStart.getTime() - bufferMs);
  const slotEndWithBuffer = new Date(slotEnd.getTime() + bufferMs);
  
  return existingEvents.some(event => {
    const eventStart = convertTimezone(event.getStartTime(), schedulerTimezone, userTimezone);
    const eventEnd = convertTimezone(event.getEndTime(), schedulerTimezone, userTimezone);
    return (eventStart < slotEndWithBuffer && eventEnd > slotStartWithBuffer);
  });
}

