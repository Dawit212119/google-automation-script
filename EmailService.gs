/**
 * Email Service
 * Handles email sending operations
 */

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
    const meetingLink = event.getConferenceLink() || 'Check calendar event for meeting link';
    
    const emailSubject = replaceTemplate(CONFIG.EMAIL_SUBJECT, { date: meetingDate });
    const emailBody = replaceTemplate(CONFIG.EMAIL_BODY, {
      name: formData.name,
      date: meetingDate,
      time: meetingTime,
      timezone: userTimezone,
      meetingLink: meetingLink
    });
    
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

