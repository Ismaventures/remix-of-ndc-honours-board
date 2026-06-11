# Batch Image Upload & Personnel Editing Guide

## Overview

The enhanced batch image upload feature allows you to upload 10-15 images at once and then edit all associated personnel records in one streamlined workflow. This makes updating records faster and easier, especially when you have multiple photos with personnel needing record updates.

## Two-Step Workflow

### Step 1: Upload Images

1. **Access Batch Image Upload**
   - Go to Admin Panel → Personnel tab
   - Click "Manage Personnel"
   - Look for the batch upload option

2. **Add Images**
   - Drag and drop 10-15 images onto the upload area, OR
   - Click "Select Images" button and choose multiple files
   - Supported formats: JPG, PNG, WebP, GIF
   - Max 10MB per image
   - Can add more images later with "Add More" button

3. **Assign Personnel to Images**
   - Click on any image in the grid (left panel)
   - In the detail panel (right), select the personnel member from the dropdown
   - Repeat for each image
   - Stats show: Total Images / Assigned / Uploaded

4. **Upload to Storage**
   - Once all images are assigned to personnel
   - Click "Upload X Images" button
   - Wait for upload to complete (status icons show: ✓ success, ! error, ⟳ uploading)
   - Images are automatically stored in the database

### Step 2: Edit Personnel Records

After successful upload, you'll automatically move to the **Batch Edit Personnel Records** screen.

1. **Search for Personnel**
   - Use the search box to find personnel by name or rank
   - Results update in real-time

2. **Select Records for Bulk Editing**
   - Click checkbox next to any personnel to select them
   - Click "Select All" checkbox in the header to select all visible records
   - Selected records are highlighted in orange

3. **Bulk Edit Multiple Records**
   - When records are selected, a "Bulk Edit" section appears
   - Set common values that apply to all selected records:
     - Rank (Private, Captain, Colonel, General, etc.)
     - Category (FWC, FDC, Directing Staff, Allied)
     - Service (Nigerian Army, Navy, Air Force, Civilian, Foreign, etc.)
     - Seniority Order (numeric ranking)
   - These changes apply to all selected records instantly

4. **Edit Individual Records**
   - Click the Edit icon (✎) next to any personnel record
   - Full editing mode activates with all available fields:
     - Name
     - Rank
     - Category
     - Service
     - Start Year
     - End Year
     - Seniority Order
     - Citation (full text description)
     - Decoration/Honours
   - Click the checkmark icon when done editing

5. **Save All Changes**
   - Bottom right shows: "X record(s) ready to save"
   - Click "Save Changes" to commit all modifications to the database
   - Success message confirms the update

## Key Features

### Search & Filter
- Real-time search across all uploaded personnel
- Filter by name or military rank
- Easy to find specific personnel for targeted editing

### Bulk Operations
- Update same field for multiple records at once
- Select any combination of records (all, partial, or single)
- Saves time vs editing one-by-one

### All Editable Fields
Everything available in CSV batch upload is also available here:
- **Basic Info**: Name, Rank
- **Classification**: Category, Service
- **Timeline**: Period Start, Period End
- **Organization**: Seniority Order
- **Details**: Citation, Decoration/Honours
- **Media**: Image (automatically linked from upload)

### Image Preview
- See photo thumbnails next to each personnel record
- Verify correct person before saving changes

### Status Tracking
- Upload progress indicators for each image
- Success/error status visible throughout process
- Change indicators show which fields have been modified

## Common Workflows

### Scenario 1: Batch Update Course Info
1. Upload 12 photos of Course 3 Faculty
2. Select all uploaded personnel
3. Set Category to "FDC" and Service to "Nigerian Army"
4. Individually edit Name/Rank/Seniority
5. Save all at once

### Scenario 2: Update Mixed Officer Photos
1. Upload 8 photos of various officers
2. Assign each to correct personnel
3. Search for each officer individually
4. Edit specific fields (e.g., update decorations, seniority)
5. Save all changes

### Scenario 3: Correct Missing Information
1. Upload photos of officers needing data updates
2. Search for officers with incomplete records
3. Select multiple officers with same missing info
4. Bulk add missing fields (e.g., Citation)
5. Then individually edit unique information
6. Save complete records

## Tips for Best Results

### Before Upload
- ✓ Have images named or organized so you know who they show
- ✓ Pre-plan personnel assignments if you have many images
- ✓ Have up-to-date personnel database before starting

### During Upload
- ✓ Verify personnel assignments carefully
- ✓ Check image status (green checkmark = successful upload)
- ✓ Note any error messages and fix them before proceeding

### During Editing
- ✓ Search first to verify you have the right person
- ✓ Use bulk edit for fields that apply to groups (e.g., all same rank)
- ✓ Use individual edit for unique information per person
- ✓ Review changes before clicking "Save Changes"

### After Saving
- ✓ Personnel records are immediately updated in the database
- ✓ Images are linked to personnel profiles
- ✓ Changes are permanent (no undo)

## Limitations & Notes

- Maximum 15 images per batch (prevents overwhelming the interface)
- Images must be assigned to existing personnel
- Cannot create new personnel during image upload (create first, then upload)
- All changes are permanent once saved
- Image files must be valid formats (JPG, PNG, WebP, GIF)

## Troubleshooting

### Images Won't Upload
- Check file size (max 10MB each)
- Verify image format is supported
- Ensure personnel is properly assigned
- Check internet connection

### Can't Find Personnel
- Search is case-insensitive
- Try searching by rank instead of name
- Check if personnel is in the database already

### Changes Won't Save
- Verify all required fields are filled
- Check for validation errors highlighted in the form
- Ensure you're not offline
- Try saving fewer records at once

## Questions?

Refer to the Personnel Management documentation or contact your administrator for more help.
