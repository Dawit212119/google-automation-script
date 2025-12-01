# Installation and Setup Guide

## Complete Setup Instructions

Follow these steps to set up your automated scheduling system:

## Step 1: Create Google Form

1. Go to [Google Forms](https://forms.google.com)
2. Create a new form
3. Add the required fields (see `FORM_SETUP_INSTRUCTIONS.md`)
4. Configure form settings:
   - Enable "Collect email addresses" (optional but recommended)
   - Link to a new spreadsheet or existing one
5. Note the exact name of the response sheet (usually "Form Responses 1")

## Step 2: Set Up Google Spreadsheet

1. Open the spreadsheet linked to your form
2. Add the additional columns (G-K) as described in `SPREADSHEET_SETUP_INSTRUCTIONS.md`
3. Add headers: Status, Meeting Time, Timezone, Calendar Event ID, Log
4. Format headers (bold, freeze row 1)
5. Note the exact sheet name

## Step 3: Copy Apps Script Code

1. Open the `SchedulingAutomation.gs` file
2. Copy the entire contents
3. Go to [Google Apps Script](https://script.google.com)
4. Click "New Project"
5. Delete the default `myFunction` code
6. Paste the entire `SchedulingAutomation.gs` code

## Step 4: Configure the Script

Update the `CONFIG` object at the top of the script:

```javascript
const CONFIG = {
  SCHEDULER_EMAIL: 'your-email@gmail.com',  // Your email
  CALENDAR_ID: 'primary',                    // Usually 'primary' for default calendar
  MEETING_DURATION_MINUTES: 30,             // Meeting length
  WORKING_HOURS: {
    start: '09:00',                         // Start of work day
    end: '17:00'                            // End of work day
  },
  WORKING_DAYS: [1, 2, 3, 4, 5],           // Monday-Friday
  BUFFER_TIME_MINUTES: 15,                  // Time between meetings
  DAYS_AHEAD_TO_SEARCH: 14,                // How many days to look ahead
  SHEET_NAME: 'Form Responses 1',          // Your sheet name
  // ... other settings
};
```

**Important Settings to Update:**
- `SCHEDULER_EMAIL`: Your email address
- `SHEET_NAME`: Exact name of your form response sheet
- `WORKING_HOURS`: Your available hours (24-hour format)
- `WORKING_DAYS`: Days you're available (0=Sunday, 1=Monday, etc.)
- `MEETING_DURATION_MINUTES`: How long each meeting lasts
- `DAYS_AHEAD_TO_SEARCH`: How many days in advance to search for slots

## Step 5: Set Up Trigger

### Option A: Automatic Setup (Recommended)
1. In Apps Script editor, go to **Run** > **setupFormTrigger**
2. Click "Run" (you may need to authorize the script first)
3. Review permissions and click "Allow"
4. The trigger will be created automatically

### Option B: Manual Setup
1. In Apps Script editor, click the clock icon (Triggers) in the left sidebar
2. Click "Add Trigger" (bottom right)
3. Configure:
   - **Function to run:** `onFormSubmit`
   - **Event source:** `From form`
   - **Event type:** `On form submit`
   - **Failure notification settings:** Daily
4. Click "Save"

## Step 6: Authorize the Script

1. When you first run the script or set up the trigger, Google will ask for permissions
2. Click "Review Permissions"
3. Select your Google account
4. Click "Advanced" > "Go to [Project Name] (unsafe)" if you see a warning
5. Click "Allow" to grant permissions:
   - Access to Google Sheets
   - Access to Google Calendar
   - Access to Gmail
   - Access to Google Forms

## Step 7: Test the System

1. **Test Form Submission:**
   - Submit a test form response
   - Check the spreadsheet - columns G-K should populate
   - Check your calendar - a new event should be created
   - Check the email - a confirmation should be sent

2. **Test Script Manually (Optional):**
   - In Apps Script editor, go to **Run** > **testScript**
   - Check the execution log for any errors
   - Review the spreadsheet to see results

## Step 8: Verify Everything Works

Checklist:
- ✅ Form submissions trigger the script
- ✅ Spreadsheet updates with status and meeting time
- ✅ Calendar events are created with Google Meet links
- ✅ Confirmation emails are sent
- ✅ Events include proper reminders
- ✅ Time zones are handled correctly

## Troubleshooting

### Script Not Triggering
- Check that the trigger is set up correctly
- Verify the sheet name matches `CONFIG.SHEET_NAME`
- Check execution logs: **View** > **Execution log**

### Calendar Events Not Created
- Verify `CALENDAR_ID` is correct (try 'primary')
- Check that you have permission to create events
- Review execution logs for errors

### Emails Not Sending
- Check spam folder
- Verify email addresses are correct
- Ensure Gmail API is enabled

### Time Zone Issues
- Verify `Session.getScriptTimeZone()` returns your timezone
- Check that time conversions are working correctly
- Review the timezone column in the spreadsheet

### No Available Slots Found
- Check your `WORKING_HOURS` and `WORKING_DAYS` settings
- Verify your calendar doesn't have too many existing events
- Increase `DAYS_AHEAD_TO_SEARCH` if needed
- Check that `BUFFER_TIME_MINUTES` isn't too large

## Customization

### Change Event Title/Description
Edit the `EVENT_TITLE` and `EVENT_DESCRIPTION` in the `CONFIG` object. Use placeholders:
- `{name}` - Participant name
- `{email}` - Participant email
- `{phone}` - Phone number
- `{profile}` - Profile link
- `{notes}` - Additional notes

### Change Email Content
Edit `EMAIL_SUBJECT` and `EMAIL_BODY` in the `CONFIG` object. Use placeholders:
- `{name}` - Participant name
- `{date}` - Meeting date
- `{time}` - Meeting time
- `{timezone}` - Timezone
- `{meetingLink}` - Google Meet link

### Add More Reminders
Update `REMINDER_MINUTES` array in `CONFIG`:
```javascript
REMINDER_MINUTES: [10, 30, 60], // 10 min, 30 min, and 1 hour before
```

## Support

If you encounter issues:
1. Check the execution logs in Apps Script
2. Review the "Log" column in your spreadsheet
3. Verify all configuration settings
4. Test with a simple form submission first




