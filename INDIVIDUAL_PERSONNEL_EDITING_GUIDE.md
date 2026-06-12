# Individual Personnel Profile Editing

## New Feature: Click-to-Edit Personnel Profiles

You can now click on any personnel member from the list to view their full profile and edit their information directly without going through the batch upload process.

## How It Works

### 1. View Personnel List
- Go to **Admin Panel → Personnel → Manage Personnel**
- Expand any category (FDC, FWC, Directing Staff, Allied) by clicking on it
- You'll see all personnel in that category listed

### 2. Click on a Person to View Profile
- Click on any personnel record from the list
- A detailed profile view appears showing:
  - Profile photo (if available)
  - Name, Rank, Category, Service
  - Seniority order
  - Period Start and End years
  - Decoration/Honours
  - Full citation/biography

### 3. Edit Their Profile
- Click the **"Edit Profile"** button at the bottom
- The full edit form appears with organized sections:

#### Section 1: Basic Information
- **Name** - Officer's full name
- **Rank** - Military rank or title
- **Category** - FWC, FDC, Directing Staff, or Allied
- **Service** - Nigerian Army, Navy, Air Force, Civilian, Foreign, etc.

#### Section 2: Service Period & Seniority
- **Period Start** - Year officer started (e.g., 1990)
- **Period End** - Year officer ended (e.g., 1992)
- **Seniority Order** - Display order (1=highest)

#### Section 3: Course Information (NEW)
**This is where you set which CSE course they belonged to:**

- **"Use CSE Format" checkbox** - Enable to auto-generate course codes
- **Course Classification** - Select: FDC, FWC, Directing Staff, or Allied
- **Course Number** - The course number (e.g., 1, 42, 5)
- **Graduation Year** - The year they completed the course (e.g., 1993, 2020, 2004)

**Auto-generation:** Once you enter course number and year, the decoration automatically becomes: `CSE [number]/[year]`

Examples:
- Course 1, Year 1993 → `CSE 1/1993`
- Course 42, Year 2004 → `CSE 42/2004`
- Course 5, Year 1992 → `CSE 5/1992`

**Manual Format:** Toggle off "Use CSE Format" to manually enter decoration (e.g., "NWC Course 2; Course 3")

#### Section 4: Additional Information
- **Citation/Biography** - Full role description or biography
- **Image URL** - Link to officer's photo

### 4. Save or Delete
- **Save Changes** - Saves all modifications to the database
- **Delete** - Permanently removes the personnel record (with confirmation)
- **Back To List** - Returns to personnel list without changes

## Benefits

✅ **No Batch Processes Needed** - Edit single or individual records instantly
✅ **All Fields Editable** - Change category, years, decoration, rank, everything
✅ **Quick Access** - Click list item → View → Edit in just 3 clicks
✅ **Full Details** - See complete profile before editing
✅ **Immediate Updates** - Changes appear on home page right away

## Common Use Cases

### Update Officer's CSE Course Assignment (NEW)
1. Find officer in list
2. Click to view profile
3. Click "Edit Profile"
4. **Enable "Use CSE Format"**
5. Set:
   - Course Classification: FDC (or FWC, Directing Staff, Allied)
   - Course Number: 1 (or 42, 5, etc.)
   - Graduation Year: 2020 (or 1993, 2004, etc.)
6. Watch the auto-generated decoration update to "CSE 1/2020"
7. Click "Save Changes"
8. Officer now appears in CSE 1/2020 fellows group on home page

### Move Officer to Different Course
1. Officer currently in "CSE 42/2020"
2. Need to move to "CSE 1/2021"
3. Click officer → "Edit Profile"
4. In Course Information section:
   - Change Course Number: 42 → 1
   - Change Graduation Year: 2020 → 2021
5. Decoration auto-updates to "CSE 1/2021"
6. Save Changes
7. Officer moves to CSE 1/2021 group on home page

### Add Missing Course Information
1. Officer has no decoration/course assigned
2. Click to edit
3. Enable "Use CSE Format"
4. Fill in course details (found from records)
5. Save
6. Officer now properly categorized by course

### Use Custom Format (Non-CSE)
1. For special cases like "NWC Course 2; Course 3"
2. Click officer → "Edit Profile"
3. **Disable "Use CSE Format"**
4. Manually enter: "NWC Course 2; Course 3"
5. Save Changes
6. Officer shows with custom decoration

## CSE Course Format Explained

### What is CSE?
CSE stands for **Course Structure Entry**. The format is: `CSE [course_number]/[graduation_year]`

Examples on the home page:
- **CSE 1/1993** - Course 1, graduated 1993 (1 Fellow)
- **CSE 1/2004** - Course 1, graduated 2004 (1 Fellow)
- **CSE 42/2020** - Course 42, graduated 2020 (multiple Fellows)

### How Course Grouping Works
When you set the course information during editing:
1. The system automatically generates the decoration code
2. On the home page, all officers with the same CSE code are grouped together
3. Each CSE course displays as a clickable tile showing:
   - CSE course designation (CSE #/YYYY)
   - NDC crest icon
   - Number of fellows in that course

### Editing Example Flow
```
Before:
Officer: "Doe, John" | Decoration: (empty)
         Appears in generic list, not grouped

After Editing:
Course Classification: FDC
Course Number: 1
Graduation Year: 1993
(Decoration auto-generates: "CSE 1/1993")

Result on Home Page:
CSE 1/1993 course tile now shows:
- NDC Crest 🏛️
- "CSE 1/1993"
- "1 Fellow" 
- Click to see: John Doe
```

### Home Page Display Convention
The home page shows officers grouped by their CSE code:

```
┌─────────────────────────────┐
│ 🏛️ CSE 1/2004               │
│ Click on a CSE course       │
│ 1 Fellow                    │
└─────────────────────────────┘

┌─────────────────────────────┐
│ 🏛️ CSE 1/2003               │
│ Click on a CSE course       │
│ 2 Fellows                   │
└─────────────────────────────┘

┌─────────────────────────────┐
│ 🏛️ CSE 42/2020              │
│ Click on a CSE course       │
│ 5 Fellows                   │
└─────────────────────────────┘
```

When you click a course tile, you see all officers in that CSE group.

## Profile View Layout

```
[Profile Photo]
Officer Name
Category • Service Branch

┌─────────────────────────────┐
│ Rank          Category       │
│ Service       Seniority #    │
├─────────────────────────────┤
│ Period Start   Period End     │
│ Decoration/Honours (full)     │
├─────────────────────────────┤
│ Citation/Biography (full)    │
└─────────────────────────────┘

[Back To List]  [Edit Profile]  [Delete]
```

## Tips for Best Results

### Before Editing
- ✓ Review the current information on profile view
- ✓ Note what fields need to be changed
- ✓ Have new values ready (especially for years, category, decoration)
- ✓ Know the officer's CSE course if available (from records)

### During Editing - CSE Format (Recommended)
- ✓ **Enable "Use CSE Format"** for proper course grouping
- ✓ Set Course Classification to correct value (usually FDC)
- ✓ Enter the course number (single or double digit: 1, 5, 42, etc.)
- ✓ Enter graduation year as 4-digit number (1993, not '93)
- ✓ Let the system auto-generate the decoration code
- ✓ Verify the auto-generated code looks correct before saving

### CSE Format Best Practices
- ✓ Use CSE format for most officers (enables home page grouping)
- ✓ Use custom format only for special cases (foreign delegations, honorary)
- ✓ Always include year in CSE code (CSE 1/1993, not just CSE 1)
- ✓ Course numbers are typically 1-99 (rare exceptions up to 999)
- ✓ Graduation year should match or be close to Period Start year

### After Editing
- ✓ Verify person moved to correct CSE group on home page
- ✓ Check that new course tile appears if it's a new CSE code
- ✓ Confirm photo still appears if linked
- ✓ Verify seniority order within the course group

## Difference Between Edit Methods

| Task | Individual Edit | Batch Upload |
|------|---|---|
| Edit 1 person | ✓ Fastest | Overkill |
| Edit multiple same field | - | ✓ Best |
| Upload photos + edit | - | ✓ Only option |
| Bulk update year | - | ✓ Faster |
| Individual unique changes | ✓ Better | Tedious |

## Troubleshooting

### "Changes won't save"
- Check all required fields are filled
- Verify category is exact spelling (FDC, FWC, etc.)
- Try again - may be network issue

### "Officer not showing in new category"
- Refresh page to clear cache
- Verify category field was saved correctly
- Check for typos in category name

### "Can't find officer in list"
- Make sure category is expanded
- Try searching by partial name
- Check officer isn't deleted

### "Edit form won't open"
- Make sure you clicked "Edit Profile" button
- Not a profile field - need to click the button
- Try clicking profile again first

## Workflow Example: Bulk Reorganize Officers by Year

1. **Expand FDC category** to see all FDC officers
2. **Identify officers** who need year change (1990 → 1991)
3. **For each officer**:
   - Click their name
   - Click "Edit Profile"
   - Change Period Start to 1991
   - Click "Save Changes"
4. **Verify**: Officers now show under 1991 year filter on home page

This is much easier than CSV if you only have 5-10 records to update!

## See Also

- [PERSONNEL_EDITING_GUIDE.md](PERSONNEL_EDITING_GUIDE.md) - Category and course structure
- [BATCH_IMAGE_UPLOAD_ENHANCED_GUIDE.md](BATCH_IMAGE_UPLOAD_ENHANCED_GUIDE.md) - Batch upload with editing
- [BATCH_UPLOAD_GUIDE.md](BATCH_UPLOAD_GUIDE.md) - CSV batch upload
