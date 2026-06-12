# Course Filtering Updates - Complete Refactor

## **CHANGES MADE**

### **1. SQL Seed Data - Corrected Course Years**

File: `nwc_personnel_sql_seed_trackable.sql`

#### Course 3 (Updated)
- **Old Year Range**: 1994-1995
- **New Year Range**: 1995-1996
- **Personnel Updated**: 
  - R.B. Suara (nwc-007)
  - T. A. Odedina (nwc-008)
  - A. O. Fayomi (nwc-009)

#### Course 5 (Updated)
- **Old Year Range**: 1996-1997
- **New Year Range**: 1999-2000
- **Personnel Updated**: All 12 faculty members (nwc-011 through nwc-022)

#### Course 2 & Course 1 (Unchanged)
- Course 2: 1993-1994 ✓
- Course 1: 1992-1993 ✓

---

### **2. UI Components - Enhanced Filtering Logic**

#### File: `src/components/DirectingStaffByCourseYear.tsx`

**Changes**:
- Added support for **NWC format** course designation parsing
- Updated filtering to parse both:
  - **CSE Format**: "CSE X/YYYY" (extracts year from decoration)
  - **NWC Format**: "NWC Course X" (extracts year from `period_start`)
- Changed designation display from `CSE X/YYYY` to generic `Course X/YYYY`
- Updated help text to be format-agnostic
- Updated console warnings to be more generic

**Filtering Criteria** (Applied to all personnel):
```
1. Parse decoration field for course number (both CSE and NWC formats)
2. Use period_start as year for NWC personnel
3. Use extracted year from CSE pattern for CSE personnel
4. Group by: `${year}-${courseNumber}` (unique key)
5. Display as: `Course ${courseNumber}/${year}`
```

#### File: `src/components/FellowsByCourse.tsx`

**Changes**:
- Added support for **NWC format** course designation parsing
- Updated filtering logic identical to DirectingStaffByCourseYear
- Changed designation display from `CSE X/YYYY` to generic `Course X/YYYY`
- Updated console logs for consistency

**Applies to**: FWC, FDC, Allied, and any other category using this component

---

### **3. Universal Filtering Convention**

**New Standard Convention** (Applied across all components):

```
CRITERIA FOR COURSE FILTERING:
┌─────────────────────────────────────────┐
│ Course Number + Year = Unique Group     │
├─────────────────────────────────────────┤
│ Group ID: ${year}-${courseNumber}       │
│ Display:  Course ${courseNumber}/${year}│
├─────────────────────────────────────────┤
│ Supports Both:                          │
│ • CSE X/YYYY format (year from pattern) │
│ • NWC Course X format (year from DB)    │
└─────────────────────────────────────────┘
```

**Parsing Rules**:
1. Check for CSE pattern: `/CSE\s*(\d+)\s*\/\s*(\d{4})/i`
   - Extract: courseNumber, year from pattern
2. If no CSE, check for NWC pattern: `/NWC\s+Course\s+(\d+)/i`
   - Extract: courseNumber from pattern
   - Extract: year from `period_start` field
3. Group by composite key: `${year}-${courseNumber}`

---

## **COURSES - FINAL CONFIGURATION**

### **Course 1 (1992-1993)** - NWC Format
- **Filter**: Decoration LIKE "NWC Course 1%"
- **Year**: 1992-1993
- **Count**: 11 personnel
- **IDs**: nwc-023 to nwc-033

### **Course 2 (1993-1994)** - NWC Format  
- **Filter**: Decoration LIKE "NWC Course 2%"
- **Year**: 1993-1994
- **Count**: 6 personnel
- **IDs**: nwc-001 to nwc-006

### **Course 3 (1995-1996)** - NWC Format
- **Filter**: Decoration LIKE "NWC Course 3%"
- **Year**: 1995-1996 (updated from 1994-1995)
- **Count**: 3 personnel
- **IDs**: nwc-007 to nwc-009

### **Course 5 (1999-2000)** - NWC Format
- **Filter**: Decoration LIKE "NWC Course 5%"
- **Year**: 1999-2000 (updated from 1996-1997)
- **Count**: 12 personnel
- **IDs**: nwc-011 to nwc-022

---

## **BUILD VERIFICATION**

✅ **Build Status**: SUCCESS  
✅ **Build Time**: 16.00 seconds  
✅ **Errors**: 0  
✅ **Warnings**: 0  
✅ **Modules**: 1833 transformed  

---

## **FORWARD-COMPATIBILITY**

This filtering logic now supports:
- ✅ NWC Course format (used for NWC personnel)
- ✅ CSE format (used for CSE personnel)
- ✅ Any future course format following the convention
- ✅ Multiple courses per year
- ✅ All personnel categories (FDC, FWC, Allied, Directing Staff, etc.)

**To add new personnel using this convention:**
1. Set `category` to the appropriate type (FDC, FWC, Allied, Directing Staff, etc.)
2. Set `period_start` and `period_end` to the course year range
3. Set `decoration` to one of:
   - CSE format: `"CSE {courseNumber}/{year}"` 
   - NWC format: `"NWC Course {courseNumber}"`
4. Personnel will automatically group and display by course year

---

## **FILES MODIFIED**

- `nwc_personnel_sql_seed_trackable.sql` (SQL data)
- `src/components/DirectingStaffByCourseYear.tsx` (Filtering logic + display)
- `src/components/FellowsByCourse.tsx` (Filtering logic + display)

---

## **TESTING CHECKLIST**

- [ ] Course 1 (1992-1993) shows 11 NWC personnel
- [ ] Course 2 (1993-1994) shows 6 NWC personnel
- [ ] Course 3 (1995-1996) shows 3 NWC personnel (updated year)
- [ ] Course 5 (1999-2000) shows 12 NWC personnel (updated year)
- [ ] FWC/FDC/Allied show correct CSE courses
- [ ] Auto-display works correctly
- [ ] Navigation between courses works
- [ ] Mobile responsiveness maintained
