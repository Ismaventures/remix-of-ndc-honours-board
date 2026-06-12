# Batch Upload User Guide

## Overview

The Batch Upload feature allows administrators to efficiently upload multiple personnel records at once with course classification, course number, and graduation year information. Personnel records are automatically organized by course and year, making them available across the application.

## Quick Start

### Step 1: Access Batch Upload
1. Log in to the Admin Panel
2. Click on **"Batch Upload"** in the left sidebar (orange tab)

### Step 2: Configure Course Information
1. Select **Course Classification** (e.g., Directing Staff, FDC, FWC, Allied)
2. Enter **Course Number** (e.g., 1, 2, 42)
3. Enter **Graduation Year** (e.g., 1986, 2020, 2024)
4. The system shows you the format: "Course {number} – {year}"

### Step 3: Select Personnel File
1. Click the upload area or drag and drop a CSV/Excel file
2. The file should contain personnel data with required columns
3. File must be less than 50MB

### Step 4: Review and Select Records
1. Preview all loaded records with validation status
2. Valid records are ready to upload ✓
3. Invalid records show specific errors ✗
4. Select which records to upload (defaults to all valid records)
5. Click **"Upload Records"**

### Step 5: Complete Upload
1. Monitor upload progress
2. Review success/failure summary
3. Fix failed records and retry if needed
4. Close to return to personnel list

## File Format Requirements

### CSV File Structure

Create a CSV file with the following columns:

| Column | Header    | Required | Format/Examples                    |
|--------|-----------|----------|-------------------------------------|
| A      | Name      | Yes      | "General John Doe", "Captain Jane" |
| B      | Rank      | Yes      | "General", "Colonel", "Major"      |
| C      | Service   | Yes      | See valid services below           |
| D      | Citation  | Optional | "Chief of Defense Staff"           |
| E      | Seniority | Optional | 1, 2, 3 (ascending order)          |
| F      | Image     | Optional | Filename (e.g., "john-doe.jpg")   |

### Valid Services
These are the only accepted values for the Service column:
- Nigerian Army
- Nigerian Navy
- Nigerian Air Force
- Civilian
- Foreign
- Foreign Service
- Academic

### Example CSV Content

```csv
Name,Rank,Service,Citation,Seniority,Image
"General John Eze Englebert","General","Nigerian Army","Chief of Defence Staff",1,"eze-john.jpg"
"Air Marshal Oladayo Oladele","Air Marshal","Nigerian Air Force","Chief of Air Staff",2,"oladele-oladayo.jpg"
"Rear Admiral Mohammed Yunus","Rear Admiral","Nigerian Navy","Commander Naval Staff",3,"yunus-mohammed.jpg"
"Mrs. Grace Okoro","Civilian","Civilian","Deputy Director, Institute",4,"okoro-grace.jpg"
```

## Important Notes

### Date Range
- Personnel records are assigned to the graduation year you specify
- Period start and end are both set to the graduation year
- You can manually edit individual records after upload if needed

### Course Classification Format
- **Directing Staff**: Officers serving as instructors
- **FDC**: Fellows of Directing Staff Course
- **FWC**: Fellows of War College
- **Allied**: Foreign/Allied officers

### Image Files
- Images must be JPEG, PNG, or WebP format
- Maximum 10MB per image
- Enter just the filename in the CSV (e.g., "smith-john.jpg")
- Upload actual image files separately after personnel are created
- Or prepare images in advance in a folder

### Seniority Order
- Used for sorting within courses/categories
- Lower numbers appear first
- Optional field; defaults to 0 if not provided

### Citation Field
- Any text describing role, position, or honors
- Examples: "Chief of Defence Staff", "Head of Operations"
- Optional but recommended for completeness

## Course Organization

### Automatic Course Creation
The system automatically creates course categories in the format:
- **Display Format**: "Course 42 – 2020"
- **Database Format**: "CSE 42/2020" (in the decoration field)

### Course Visibility
After upload, personnel appear in:
- **Directing Staff Section**: If classified as "Directing Staff"
- **Fellows Sections**: If classified as FDC or FWC
- **Allied Section**: If classified as "Allied"

Personnel are automatically grouped by course number and graduation year within each category section.

### Example: Course 42 – 2020
- Course Number: 42
- Graduation Year: 2020
- Display: "Course 42 – 2020"
- All uploaded personnel with this classification will appear under this course

## Error Handling

### Validation Errors
The system validates each record before upload:

**Required Field Errors:**
- "Name is required"
- "Rank is required"  
- "Service is required"

**Invalid Service Errors:**
- "Service 'X' is not valid. Must be one of: ..."

**Invalid Seniority Order Errors:**
- "Seniority order must be a non-negative number"

### Fixing Errors
1. Records with errors are marked with red highlight
2. Click "Show only records with errors" to filter view
3. Note the specific errors for each record
4. Fix the CSV file or:
   - Deselect invalid records
   - Upload only valid records
   - Add/fix records manually afterwards

### Retry
- Failed uploads during processing show specific error messages
- You can retry uploading the same batch
- Address errors and resubmit

## Tips & Best Practices

### Preparation
1. **Use a spreadsheet program** (Excel, Google Sheets) to create/edit CSV
2. **Validate services** before uploading - copy the list above
3. **Check for typos** in names and ranks
4. **Organize chronologically** - newest graduates first or oldest first, your preference
5. **Include seniority** if personnel have official ranking within the course

### File Management
1. **Name your file clearly**: "Course_42_2020_Personnel.csv"
2. **Keep backups** of your CSV files
3. **Test with small batches first** before uploading 100+ records
4. **Export uploaded courses** from admin panel for backup

### Images
1. **Prepare images beforehand** if you have them
2. **Use consistent naming** (e.g., "rank-surname-firstname.jpg")
3. **Image upload is separate** from personnel upload
4. **Can add images later** via individual record edit

### Course Design
1. **One course at a time** - upload each course separately
2. **Consistent year format** - always use 4-digit years (1986, 2020)
3. **Course numbers sequential** - preferably 1, 2, 3... but not required
4. **Mix categories if needed** - different courses can have different classifications

## Limits & Constraints

- **Max records per upload**: 500 (can upload multiple batches)
- **Max file size**: 50MB
- **Max image size**: 10MB each
- **Concurrent uploads**: 5 records at a time
- **Supported formats**: CSV, XLSX, XLS (Excel files)

## Troubleshooting

### "File must be CSV or Excel"
- Check file extension (.csv or .xlsx)
- Save as CSV from spreadsheet if needed
- Try re-exporting the file

### "No valid records found"
- Verify file has headers in row 1
- Check that required columns (A, B, C) have data
- Verify service names match exactly (case-sensitive)

### Upload Hangs or Times Out
- Try smaller batch (< 50 records)
- Check internet connection
- Verify file is not corrupted
- Try uploading again

### Personnel Don't Appear After Upload
- Check course classification matches category
- Verify graduation year in records
- Refresh the application
- Check Personnel section filter (All vs. specific category)

## After Upload

### Next Steps
1. **Verify records** in Personnel section
2. **Add images** via individual record editing
3. **Review citations** and add details as needed
4. **Check course organization** in Directing Staff or Fellows sections
5. **Make edits** to individual records if needed

### Edit Records
- Click on any personnel record
- Use "Edit Profile" button
- Modify details as needed
- Save changes

### Delete Records
- Open personnel record
- Click delete button (trash icon)
- Confirm deletion
- Note: Deletion is permanent

### Export Personnel
- In admin panel, you can export uploaded courses as CSV
- Use for backup or modification
- Re-import if needed

## Integration with Application Sections

### Directing Staff Section
- Shows all personnel classified as "Directing Staff"
- Organized by course number and year
- Example: "Course 1 – 1986", "Course 2 – 1987"
- Click course to see course members

### Fellows Sections (FDC/FWC)
- Shows fellows by course classification
- Organized identically to Directing Staff
- Separate sections for FDC and FWC
- Includes all courses and their members

### Search & Filter
- All uploaded personnel appear in Personnel admin list
- Searchable by name, rank, service, category
- Filterable by category (All, FWC, FDC, Directing Staff, Allied)
- Sortable by various fields

## Contact & Support

For issues with batch uploads:
1. Check this guide first
2. Review file format requirements
3. Verify service names are correct
4. Check validation error messages for specifics
5. Contact system administrator if problems persist

---

**Last Updated**: 2026-06-10
**Version**: 1.0
