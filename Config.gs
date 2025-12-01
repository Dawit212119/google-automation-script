/**
 * Configuration Settings
 * 
 * Update these values according to your setup
 */

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

