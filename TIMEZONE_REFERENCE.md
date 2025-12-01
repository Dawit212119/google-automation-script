# Timezone Format Reference

## Timezone Type/Format

The script uses **IANA timezone identifiers** (also known as Olson timezone database or tz database format).

## Format

**Type:** `String`  
**Format:** `Continent/City`  
**Example:** `"America/New_York"`

## Common Timezone Examples

### United States & Canada
- `America/New_York` - Eastern Time (ET)
- `America/Chicago` - Central Time (CT)
- `America/Denver` - Mountain Time (MT)
- `America/Los_Angeles` - Pacific Time (PT)
- `America/Phoenix` - Mountain Time (no DST)
- `America/Anchorage` - Alaska Time
- `America/Toronto` - Eastern Time (Canada)
- `America/Vancouver` - Pacific Time (Canada)

### Europe
- `Europe/London` - UK Time (GMT/BST)
- `Europe/Paris` - Central European Time
- `Europe/Berlin` - Central European Time
- `Europe/Rome` - Central European Time
- `Europe/Madrid` - Central European Time
- `Europe/Moscow` - Moscow Time
- `Europe/Istanbul` - Turkey Time

### Asia
- `Asia/Tokyo` - Japan Time
- `Asia/Shanghai` - China Time
- `Asia/Hong_Kong` - Hong Kong Time
- `Asia/Singapore` - Singapore Time
- `Asia/Dubai` - UAE Time
- `Asia/Kolkata` - India Time
- `Asia/Seoul` - Korea Time

### Australia & Pacific
- `Australia/Sydney` - Australian Eastern Time
- `Australia/Melbourne` - Australian Eastern Time
- `Australia/Perth` - Australian Western Time
- `Pacific/Auckland` - New Zealand Time
- `Pacific/Honolulu` - Hawaii Time

### Other
- `UTC` - Coordinated Universal Time
- `GMT` - Greenwich Mean Time (same as UTC)

## How to Get Your Timezone

### Method 1: From Google Apps Script
```javascript
// In Apps Script editor, run this:
Logger.log(Session.getScriptTimeZone());
// Output: e.g., "America/New_York"
```

### Method 2: From JavaScript Console
```javascript
// In browser console:
Intl.DateTimeFormat().resolvedOptions().timeZone
// Output: e.g., "America/New_York"
```

### Method 3: From Spreadsheet
In Google Sheets, you can use:
```
=TEXT(NOW(), "zzz")
```
This shows the timezone abbreviation, but for the full IANA identifier, use Method 1 or 2.

## Full List

For a complete list of all IANA timezone identifiers, see:
- https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
- https://www.iana.org/time-zones

## Important Notes

1. **Case Sensitive:** Timezone strings are case-sensitive
   - ✅ Correct: `"America/New_York"`
   - ❌ Wrong: `"america/new_york"` or `"America/NewYork"`

2. **Underscores:** Use underscores, not spaces or hyphens
   - ✅ Correct: `"America/New_York"`
   - ❌ Wrong: `"America/New York"` or `"America/New-York"`

3. **Format:** Always use `Continent/City` format
   - ✅ Correct: `"Europe/London"`
   - ❌ Wrong: `"GMT"`, `"EST"`, `"UTC-5"` (these are abbreviations/offsets, not timezone identifiers)

4. **Daylight Saving Time:** IANA timezones automatically handle DST
   - `"America/New_York"` automatically switches between EST (UTC-5) and EDT (UTC-4)

## Usage in the Script

The timezone is used in several places:
- Stored in the spreadsheet (Column L)
- Used for date/time conversions
- Used for formatting dates in emails
- Used for calculating meeting times

## Example Usage

```javascript
// Get current timezone
const tz = Session.getScriptTimeZone();
// Returns: "America/New_York"

// Format a date in a specific timezone
const date = new Date();
const formatted = Utilities.formatDate(date, "America/New_York", "yyyy-MM-dd HH:mm:ss");
```




