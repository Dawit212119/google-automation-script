/**
 * Calendar Service
 * Handles Google Calendar operations
 */

/**
 * Creates a calendar event for the meeting
 * @param {Object} formData - Form submission data
 * @param {Object} meetingSlot - Meeting slot with startTime and endTime
 * @return {GoogleAppsScript.Calendar.CalendarEvent|null} Created event or null
 */
function createCalendarEvent(formData, meetingSlot) {
  try {
    const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
    const schedulerTimezone = Session.getScriptTimeZone();
    const userTimezone = formData.timezone || Session.getScriptTimeZone();
    
    const eventStartSchedulerTZ = convertTimezone(meetingSlot.startTime, userTimezone, schedulerTimezone);
    const eventEndSchedulerTZ = convertTimezone(meetingSlot.endTime, userTimezone, schedulerTimezone);
    
    const eventTitle = replaceTemplate(CONFIG.EVENT_TITLE, { name: formData.name });
    const eventDescription = replaceTemplate(CONFIG.EVENT_DESCRIPTION, {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      profile: formData.profileLink,
      notes: formData.notes
    });
    
    const guestEmail = safeString(formData.email);
    if (!guestEmail || !guestEmail.includes('@')) {
      throw new Error('Invalid or missing email address: ' + guestEmail);
    }
    
    const event = calendar.createEvent(eventTitle, eventStartSchedulerTZ, eventEndSchedulerTZ, {
      description: eventDescription
    });
    
    event.addGuest(guestEmail);
    event.setGuestsCanModify(false);
    event.setGuestsCanInviteOthers(false);
    
    addConferenceLink(event);
    addReminders(event);
    
    Logger.log('Calendar event created: ' + event.getId());
    return event;
    
  } catch (error) {
    Logger.log('Error creating calendar event: ' + error.toString());
    return null;
  }
}

/**
 * Adds conference link to event
 * @param {GoogleAppsScript.Calendar.CalendarEvent} event - Calendar event
 */
function addConferenceLink(event) {
  try {
    const ConferenceServiceType = CalendarApp.ConferenceServiceType;
    if (ConferenceServiceType) {
      if ('MEET' in ConferenceServiceType) {
        event.addConferenceLink(ConferenceServiceType.MEET);
      } else if ('HANGOUT' in ConferenceServiceType) {
        event.addConferenceLink(ConferenceServiceType.HANGOUT);
      }
    }
  } catch (conferenceError) {
    Logger.log('Note: Conference link will be added automatically by Google Calendar when guests receive invites.');
  }
}

/**
 * Adds reminders to event
 * @param {GoogleAppsScript.Calendar.CalendarEvent} event - Calendar event
 */
function addReminders(event) {
  CONFIG.REMINDER_MINUTES.forEach(minutes => {
    event.addPopupReminder(minutes);
  });
}

