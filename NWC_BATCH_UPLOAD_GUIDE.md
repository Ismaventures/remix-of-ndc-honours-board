# NWC Personnel Batch Upload - Quick Guide

## File Information
- **File:** `nwc_personnel_batch_upload.csv`
- **Total Records:** 33 personnel
- **Institution:** National War College (NWC), Nigeria
- **Year:** 1993
- **Source:** "THE WAY WE WERE" Volume 1

---

## Personnel Summary

### By Course/Role:
- **Course 2 & 3 Faculty:** 10 personnel
- **Course 5 Faculty:** 12 personnel
- **NWC Staff/Leadership:** 7 personnel
- **International Exchange Officers:** 3 personnel
- **Multiple Course Appearances:** 3 personnel (Laseinde in Courses 2,3,5; Ochoche in Courses 2,3; Abdulkadir in Courses 2,3; Yellow Duke in Courses 2,3)

### By Service:
- **Nigerian Army:** 18 personnel
- **Nigerian Navy:** 5 personnel
- **Nigerian Air Force:** 7 personnel
- **Civilian:** 1 personnel
- **Foreign:** 3 personnel (UK Exchange)

### By Rank Distribution:
- **Brigadier General:** 10 personnel
- **Colonel:** 7 personnel
- **Captain:** 4 personnel (1 Navy Captain, 3 unnamed captains)
- **Group Captain:** 3 personnel
- **Air Commodore:** 5 personnel
- **Commodore:** 3 personnel
- **Dr:** 1 personnel
- **Ambassador:** 1 personnel

---

## How to Upload

### Method 1: Using UnifiedPersonnelManagement Dashboard
1. Go to **Admin Panel** → **Personnel**
2. Click **"Manage Personnel"** button
3. Select **"Batch CSV"** upload option
4. Fill in course details:
   - **Classification:** FDC (Fellows of Directing Staff)
   - **Course Number:** 1993 (or use the year)
   - **Graduation Year:** 1993
5. Select this CSV file
6. Review personnel records
7. Click **"Upload"**

### Method 2: Direct File Selection
1. Use the batch upload feature from the Personnel section
2. Configure course information
3. Select `nwc_personnel_batch_upload.csv`
4. Proceed with upload

---

## Post-Upload Actions

### Admin Can Update:
- ✅ Period Start/End years (currently set to 1993)
- ✅ Specific course numbers per personnel
- ✅ Citation/Bio information (expand from brief)
- ✅ Add images via Batch Image Upload feature
- ✅ Adjust seniority order
- ✅ Correct any spelling or title details

### Personnel with Multiple Courses:
The decoration field shows all courses:
- **V O Laseinde:** NWC Course 2; Course 3; Course 5
- **S A Ochoche:** NWC Course 2; Course 3
- **Iba Yellow Duke:** NWC Course 2; Course 3
- **G Abdulkadir:** NWC Course 2; Course 3

These are seeded as single records with course history. Admin can edit to split if needed.

---

## Data Notes

### Post-Nominal Abbreviations (from source):
- **FSS:** Fellowship of the Senior Staff
- **psc:** Passed Staff College
- **fwc:** Fellow War College
- **mni:** Member of Nigerian Institute
- **rcds:** Royal College Defence Studies
- **B.Eng:** Bachelor of Engineering
- **MBA:** Master of Business Administration
- **OBE:** Order of the British Empire
- **(NN):** Nigerian Navy
- **(RN):** Royal Navy

*Note: Post-nominals are included in the citation for easy reference*

### Category Assignment:
- Most personnel assigned to **FDC** (Fellows of Directing Staff) as they were instructors/faculty
- Exchange officers assigned to **Directing Staff**
- Can be reclassified post-upload if needed

### Decoration Field Strategy:
- Contains course/role information for easy historical tracking
- Allows quick identification of personnel across multiple courses
- Supports historical documentation from "The Way We Were" publication

---

## Next Steps After Upload

1. **Add Images:**
   - Use **Batch Image Upload** feature
   - Assign personnel photos as they become available
   - Upload from NWC archives

2. **Expand Biographies:**
   - Edit each record to add full citations
   - Include service history details
   - Add decorations/honours received

3. **Verify Data:**
   - Review for any spelling corrections
   - Confirm year/period information
   - Validate seniority order rankings

4. **Link to Courses:**
   - Ensure all personnel appear under correct course categories
   - For multi-course attendees, verify appearance in all relevant sections

---

## File Format Details

**CSV Columns:**
1. Name - Personnel full name
2. Rank - Military rank or title
3. Category - Classification (FDC, Directing Staff)
4. Service - Military branch or Civilian/Foreign
5. Period Start - Start year
6. Period End - End year
7. Citation - Brief biography/role description
8. Decoration - Course/role history for reference
9. Seniority Order - Ranking in list (1=highest priority)

**Format Validation:**
- ✅ CSV UTF-8 encoding
- ✅ Standard comma separation
- ✅ No special characters that would break parsing
- ✅ Blank fields handled gracefully
- ✅ Ready for batch upload feature

---

## Support

If you need to:
- **Re-upload:** Just use the same CSV again with batch upload
- **Correct errors:** Edit in admin panel after upload
- **Add more records:** Create additional CSV with same format
- **Adjust grouping:** Use admin panel to reassign categories/courses
