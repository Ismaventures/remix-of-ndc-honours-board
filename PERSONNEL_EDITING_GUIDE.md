# Personnel Record Editing & Category Management Guide

## Overview

The system is designed to support editing personnel records at any time, with full flexibility for managing categories (FDC, FWC, Allied Officers, Directing Staff) and their associated courses and years.

## How Categories & Courses Work

### Structure Breakdown

1. **Category** (Top Level)
   - Values: FDC, FWC, Directing Staff, Allied
   - Stored in: `personnel.category` field
   - How it appears: Home page menu items

2. **Course Info** (Second Level)
   - Format examples: "CSE 42/2020", "Course 3", "Course 5"
   - Stored in: `decoration` field (typically)
   - How it appears: Grouped under category on home page

3. **Year** (Filtering Level)
   - Stored in: `periodStart` and `periodEnd` fields
   - How it appears: Filters on home page (Year 91, 92, etc.)

### Example Structure

When viewing the home page:
```
FDC (Category)
├── CSE 1 (Course from decoration field)
│   ├── Year 90
│   │   ├── Personnel 1
│   │   └── Personnel 2
│   ├── Year 91
│   │   └── Personnel 3
├── CSE 2 (Course from decoration field)
```

Each personnel record determines its position through:
- `category` → Which main category menu
- `decoration` (or course code) → Which course sub-section
- `periodStart` → Which year filter

## Editing Personnel Records

### Method 1: Batch Image Upload (New)

**When to use**: You have photos to add and want to edit multiple records at once

1. **Admin Panel** → Personnel → Manage Personnel
2. Click **Upload Images** or **Batch Image Upload**
3. Drag/drop up to 15 photos
4. Assign each photo to the correct personnel
5. Upload images
6. **Batch Edit Personnel Records** screen appears
7. Search, select, and edit records:
   - Change category
   - Update course info (in decoration field)
   - Change years (periodStart/periodEnd)
   - Modify any other fields
8. Save all changes at once

### Method 2: Individual Personnel Editing

**When to use**: You need to edit a single person or make detailed changes

1. **Admin Panel** → Personnel → Manage Personnel
2. Search for the person by name or rank
3. Click the edit icon (pencil) next to their record
4. Modify any fields:
   - Name, Rank
   - Category (change which main menu)
   - Course info (update decoration field)
   - Years (periodStart, periodEnd)
   - Service, Seniority, Citation, Honours, etc.
5. Click Save

### Method 3: Unified Personnel Management

**When to use**: You need to browse, filter, or manage all personnel

1. **Admin Panel** → Personnel → Manage Personnel
2. Use filters to find personnel by:
   - Category (FDC, FWC, etc.)
   - Service (Nigerian Army, Navy, etc.)
   - Search term (name, rank)
3. Click person to view details
4. Click Edit to modify any fields
5. Delete if needed

## Common Editing Scenarios

### Scenario 1: Reclassify a Personnel to Different Category

Example: Moving an officer from "FDC" to "Directing Staff"

1. Open Batch Image Upload or Individual Editor
2. Find the person
3. Change `category` field from "FDC" to "Directing Staff"
4. Save changes
5. Person now appears under "Directing Staff" on home page

### Scenario 2: Update Course Assignment

Example: Changing from "CSE 1/90" to "CSE 2/91"

1. Open editor for the person
2. Update `decoration` field: "CSE 1/90" → "CSE 2/91"
3. Update `periodStart`: 1990 → 1991
4. Save changes
5. Person moves to different course section

### Scenario 3: Bulk Update Multiple Officers to Same Year

Example: All officers from a course to year 1992

1. Use Batch Image Upload
2. Select/search all officers needing year update
3. Use "Bulk Edit" → Set periodStart to 1992
4. Save all at once

### Scenario 4: Fix Missing Information

Example: Add missing decoration/honours for multiple officers

1. Use Batch Image Upload
2. Search for officers missing honours field
3. Select multiple officers
4. Use individual edit for each to add specific honours
5. Save all changes

## Field Reference Guide

### Field Mapping

| Field | Database Column | How It Appears | Edit Where |
|-------|-----------------|-----------------|------------|
| Name | `name` | Officer name | Individual edit |
| Rank | `rank` | Military rank (Colonel, etc.) | Individual/Bulk edit |
| Category | `category` | Main menu (FDC, FWC, etc.) | Individual/Bulk edit |
| Service | `service` | Military branch | Individual edit |
| Years | `periodStart`/`periodEnd` | Year filter on home page | Individual/Bulk edit |
| Course Info | `decoration` | Course code (CSE 1/90, etc.) | Individual edit |
| Citation | `citation` | Officer's role/description | Individual edit |
| Honours | `decoration` | Can also store honours | Individual edit |
| Image | `imageUrl` | Photo on profile | Batch upload |
| Seniority | `seniorityOrder` | Display order within category | Individual/Bulk edit |

### Field Constraints

- **Category**: Must be one of: FWC, FDC, Directing Staff, Allied
- **Service**: Must be one of: Nigerian Army, Navy, Air Force, Civilian, Foreign, Foreign Service, Academic
- **Years**: Use 4-digit year format (1990, 1991, etc.)
- **Seniority**: Numeric value (1 = highest, higher numbers = lower priority)

## Important Notes

### Editing Existing Personnel
✓ YES - You can edit any field of existing personnel at any time
✓ YES - You can change their category
✓ YES - You can update their course/year information
✓ YES - Multiple people can be updated at once

### No Restrictions
- No fields are "locked" after creation
- Can change all properties including category and dates
- Changes take effect immediately on home page
- No need to re-upload data after edits

### Data Persistence
- All edits save immediately to database
- Personnel appear in correct categories based on current data
- Historical data not preserved (edits overwrite previous values)

## Batch Editing vs Individual Editing

### Use Batch Editing When:
- ✓ Uploading multiple photos
- ✓ Updating same field for multiple people (rank, year, etc.)
- ✓ Processing many records with common changes
- ✓ Adding images while also updating info

### Use Individual Editing When:
- ✓ Updating unique information per person
- ✓ Changing only one or two people
- ✓ Need detailed review before saving
- ✓ Complex changes with many fields

## Workflow Best Practices

1. **Before Batch Edit**
   - Have photos ready and named clearly
   - Know which personnel need updates
   - List common changes (rank, category, year)

2. **During Batch Edit**
   - Verify personnel assignments to photos
   - Search to confirm identities
   - Review bulk changes before saving

3. **After Batch Edit**
   - Verify updated records appear correctly on home page
   - Check categories are correct
   - Confirm year filters working

4. **Ongoing Maintenance**
   - Update records as personnel move between categories
   - Correct dates and years as time passes
   - Add honours/citations as earned
   - Keep images current

## Troubleshooting

### Personnel Not Appearing in Expected Category
- Check `category` field is correct (exact spelling: "FDC", "FWC", etc.)
- Verify person's record saved after edits
- Reload page to refresh display

### Wrong Year Filter
- Check `periodStart` field is set
- Ensure 4-digit year format (not "1990s" or "90")
- Verify `periodEnd` if needed

### Can't Find Person to Edit
- Use search box with partial name
- Try searching by rank instead
- Filter by category first, then search

### Bulk Edit Not Applied
- Verify personnel actually selected (checkboxes marked)
- Confirm value was set in bulk edit field
- Individual edits may have overridden bulk edit

## Support

For detailed field information, see [BATCH_UPLOAD_COMPLETE_SUMMARY.md](BATCH_UPLOAD_COMPLETE_SUMMARY.md) for database schema and field definitions.

For image upload issues, see [SUPABASE_STORAGE_SETUP.md](SUPABASE_STORAGE_SETUP.md).
