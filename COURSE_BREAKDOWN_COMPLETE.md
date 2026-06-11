# NWC Personnel - Complete Course Breakdown

## COURSE 1 (1992-1993) - **11 PERSONNEL TOTAL**
### 8 Staff Members
1. **S Momah** - Brigadier General, Nigerian Army (seniority_order: 23)
2. **P Tnadah** - Brigadier General, Nigerian Army (seniority_order: 24)
3. **O George** - Commodore, Nigerian Navy (seniority_order: 25)
4. **EI Ombu** - Air Commodore, Nigerian Air Force (seniority_order: 26)
5. **A One Mohammed** - Colonel, Nigerian Army (seniority_order: 27)
6. **EF Olutumogun** - Colonel, Nigerian Army (seniority_order: 28)
7. **SE Fagbemi** - Colonel, Nigerian Army (seniority_order: 29) - Director Military History and Research
8. **SM Dule** - Colonel, Nigerian Army (seniority_order: 30) - College Librarian

### 3 International Exchange Officers
9. **RD Vellacott** - Colonel, Foreign/UK (seniority_order: 31)
10. **Chris Ellison** - Captain, Foreign/UK (seniority_order: 32)
11. **Delve** - Group Captain, Foreign/UK (seniority_order: 33)

---

## COURSE 2 (1993-1994) - **6 FACULTY MEMBERS**
1. **V O Laseinde** - Captain, Nigerian Navy (seniority_order: 1)
   - Commanding Officer and Directing Staff member
   - Also taught Course 3 & Course 5
   
2. **S A Ochoche** - Dr, Nigerian Army (seniority_order: 2)
   - Deputy Director Military Strategy
   - Also taught Course 3
   
3. **Iba Yellow Duke** - Colonel, Nigerian Army (seniority_order: 3)
   - Principal Staff Officer - Coordination
   - Also taught Course 3
   
4. **S O Cole** - Group Captain, Nigerian Air Force (seniority_order: 4)
   - Directing Staff member
   
5. **S Y Ojibara** - Group Captain, Nigerian Air Force (seniority_order: 5)
   - Directing Staff member
   
6. **G Abdulkadir** - Brigadier General, Nigerian Army (seniority_order: 6)
   - Deputy Commandant and Director of Studies
   - Also taught Course 3

---

## COURSE 3 (1994-1995) - **3 FACULTY MEMBERS** (+ 3 from Course 2)
### New Course 3 Faculty Only
1. **R.B. Suara** - Air Commodore, Nigerian Air Force (seniority_order: 7)
   - Directing Staff member
   
2. **T. A. Odedina** - Commodore, Nigerian Navy (seniority_order: 8)
   - Directing Staff member
   
3. **A. O. Fayomi** - Brigadier General, Nigerian Army (seniority_order: 9)
   - Course 3 Faculty

### Course 2-3 Shared Faculty (also taught Course 3):
- V O Laseinde (see Course 2)
- S A Ochoche (see Course 2)
- Iba Yellow Duke (see Course 2)
- G Abdulkadir (see Course 2)

---

## COURSE 5 (1996-1997) - **12 FACULTY MEMBERS**
1. **JI Igoche** - Brigadier General, Nigerian Army (seniority_order: 11)
2. **AO Ogundana** - Air Commodore, Nigerian Air Force (seniority_order: 12)
3. **E Martins** - Ambassador, Civilian (seniority_order: 13)
4. **JW Gbor** - Colonel, Nigerian Army (seniority_order: 14)
5. **JIO Edokpayi** - Brigadier General, Nigerian Army (seniority_order: 15)
6. **DO Enahoro** - Brigadier General, Nigerian Army (seniority_order: 16)
7. **AO Ogomudia** - Brigadier General, Nigerian Army (seniority_order: 17)
8. **OE Okon** - Brigadier General, Nigerian Army (seniority_order: 18)
9. **B Ogundele** - Commodore, Nigerian Navy (seniority_order: 19)
10. **I A Abdulrahim** - Air Commodore, Nigerian Air Force (seniority_order: 20)
11. **G.O Agboneni** - Air Commodore, Nigerian Air Force (seniority_order: 21)
12. **AG Adedeji** - Captain, Nigerian Navy (seniority_order: 22)

### Course 2-5 Shared Faculty:
- V O Laseinde (also taught Course 2 & 3)

---

## PERSONNEL COUNTS BY COURSE
| Course | Year | Personnel | IDs | Category |
|--------|------|-----------|-----|----------|
| Course 1 | 1992-1993 | **11** | nwc-023 to nwc-033 | Staff + Exchange Officers |
| Course 2 | 1993-1994 | **6** | nwc-001 to nwc-006 | Faculty/Directing Staff |
| Course 3 | 1994-1995 | **3 new** + **4 shared** = **7 total** | nwc-007 to nwc-009 (+ Course 2 staff) | Faculty/Directing Staff |
| Course 5 | 1996-1997 | **12** (1 shared) | nwc-011 to nwc-022 | Faculty/Directing Staff |

---

## UI DISPLAY RULES

### Course 1 should display:
- **Exactly 11 names** on the UI
- Filter by: `decoration LIKE 'NWC Course 1%'`
- Range: seniority_order 23-33
- Period: 1992-1993

### Course 2 should display:
- **6 staff members**
- Filter by: `decoration LIKE 'NWC Course 2%'`
- Range: seniority_order 1-6

### Course 3 should display:
- **3 staff members** (or 7 if including shared Course 2 faculty)
- Filter by: `decoration LIKE 'NWC Course 3%'`
- Range: seniority_order 7-9 (+ 1,2,3,6 if showing shared)

### Course 5 should display:
- **12 staff members**
- Filter by: `decoration LIKE 'NWC Course 5%'`
- Range: seniority_order 11-22

---

## DATABASE QUERY TO VERIFY

```sql
-- Show all NWC personnel grouped by course
SELECT 
  decoration,
  COUNT(*) as count,
  MIN(seniority_order) as min_order,
  MAX(seniority_order) as max_order,
  period_start,
  period_end
FROM personnel
WHERE decoration LIKE 'NWC%'
GROUP BY decoration, period_start, period_end
ORDER BY min_seniority_order;

-- Specifically for Course 1 (should show exactly 11)
SELECT 
  seniority_order,
  name,
  rank,
  service,
  period_start,
  period_end,
  decoration
FROM personnel
WHERE decoration LIKE 'NWC Course 1%'
ORDER BY seniority_order;
```

---

## SQL SEED FILE REFERENCE
- **File**: `nwc_personnel_sql_seed_trackable.sql`
- **Lines 23-30**: Course 1 Staff (8 members)
- **Lines 31-33**: Course 1 Exchange Officers (3 members)
- **Lines 1-6**: Course 2 Faculty (6 members)
- **Lines 7-9**: Course 3 Faculty (3 members)
- **Lines 11-22**: Course 5 Faculty (12 members)

---

## UI IMPLEMENTATION NOTES

The frontend code in `DirectingStaffByCourseYear.tsx` filters personnel by:
1. Checking `category === 'Directing Staff'` or `category === 'FDC'`
2. Parsing the `decoration` field for course/year information
3. For NWC: looks for patterns like "NWC Course 1", "NWC Course 2", etc.
4. Groups by year and course number for display

**To ensure Course 1 shows exactly 11 names:**
- Verify decoration field contains: `"NWC Course 1 Staff"` or `"NWC Course 1 Exchange"`
- Verify period_start = 1992 and period_end = 1993
- Query the database to confirm no duplicates exist
