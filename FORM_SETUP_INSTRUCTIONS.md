# Google Form Setup Instructions

## Required Form Fields

Create a Google Form with the following fields in this exact order:

### 1. Name (Short answer)
- **Field Type:** Short answer text
- **Question:** "What is your name?"
- **Required:** Yes
- **Validation:** None

### 2. Email (Short answer)
- **Field Type:** Short answer text
- **Question:** "What is your email address?"
- **Required:** Yes
- **Validation:** Email address format

### 3. Profile Link (Short answer)
- **Field Type:** Short answer text
- **Question:** "Please provide your profile link (LinkedIn, website, etc.)"
- **Required:** No (optional)
- **Validation:** URL format (optional)

### 4. Phone Number (Short answer)
- **Field Type:** Short answer text
- **Question:** "What is your phone number?"
- **Required:** No (optional)
- **Validation:** None

### 5. Additional Notes (Paragraph)
- **Field Type:** Paragraph text
- **Question:** "Any additional notes or information you'd like to share?"
- **Required:** No (optional)
- **Validation:** None

### 6. Preferred Time Window (Multiple choice or Short answer)
- **Field Type:** Multiple choice (recommended) or Short answer
- **Question:** "What time of day do you prefer for the meeting?"
- **Required:** No (optional)
- **Options (if multiple choice):**
  - Morning (9 AM - 12 PM)
  - Afternoon (12 PM - 5 PM)
  - Evening (5 PM - 8 PM)
  - Anytime
- **Note:** If using short answer, users can type: "Morning", "Afternoon", "Evening", or "Anytime"

### 7. Preferred Dates (Short answer)
- **Field Type:** Short answer text
- **Question:** "What dates work best for you? (Enter dates in format: YYYY-MM-DD or MM/DD/YYYY, separate multiple dates with commas)"
- **Required:** No (optional)
- **Examples:** 
  - "2024-01-15"
  - "01/15/2024, 01/16/2024"
  - "2024-01-15, 2024-01-20, 2024-01-25"
- **Validation:** None (script will parse and validate)

## Important Notes

1. **Field Order Matters:** The script expects fields in the order listed above. If you change the order, you'll need to update the `COLUMNS` mapping in the Apps Script code.

2. **Form Settings:**
   - Enable "Collect email addresses" if you want to collect emails automatically
   - Set "Limit to 1 response" if you want to prevent duplicate submissions
   - Link the form to a Google Sheet (this is required)

3. **Form Response Sheet:**
   - When you create the form, Google will automatically create a linked spreadsheet
   - The sheet will have a default name like "Form Responses 1"
   - Make sure to note the exact sheet name and update `CONFIG.SHEET_NAME` in the script if different

## Optional Enhancements

You can add additional fields if needed, but remember to:
1. Update the `COLUMNS` mapping in the script
2. Update the `readFormData()` function to read the new columns
3. Update the event description template to include new fields

