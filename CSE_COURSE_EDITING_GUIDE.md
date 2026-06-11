# CSE Course Editing & Grouping

## Overview

The **CSE Course Format** (CSE = Course Structure Entry) is used to organize and group personnel by the specific course they attended. When you edit a personnel record, you can specify their CSE course, and the system automatically:

1. **Generates the decoration code** (e.g., "CSE 1/1993")
2. **Groups them on the home page** with other fellows from the same course
3. **Creates course tiles** showing all officers in that CSE group

## CSE Format

### Format Structure
```
CSE [course_number]/[graduation_year]
```

### Examples
- `CSE 1/1993` - Course 1, year 1993
- `CSE 42/2004` - Course 42, year 2004
- `CSE 5/2020` - Course 5, year 2020
- `CSE 1/2001` - Course 1, year 2001

## How to Edit CSE Course Information

### Step-by-Step Process

1. **Go to Admin Panel**
   - Click: Admin Panel → Personnel → Manage Personnel

2. **Find and Click Officer**
   - Expand category (FDC, FWC, etc.)
   - Click on officer's name to view profile

3. **Click "Edit Profile"**
   - Opens the edit form

4. **Scroll to Section 3: Course Information**
   - Look for the blue "Course Information" box
   - Check the "Use CSE Format" checkbox

5. **Fill in Course Details**
   - **Course Classification**: Select FDC, FWC, Directing Staff, or Allied
   - **Course Number**: Enter the course number (e.g., 1, 42, 5)
   - **Graduation Year**: Enter the year (e.g., 1993, 2004, 2020)

6. **Watch Auto-Generation**
   - As you enter course number and year, decoration automatically updates
   - Shows: `CSE [number]/[year]`

7. **Review and Save**
   - Verify the auto-generated code is correct
   - Click "Save Changes"

## Using CSE Format

### When to Use CSE Format ✓
- **Attending officers**: Course attendees (most common)
- **Directing staff**: Who taught at the college
- **Regular courses**: Numbered sequences (1, 2, 42, etc.)
- **Standard entries**: Want automatic grouping

### When to Use Custom Format (Toggle OFF)
- **International exchanges**: Foreign delegations
- **Honorary positions**: No specific course
- **Multi-course assignments**: "Course 2; Course 3; Course 5"
- **Special designations**: Historical or custom roles

## Field Reference

### Course Classification
Select based on the type of course/role:

| Classification | Meaning | Example |
|---|---|---|
| **FDC** | Fellows of Directing Staff | FDC 1993 |
| **FWC** | Fellows of War College | FWC 2020 |
| **Directing Staff** | Instructors/facilitators | DS 1998 |
| **Allied** | Allied/partner organizations | Allied 2015 |

### Course Number
The course sequence number:
- Typical range: 1–99
- Examples: 1, 5, 42
- Rarely: up to 999
- Used to distinguish between courses of the same type in a year

### Graduation Year
The year the course was completed:
- 4-digit format: 1993, 2004, 2020
- Usually matches **Period Start** year
- Used for historical tracking and grouping

## Examples in Action

### Example 1: Add Course Info to New Officer
```
Officer: John Doe
Current: No course assigned (decoration empty)

Editing:
✓ Enable "Use CSE Format"
✓ Course Classification: FDC
✓ Course Number: 1
✓ Graduation Year: 1993

Result:
✓ Decoration becomes: "CSE 1/1993"
✓ Officer appears in "CSE 1/1993" group on home page
✓ Shows: "CSE 1/1993 - 1 Fellow"
```

### Example 2: Move Officer to Different Course
```
Officer: Jane Smith
Current: CSE 42/2020

Need to update to: CSE 1/2021

Editing:
✓ Course Number: 42 → 1
✓ Graduation Year: 2020 → 2021

Result:
✓ Decoration auto-updates: "CSE 1/2021"
✓ Officer moves from CSE 42/2020 group → CSE 1/2021 group
✓ CSE 42/2020 count decreases, CSE 1/2021 count increases
```

### Example 3: Multiple Assignments (Custom Format)
```
Officer: Dr. Special Person
Assigned to multiple courses: 2, 3, 5

Editing:
✗ Disable "Use CSE Format"
✓ Manual entry: "NWC Course 2; Course 3; Course 5"

Result:
✓ Shows custom decoration
✓ Doesn't auto-group (treated as unique entry)
✓ Useful for faculty/special assignments
```

## Home Page Display

### Course Tiles
On the home page, officers are grouped into tiles by their CSE code:

```
┌─────────────────────────────────┐
│         🏛️  NDC Crest          │
│                                 │
│      CSE 1/1993                │
│   Click on a CSE course         │
│                                 │
│      1 Fellow                  │
└─────────────────────────────────┘
```

### Click to View Course Details
When you click a CSE course tile:
- Shows all fellows in that course
- Displays in order by seniority
- Shows photos if available
- Can view individual profiles

## Workflow: Bulk Update CSE Courses

### Scenario: Reassign Officers to Correct Course
10 officers were assigned to wrong course year. Need to update 2020 → 2021.

### Process
1. **Expand category** in Admin Personnel list
2. **For each officer**:
   - Click name → Profile
   - Click "Edit Profile"
   - Scroll to Course Information
   - Change Graduation Year: 2020 → 2021
   - Click "Save Changes"
3. **Verify**: Officers move to CSE [#]/2021 group

### Time: ~1-2 minutes per officer

## Troubleshooting CSE Courses

### "Officer not showing in CSE group"
- ✓ Verify CSE code was saved (click officer again)
- ✓ Check course number and year are correct
- ✓ Try refreshing home page
- ✓ Check if you disabled "Use CSE Format" by mistake

### "Wrong course number shows"
- ✓ Edit officer → Check Course Number field
- ✓ Verify auto-generated code at bottom
- ✓ Save changes
- ✓ Refresh page

### "CSE course tile not appearing"
- ✓ Check if any officers have that CSE code
- ✓ Verify course number and year are correct
- ✓ May need to add more officers to create tile
- ✓ Refresh home page

### "Can't edit course for officer"
- ✓ Click officer name in list
- ✓ Click "Edit Profile" button (not profile view)
- ✓ Make sure Course Information section is visible
- ✓ Enable "Use CSE Format" checkbox

## Database Storage

### Behind the Scenes
When you save CSE course information:
- **Field**: `decoration` (text field)
- **Value**: `CSE [number]/[year]` (e.g., "CSE 1/1993")
- **Used by**: Home page course grouping and sorting

### Custom Format
For custom entries:
- **Field**: `decoration` (text field)
- **Value**: Any text (e.g., "NWC Course 2; Course 3")
- **Used by**: Display only (no auto-grouping)

## Quick Reference Card

```
┌─────────────────────────────────────┐
│ CSE COURSE EDITING QUICK REFERENCE │
├─────────────────────────────────────┤
│ Format: CSE [#]/[YYYY]              │
│ Example: CSE 1/1993                 │
│                                     │
│ Fields:                             │
│ ✓ Course Classification: FDC/FWC    │
│ ✓ Course Number: 1-99 (or higher)   │
│ ✓ Graduation Year: 4-digit (1993)   │
│                                     │
│ Auto-generates: decoration field    │
│ Result: Officer appears in CSE      │
│         course group on home page   │
│                                     │
│ Toggle "Use CSE Format":            │
│ ✓ ON = auto-generation              │
│ ✓ OFF = custom format               │
└─────────────────────────────────────┘
```

## Related Documentation

- [INDIVIDUAL_PERSONNEL_EDITING_GUIDE.md](INDIVIDUAL_PERSONNEL_EDITING_GUIDE.md) - How to edit individual personnel
- [PERSONNEL_EDITING_GUIDE.md](PERSONNEL_EDITING_GUIDE.md) - Personnel field reference
- [BATCH_UPLOAD_GUIDE.md](BATCH_UPLOAD_GUIDE.md) - Batch uploading personnel with courses
