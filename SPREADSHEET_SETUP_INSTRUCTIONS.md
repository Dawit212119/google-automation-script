# Google Spreadsheet Setup Instructions

## Required Columns

Your Google Sheet (linked to the form) must have the following columns in this exact order:

### Column Structure (Left to Right)

| Column | Letter | Name | Description | Auto-filled? |
|--------|--------|------|-------------|--------------|
| A | Timestamp | Timestamp | Auto-filled by Google Forms | ✅ Yes |
| B | Name | Name | From form field 1 | ✅ Yes |
| C | Email | Email | From form field 2 | ✅ Yes |
| D | Profile Link | Profile Link | From form field 3 | ✅ Yes |
| E | Phone | Phone Number | From form field 4 | ✅ Yes |
| F | Notes | Additional Notes | From form field 5 | ✅ Yes |
| G | Preferred Time Window | Preferred Time Window | From form field 6 (Morning/Afternoon/Evening/Anytime) | ✅ Yes |
| H | Preferred Dates | Preferred Dates | From form field 7 (comma-separated dates) | ✅ Yes |
| I | Status | Status | Set by script (Pending/Processing/Confirmed/Rejected/Error) | ❌ No |
| J | Meeting Time | Meeting Time | Set by script when meeting is scheduled | ❌ No |
| K | Assigned Slot (ISO) | Assigned Slot (ISO) | Set by script - ISO 8601 format timestamp | ❌ No |
| L | Timezone | Timezone | Set by script | ❌ No |
| M | Calendar Event ID | Calendar Event ID | Set by script after event creation | ❌ No |
| N | Log | Log | Activity log from script | ❌ No |

## Setup Steps

### Step 1: Create the Form Response Sheet
1. When you create your Google Form, it will automatically create a linked spreadsheet
2. The default sheet name is usually "Form Responses 1"
3. Note the exact sheet name (including spaces and capitalization)

### Step 2: Add Additional Columns
The form will automatically create columns A-H. You need to manually add columns I-N:

1. **Column I - Status:**
   - Header: "Status"
   - This column will show: Pending, Processing, Confirmed, Rejected, or Error

2. **Column J - Meeting Time:**
   - Header: "Meeting Time"
   - This will contain the scheduled meeting date and time (human-readable format)

3. **Column K - Assigned Slot (ISO):**
   - Header: "Assigned Slot (ISO)"
   - This will contain the assigned meeting time in ISO 8601 format (e.g., "2024-01-15T14:30:00.000Z")
   - Useful for programmatic access and time zone conversions

4. **Column L - Timezone:**
   - Header: "Timezone"
   - This will contain the timezone used for the meeting

5. **Column M - Calendar Event ID:**
   - Header: "Calendar Event ID"
   - This will contain the Google Calendar event ID after creation

6. **Column N - Log:**
   - Header: "Log"
   - This will contain processing logs and error messages

### Step 3: Format Headers (Optional but Recommended)
1. Select row 1 (header row)
2. Make it bold
3. Freeze row 1 (View > Freeze > 1 row)
4. This makes it easier to see headers when scrolling

### Step 4: Set Column Widths (Optional)
- Column A (Timestamp): 150-180 pixels
- Column B (Name): 150 pixels
- Column C (Email): 200 pixels
- Column D (Profile Link): 200 pixels
- Column E (Phone): 120 pixels
- Column F (Notes): 300 pixels
- Column G (Preferred Time Window): 150 pixels
- Column H (Preferred Dates): 200 pixels
- Column I (Status): 100 pixels
- Column J (Meeting Time): 200 pixels
- Column K (Assigned Slot ISO): 200 pixels
- Column L (Timezone): 150 pixels
- Column M (Calendar Event ID): 200 pixels
- Column N (Log): 400 pixels

## Column Status Values

The **Status** column (Column I) will contain one of these values:

- **Pending:** New submission, not yet processed
- **Processing:** Currently being processed by the script
- **Confirmed:** Meeting scheduled successfully
- **Rejected:** No available time slots found
- **Error:** An error occurred during processing

## Important Notes

1. **Column Order is Critical:** The script uses column indices (0-based). If you change the column order, you must update the `COLUMNS` object in the Apps Script code.

2. **Sheet Name:** Make sure the sheet name matches exactly what you set in `CONFIG.SHEET_NAME` in the script. Default is "Form Responses 1".

3. **Data Validation (Optional):** You can add data validation to the Status column to ensure only valid values are entered:
   - Select column G
   - Data > Data validation
   - Criteria: List of items
   - Items: Pending, Processing, Confirmed, Rejected, Error

4. **Conditional Formatting (Optional):** You can add color coding to the Status column:
   - Select column I
   - Format > Conditional formatting
   - Add rules:
     - "Confirmed" = Green
     - "Rejected" = Red
     - "Error" = Orange
     - "Processing" = Yellow
     - "Pending" = Gray

## Testing

After setting up:
1. Submit a test form response
2. Check that columns A-F are auto-filled
3. Run the script (manually or via trigger)
4. Verify that columns G-K are populated correctly

