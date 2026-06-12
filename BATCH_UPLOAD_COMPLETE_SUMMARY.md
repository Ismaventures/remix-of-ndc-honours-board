# Comprehensive Batch Upload & Personnel Management Summary

## 📋 Overview

The NDC Honours Board application has a **complete batch upload system** for personnel records with CSV import, image handling, validation, and database integration. Personnel can be uploaded individually or in batches, with comprehensive editing capabilities afterward.

---

## 1️⃣ CURRENT BATCH CSV UPLOAD FEATURES

### Supported Fields (CSV Columns)

| Column | Header | Required | Format/Examples | Database Field |
|--------|--------|----------|-----------------|-----------------|
| A | Name | Yes | "General John Doe", "Captain Jane" | `name` |
| B | Rank | Yes | "General", "Colonel", "Major" | `rank` |
| C | Service | Yes | See valid services below | `service` |
| D | Citation | No | "Chief of Defense Staff", "Director" | `citation` |
| E | Seniority | No | 1, 2, 3 (ascending order) | `seniority_order` |
| F | Image | No | Filename only (e.g., "john-doe.jpg") | `image_url` (via file upload) |

### Valid Service Values (Strict Validation)
- Nigerian Army
- Nigerian Navy
- Nigerian Air Force
- Civilian
- Foreign
- Foreign Service
- Academic

### CSV Upload Configuration Requirements

When uploading a batch, you must specify:

1. **Course Classification** (dropdown):
   - Directing Staff
   - FDC (Fellows of Directing Staff Course)
   - FWC (Fellows of War College)
   - Allied

2. **Course Number** (integer):
   - Range: 1-999
   - Example: 1, 42, 100

3. **Graduation Year** (integer):
   - Range: 1900-2100
   - Used for: Period start and end dates in database

### Course Designation Format

The system automatically creates courses using the **CSE (Course Specification Entry)** format:
- **Database Storage**: `CSE {courseNumber}/{graduationYear}`
  - Example: `CSE 42/2020`
  - Stored in personnel `decoration` field for linking

- **UI Display**: `Course {courseNumber} – {graduationYear}`
  - Example: `Course 42 – 2020`

### Sample CSV Structure

```csv
Name,Rank,Service,Citation,Seniority,Image
"General John Eze Englebert Buratai","General","Nigerian Army","Chief of Defence Staff - Chief of Army Staff",1,"buratai-john.jpg"
"Air Marshal Oladayo Oladele","Air Marshal","Nigerian Air Force","Chief of Air Staff",2,"oladele-oladayo.jpg"
"Rear Admiral Mohammed Yunus","Rear Admiral","Nigerian Navy","Chief of Naval Staff",3,"yunus-mohammed.jpg"
"Professor Grace Adeyegun","Civilian","Civilian","Deputy Director Institute of Strategic Studies",4,"adeyegun-grace.jpg"
"Brigadier Ifeanyi Okonkwo","Brigadier General","Nigerian Army","Deputy Commandant",5,"okonkwo-ifeanyi.jpg"
```

### File Validation Rules

- **Accepted Formats**: .csv, .xlsx, .xls
- **Maximum Size**: 50MB
- **Column Headers Required**: First row must contain column names (Name, Rank, Service, Citation, Seniority, Image)
- **Encoding**: UTF-8 recommended for non-ASCII characters

### Batch Upload Constraints

- **Maximum Records Per Upload**: 500
- **Concurrent Upload Limit**: 5 records processed in parallel
- **Image File Size**: Max 10MB per image
- **Image Formats**: JPEG, PNG, WebP, GIF

### Field Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| Name | Required, non-empty | "Name is required" |
| Rank | Required, non-empty | "Rank is required" |
| Service | Required, must be in valid list | "Service '{value}' is not valid. Must be one of: ..." |
| Seniority | Optional, if provided must be non-negative integer | "Seniority order must be a non-negative number" |
| Citation | Optional, any text | (No validation) |
| Image | Optional filename reference | (No validation) |

---

## 2️⃣ BATCH IMAGE UPLOAD FUNCTIONALITY

### Separate Image Upload System (`BatchImageUpload.tsx`)

The batch image upload is **completely separate** from personnel CSV upload and allows uploading images for already-created personnel.

#### Key Features:

1. **Drag-and-Drop Upload**:
   - Drag images directly onto the upload area
   - Or click to open file picker

2. **Multi-Image Support**:
   - Upload multiple images in one session
   - View grid thumbnail preview of all images

3. **Personnel Assignment**:
   - Dropdown selector to assign each image to a personnel record
   - Shows: Rank + Name + Category format
   - Can assign images to existing personnel only

4. **Image Validation**:
   - **Formats**: JPEG, PNG, WebP, GIF
   - **Max Size**: 10MB per image
   - Files that don't meet criteria are silently skipped

5. **Batch Processing**:
   - Process multiple images sequentially
   - Track status: pending → uploading → success/error
   - Show real-time progress

#### Storage Details:

- **Bucket**: `personnel-images` (Supabase)
- **Path Format**: `personnel/{personnelId}-{timestamp}-{filename}`
- **URL Format**: `https://{supabaseUrl}/storage/v1/object/public/personnel-images/{filePath}`
- **Cache Control**: 3600 seconds (1 hour)
- **Upsert**: Enabled (overwrites existing images with same path)

#### UI Statistics:

Shows dashboard with:
- Total Images: Count of all uploaded images
- Assigned: Count of images with personnel selected
- Uploaded: Count of successfully uploaded images

---

## 3️⃣ PERSONNEL RECORD STRUCTURE

### Complete Personnel Interface

```typescript
interface Personnel {
  id: string;                    // UUID, auto-generated
  name: string;                  // Full name (required)
  rank: string;                  // Military/civilian rank (required)
  category: Category;            // FWC | FDC | Directing Staff | Allied | etc.
  service: Service;              // Nigerian Army | Navy | Air Force | Civilian | Foreign | Foreign Service | Academic
  periodStart: number;           // Year (e.g., 2020)
  periodEnd: number;             // Year (e.g., 2024)
  imageUrl?: string;             // URL to personnel image in Supabase
  citation: string;              // Bio/role description
  decoration?: string;           // CSE course code or honours (e.g., "CSE 42/2020")
  seniorityOrder: number;        // Display order (lower = higher priority)
}
```

### Data Storage (Supabase `personnel` table)

All batch uploads create records with these mapped fields:

| App Field | Database Column | Source |
|-----------|-----------------|--------|
| id | id | Auto-generated UUID |
| name | name | CSV Name column |
| rank | rank | CSV Rank column |
| category | category | BatchUploadConfig.courseClassification |
| service | service | CSV Service column |
| periodStart | period_start | BatchUploadConfig.graduationYear |
| periodEnd | period_end | BatchUploadConfig.graduationYear |
| imageUrl | image_url | From image upload (optional) |
| citation | citation | CSV Citation column (optional) |
| decoration | decoration | Generated CSE code (e.g., "CSE 42/2020") |
| seniorityOrder | seniority_order | CSV Seniority column (defaults to 0) |

---

## 4️⃣ CURRENT UI COMPONENTS FOR EDITING

### Unified Personnel Management (`UnifiedPersonnelManagement.tsx`)

**Primary admin interface** accessed from Admin Panel → Personnel tab → "Manage Personnel" button.

Features:
1. **Dashboard Overview**:
   - Total personnel count
   - Breakdown by category (FWC, FDC, Directing Staff, Allied)

2. **Three Upload Options**:
   - "Add Single" (Blue) - Manual single-person entry
   - "Batch CSV" (Orange) - CSV file upload with course configuration
   - "Batch Images" (Purple) - Assign images to existing personnel

3. **Category Breakdown**:
   - Expandable sections for each category
   - Lists all personnel in that category
   - Shows: Rank, Name, Service, Period, Decoration, Thumbnail
   - Sortable by seniority order

### Personnel Form (`PersonnelForm()`)

**Individual editing component** for creating/updating personnel records.

#### Editable Fields:

1. **Name** (text input, required)
2. **Rank** (text input, required)
3. **Category** (dropdown: FWC, FDC, Directing Staff, Allied)
4. **Service Branch** (dropdown: Nigerian Army, Navy, Air Force, Civilian, Foreign, Foreign Service, Academic)
5. **Period Start** (year, number input)
6. **Period End** (year, number input)
7. **Seniority Order** (number, 1=highest priority)
8. **Image URL** (text input, optional)
9. **Image Upload** (file picker, optional - supports image/*,.gif,.webp)
10. **Citation / Bio** (textarea, optional)
11. **Decoration / Honours** (text input, optional)

#### Form Capabilities:

- **Edit Existing**: Click Edit on any personnel record
- **Create New**: Click "Add First Record" or in unified management
- **Image Management**:
  - Paste URL directly
  - Upload image file (max 8MB)
  - Clear existing image
- **Validation**: Form prevents empty required fields
- **Save Options**: 
  - "Save Changes" (for updates)
  - "Create Record" (for new entries)
- **Cancel**: Discard changes and return to list

### Admin Panel Personnel Tab

**Main personnel list interface** with:

1. **Search & Filter**:
   - Search by: name, rank, category, service, year
   - Filter by category (All, FWC, FDC, Directing Staff, Allied)

2. **Personnel List Table**:
   - Columns: Name, Category, Rank
   - Click row to view full details
   - Hover to show Edit/Delete buttons

3. **Full Profile View**:
   - Read-only display of all personnel fields
   - Edit/Delete buttons
   - "Back to List" navigation

4. **Batch Selection** (for Commandants only):
   - Not currently implemented for personnel
   - Available for commandants with bulk edit capability

---

## 5️⃣ WHERE EDITING CAPABILITIES ARE DEFINED

### Component Files:

1. **[AdminPanel.tsx](src/components/AdminPanel.tsx)** (Line 2631+)
   - `PersonnelForm()` function
   - All field definitions and validation
   - Image upload handlers
   - Form submission logic

2. **[UnifiedPersonnelManagement.tsx](src/components/UnifiedPersonnelManagement.tsx)**
   - Main dashboard for personnel management
   - Integrates all three upload modes
   - Category breakdown display
   - Personnel stats

3. **[BatchUploadForm.tsx](src/components/BatchUploadForm.tsx)**
   - CSV upload configuration form
   - Course classification, number, year inputs
   - File upload validation

4. **[BatchPersonnelUploadTable.tsx](src/components/BatchPersonnelUploadTable.tsx)**
   - Preview and validation of CSV records
   - Row-by-row error display
   - Selection checkboxes before upload
   - Statistics dashboard

5. **[BatchImageUpload.tsx](src/components/BatchImageUpload.tsx)**
   - Drag-drop image upload interface
   - Personnel assignment dropdown
   - Image preview grid
   - Progress tracking

### Type Definitions:

1. **[src/types/domain.ts](src/types/domain.ts)** (Line 24+)
   - `Personnel` interface definition
   - All personnel field types
   - Category and Service type unions

2. **[src/types/batchUpload.ts](src/types/batchUpload.ts)**
   - `BatchUploadConfig`: Course configuration
   - `BatchPersonnelRecord`: Individual upload record
   - `BatchUploadResult`: Upload outcome
   - CSV mapping configuration
   - Upload constraints

### Utility Functions:

1. **[src/lib/batchUploadUtils.ts](src/lib/batchUploadUtils.ts)**
   - `parseCSV()`: Parse CSV into records
   - `validatePersonnelRecord()`: Validate individual fields
   - `validateBatchRecords()`: Batch validation
   - `generateCSEDecoration()`: Create "CSE X/YYYY" format
   - `generateCourseDesignation()`: Create "Course X – YYYY" format
   - `generateCourseId()`: Generate unique course ID

2. **[src/lib/batchUploadDb.ts](src/lib/batchUploadDb.ts)**
   - `uploadBatchPersonnel()`: Database insertion
   - `uploadPersonnelImage()`: Image storage
   - `uploadPersonnelRecord()`: Individual record upload
   - `getPersonnelImageUrl()`: Generate public URLs

---

## 6️⃣ EDITING WORKFLOW

### Current Editing Process:

1. **Access Admin Panel**:
   - Login as admin
   - Click "Personnel" tab
   - Click "Manage Personnel"

2. **View & Select**:
   - Browse personnel list
   - Search/filter as needed
   - Click on person to view full profile

3. **Edit Record**:
   - Click "Edit Profile" button
   - PersonnelForm opens with all fields pre-populated
   - Modify desired fields
   - Click "Save Changes"

4. **Update Image**:
   - Use Image URL field to link image
   - Or use "Upload Image" button to upload file
   - Saves image to Supabase storage
   - Updates personnel record with image_url

5. **Delete (if needed)**:
   - Click "Delete" button from profile view
   - Record removed from database

### What CAN Be Edited After Batch Upload:

✅ All fields are fully editable:
- Name
- Rank
- Category
- Service
- Period (Start/End years)
- Seniority Order
- Citation/Bio
- Image (URL or file)
- Decoration/Honours

### What CANNOT Be Changed:

❌ Personnel ID (system-generated UUID)

---

## 7️⃣ LIMITATIONS & CONSTRAINTS

### Batch Upload Limitations:

| Limitation | Impact |
|-----------|--------|
| CSV only (or Excel as CSV) | Cannot upload other formats directly |
| No duplicate detection | Will create duplicates if same names uploaded twice |
| Fixed course classification | All uploaded records have same category (configure per upload) |
| Image filename mapping | Images must be referenced in CSV by filename; actual files uploaded separately |
| Single graduation year per batch | All records in one batch get same period_start and period_end |

### Editing Limitations:

| Limitation | Impact |
|-----------|--------|
| No bulk edit interface | Must edit personnel one at a time |
| No history/audit trail | No record of changes made |
| No rollback capability | Deleted records are permanent |
| Image replacement | Uploading new image overwrites old one (Supabase upsert) |

### Performance Constraints:

| Constraint | Value |
|-----------|-------|
| Max records per upload | 500 |
| Concurrent uploads | 5 at a time |
| CSV file size | 50MB max |
| Image file size | 10MB max per image |
| Database response time | No specified SLA |

---

## 8️⃣ DATABASE SCHEMA REFERENCE

### Personnel Table (Supabase)

```sql
CREATE TABLE personnel (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  rank TEXT NOT NULL,
  category TEXT NOT NULL, -- 'Directing Staff', 'FDC', 'FWC', 'Allied', etc.
  service TEXT NOT NULL, -- 'Nigerian Army', 'Nigerian Navy', 'Nigerian Air Force', 'Civilian', 'Foreign', 'Foreign Service', 'Academic'
  period_start INTEGER NOT NULL, -- Year
  period_end INTEGER NOT NULL, -- Year
  image_url TEXT, -- Supabase storage public URL
  citation TEXT, -- Bio/role description
  decoration TEXT, -- CSE code, e.g., "CSE 42/2020"
  seniority_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### Image Storage (Supabase)

- **Bucket**: `personnel-images`
- **Path**: `personnel/{personnelId}-{timestamp}-{filename}`
- **Access**: Public (readable via generated URL)
- **Cache**: 1 hour (3600 seconds)

---

## 9️⃣ FEATURE INTEGRATION

### How Batch Personnel Appear in UI:

1. **Directing Staff Section**:
   - Category "Directing Staff" → Shows in this section
   - Sorted by seniority order

2. **Fellows Categories**:
   - Category "FWC" → Shows in Fellows of War College
   - Category "FDC" → Shows in Fellows of Directing Staff Course
   - Category "Allied" → Shows in Allied Officers

3. **Course Organization**:
   - CSE decoration (`decoration` field) links personnel to course
   - UI reads decoration to group by course
   - Course designation auto-generated from CSE code

4. **Search & Filter**:
   - All fields searchable in admin panel
   - Category-based filtering available
   - Year ranges filterable

---

## 🔟 ADMIN PANEL NAVIGATION

### How to Access Batch Upload:

```
Home → Admin Panel
├── Personnel Tab (left sidebar)
│   └── "Manage Personnel" button
│       └── UnifiedPersonnelManagement
│           ├── Add Single (Blue card)
│           ├── Batch CSV (Orange card)
│           └── Batch Images (Purple card)
```

### Related Admin Features:

- **Theme Settings**: Change visual appearance
- **Transitions**: Configure auto-display behavior
- **Audio**: Configure background music
- **Device Control**: Multi-screen management
- **Commandants**: Separate management interface
- **Visits**: Distinguished visits records

---

## QUICK REFERENCE: CSV TEMPLATE

```csv
Name,Rank,Service,Citation,Seniority,Image
"Rank Title First Last","Rank","Service","Role/Position",1,"optional-filename.jpg"
"General John Doe","General","Nigerian Army","Chief of Defence Staff",1,"doe-john.jpg"
"Colonel Jane Smith","Colonel","Nigerian Army","Deputy Director",2,"smith-jane.jpg"
"Air Marshal Ahmed Khan","Air Marshal","Nigerian Air Force","Chief of Air Staff",3,"khan-ahmed.jpg"
"Rear Admiral Mary Johnson","Rear Admiral","Nigerian Navy","Commander Naval Operations",4,"johnson-mary.jpg"
"Dr. Emmanuel Okafor","Civilian","Civilian","Director of Studies",5,"okafor-emmanuel.jpg"
```

---

## CONCLUSION

The NDC Honours Board application provides a **complete batch upload system** with:
- ✅ CSV batch import with flexible column mapping
- ✅ Individual image upload with personnel assignment
- ✅ Comprehensive data validation
- ✅ Full editing capabilities post-upload
- ✅ Course organization and automatic categorization
- ✅ Multi-image batch processing
- ✅ Supabase storage integration
- ✅ Real-time progress tracking

All editable fields are documented, validation rules are strict, and the UI provides clear feedback for both successful uploads and errors.
