# Quick Start Guide

## What You Need to Know

### Google Form Fields (in order):
1. **Name** (Short answer, Required)
2. **Email** (Short answer, Required, Email validation)
3. **Profile Link** (Short answer, Optional)
4. **Phone Number** (Short answer, Optional)
5. **Additional Notes** (Paragraph, Optional)
6. **Preferred Time Window** (Multiple choice or Short answer, Optional)
7. **Preferred Dates** (Short answer, Optional)

### Google Spreadsheet Columns (in order):
- **A:** Timestamp (auto-filled)
- **B:** Name (auto-filled)
- **C:** Email (auto-filled)
- **D:** Profile Link (auto-filled)
- **E:** Phone (auto-filled)
- **F:** Notes (auto-filled)
- **G:** Preferred Time Window (auto-filled)
- **H:** Preferred Dates (auto-filled)
- **I:** Status (script fills this)
- **J:** Meeting Time (script fills this)
- **K:** Assigned Slot (ISO) (script fills this)
- **L:** Timezone (script fills this)
- **M:** Calendar Event ID (script fills this)
- **N:** Log (script fills this)

## Quick Setup Steps

1. **Create Form** → Add 5 fields as listed above
2. **Create Spreadsheet** → Add columns G-K with headers
3. **Copy Script** → Copy `SchedulingAutomation.gs` to Apps Script
4. **Configure** → Update `CONFIG` object with your settings
5. **Set Trigger** → Run `setupFormTrigger()` function
6. **Test** → Submit a test form and verify it works

## Key Configuration Settings

```javascript
SCHEDULER_EMAIL: 'your-email@gmail.com'  // Your email
SHEET_NAME: 'Form Responses 1'           // Your sheet name
WORKING_HOURS: { start: '09:00', end: '17:00' }
WORKING_DAYS: [1, 2, 3, 4, 5]            // Mon-Fri
MEETING_DURATION_MINUTES: 30
```

## Files in This Project

- **SchedulingAutomation.gs** - Main Apps Script code (copy this to Google Apps Script)
- **FORM_SETUP_INSTRUCTIONS.md** - Detailed form setup guide
- **SPREADSHEET_SETUP_INSTRUCTIONS.md** - Detailed spreadsheet setup guide
- **INSTALLATION_GUIDE.md** - Complete installation and setup instructions
- **QUICK_START.md** - This file (quick reference)

## Need Help?

See `INSTALLATION_GUIDE.md` for detailed instructions and troubleshooting.

