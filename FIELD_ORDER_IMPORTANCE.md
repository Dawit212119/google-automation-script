# Field Order and Spelling - Critical Information

## ⚠️ IMPORTANT: Order Matters!

The script reads data by **column position (index)**, NOT by header names. This means:

### ✅ Order: CRITICAL
- **Form field order MUST match exactly** - Google Forms creates spreadsheet columns in the same order as form fields
- **Spreadsheet column order MUST match exactly** - The script uses column indices (0, 1, 2, etc.)

### ⚠️ Spelling: Not Critical for Script, But Important for Humans
- **Header names in spreadsheet** - Spelling doesn't affect the script (it uses indices), but correct spelling helps you understand your data
- **Form field labels** - Spelling doesn't affect functionality, but clear labels help users fill out the form correctly

---

## Required Order

### Google Form Fields (MUST be in this exact order):

1. **Name** (Short answer)
2. **Email** (Short answer)
3. **Profile Link** (Short answer)
4. **Phone Number** (Short answer)
5. **Additional Notes** (Paragraph)
6. **Preferred Time Window** (Multiple choice or Short answer)
7. **Preferred Dates** (Short answer)

### Google Spreadsheet Columns (MUST be in this exact order):

| Column | Letter | Required Header | Auto-filled? |
|--------|--------|-----------------|--------------|
| A | Timestamp | Timestamp | ✅ Yes (by Forms) |
| B | Name | Name | ✅ Yes (by Forms) |
| C | Email | Email | ✅ Yes (by Forms) |
| D | Profile Link | Profile Link | ✅ Yes (by Forms) |
| E | Phone | Phone Number | ✅ Yes (by Forms) |
| F | Notes | Additional Notes | ✅ Yes (by Forms) |
| G | Preferred Time Window | Preferred Time Window | ✅ Yes (by Forms) |
| H | Preferred Dates | Preferred Dates | ✅ Yes (by Forms) |
| I | Status | Status | ❌ No (by Script) |
| J | Meeting Time | Meeting Time | ❌ No (by Script) |
| K | Assigned Slot (ISO) | Assigned Slot (ISO) | ❌ No (by Script) |
| L | Timezone | Timezone | ❌ No (by Script) |
| M | Calendar Event ID | Calendar Event ID | ❌ No (by Script) |
| N | Log | Log | ❌ No (by Script) |

---

## What Happens If Order Is Wrong?

### ❌ Wrong Form Field Order Example:
If you put Email before Name:
- Column B will have Email (but script expects Name)
- Column C will have Name (but script expects Email)
- **Result:** Script will read wrong data, emails won't be sent correctly, names will be wrong

### ❌ Wrong Spreadsheet Column Order Example:
If you accidentally swap columns B and C:
- Column B has Email (script expects Name)
- Column C has Name (script expects Email)
- **Result:** Script will read wrong data, causing errors

---

## How the Script Reads Data

The script uses **column indices** (0-based):

```javascript
const COLUMNS = {
  TIMESTAMP: 0,              // Column A
  NAME: 1,                   // Column B
  EMAIL: 2,                  // Column C
  PROFILE_LINK: 3,           // Column D
  // ... etc
};
```

When reading data:
```javascript
name: values[COLUMNS.NAME]     // Reads from column index 1 (Column B)
email: values[COLUMNS.EMAIL]   // Reads from column index 2 (Column C)
```

**The script does NOT look at header names** - it only uses positions!

---

## Header Spelling - Best Practices

While spelling doesn't affect the script, use clear, consistent headers:

### ✅ Good Header Names:
- "Name"
- "Email"
- "Preferred Time Window"
- "Assigned Slot (ISO)"

### ⚠️ Acceptable (but not recommended):
- "name" (lowercase - works but less clear)
- "EMAIL ADDRESS" (works but inconsistent)
- "PreferredTimeWindow" (works but harder to read)

### ❌ Avoid:
- "Nmae" (typo - confusing for humans)
- "E-mail" (inconsistent format)
- Empty headers (makes data hard to understand)

---

## How to Verify Your Order

### Step 1: Check Form Field Order
1. Open your Google Form
2. Go to the form editor
3. Verify fields are in the exact order listed above
4. **DO NOT** reorder fields after form is created (it will break the script!)

### Step 2: Check Spreadsheet Column Order
1. Open your linked spreadsheet
2. Look at Row 1 (headers)
3. Verify columns A-H match the order above
4. Verify columns I-N are in the correct positions

### Step 3: Test with Sample Data
1. Submit a test form
2. Check that data appears in the correct columns
3. Verify the script processes it correctly

---

## What If You Need to Change Order?

### Option 1: Update the Script (Recommended)
If you must change the order, update the `COLUMNS` object in the script:

```javascript
const COLUMNS = {
  TIMESTAMP: 0,
  EMAIL: 1,        // Changed from NAME
  NAME: 2,         // Changed from EMAIL
  // ... update all indices to match new order
};
```

### Option 2: Recreate Form (Easier)
1. Create a new form with correct field order
2. Link to a new spreadsheet
3. Update `CONFIG.SHEET_NAME` in the script
4. Set up the trigger again

---

## Common Mistakes to Avoid

1. ❌ **Adding fields in wrong order** - Always add form fields in the specified order
2. ❌ **Moving columns in spreadsheet** - Don't cut/paste columns, it breaks the mapping
3. ❌ **Deleting columns** - Don't delete columns, it shifts everything
4. ❌ **Inserting columns between form responses** - Don't insert columns between A-H
5. ❌ **Reordering form fields after creation** - This breaks the column mapping

---

## Quick Checklist

Before using your form:
- [ ] Form fields are in the exact order specified
- [ ] Spreadsheet columns A-H match the form field order
- [ ] Spreadsheet columns I-N are added in the correct positions
- [ ] Header names are clear and readable (for your reference)
- [ ] Test submission works correctly

---

## Summary

| Aspect | Critical? | Why |
|--------|-----------|-----|
| **Form Field Order** | ✅ YES | Determines spreadsheet column order |
| **Spreadsheet Column Order** | ✅ YES | Script reads by position, not name |
| **Header Spelling** | ⚠️ NO (for script) | Doesn't affect script, but helps humans |
| **Header Spelling** | ✅ YES (for humans) | Makes data understandable |

**Bottom Line:** Follow the exact order specified, and you'll be fine! The script is position-based, not name-based.




