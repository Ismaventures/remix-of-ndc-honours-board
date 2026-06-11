# SQL Seed Files - Quick Reference Guide

## 📁 Three SQL Seed Files Available

### 1. **nwc_personnel_supabase_seed.sql** ✅ RECOMMENDED
**Use this for Supabase SQL Editor**

**When to use:**
- You're using Supabase
- Want step-by-step instructions
- Need verification queries included
- Database generates IDs automatically

**How to use:**
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Create new query
4. Paste entire contents of this file
5. Click "Run"
6. Check results in Results tab

**Advantages:**
- ✅ Ready to copy-paste
- ✅ Includes verification queries
- ✅ Auto-generates UUIDs (safest)
- ✅ Includes cleanup queries
- ✅ Formatted for Supabase interface

---

### 2. **nwc_personnel_sql_seed.sql**
**Generic PostgreSQL format**

**When to use:**
- Using PostgreSQL directly (not Supabase)
- Need standard SQL syntax
- Want minimal comments

**How to use:**
```bash
psql -U username -d database_name < nwc_personnel_sql_seed.sql
```

Or paste into your SQL client.

**Details:**
- Uses `gen_random_uuid()` for ID generation
- Includes verification query comments
- Standard INSERT syntax

---

### 3. **nwc_personnel_sql_seed_trackable.sql**
**When you need specific, trackable IDs**

**When to use:**
- You need predictable IDs for reference
- Creating relationships with other tables
- Building image upload associations later
- Want to reference by custom ID names

**How to use:**
Same as option 2, paste into SQL client

**Details:**
- Uses explicit UUID format: `'nwc-001-laseinde'::uuid`
- All 33 personnel have custom IDs:
  - `nwc-001-laseinde`
  - `nwc-002-ochoche`
  - `nwc-003-yellowduke`
  - etc.
- Includes `ON CONFLICT DO NOTHING` for safe re-runs

**Example of using custom IDs:**
```sql
-- After import, you can reference by ID
SELECT * FROM personnel WHERE id = 'nwc-001-laseinde'::uuid;

-- Or update images:
UPDATE personnel SET image_url = 'path/to/image.jpg' 
WHERE id = 'nwc-001-laseinde'::uuid;
```

---

## 🚀 Step-by-Step: Using Supabase SQL Editor (EASIEST)

1. **Open Supabase Dashboard**
   - Navigate to your project

2. **Click "SQL Editor"** in left sidebar
   - Or go to "SQL" section

3. **Click "New Query"**
   - Opens blank editor

4. **Copy and paste this entire content:**
   ```
   [Paste contents of nwc_personnel_supabase_seed.sql]
   ```

5. **Click "Run" button** (top right)
   - Blue play button icon

6. **Wait for success message**
   - Should say "INSERT 0 33" or similar

7. **Verify with these queries:**
   ```sql
   -- Count records
   SELECT COUNT(*) FROM personnel WHERE decoration LIKE 'NWC%';
   
   -- View all inserted
   SELECT name, rank, service FROM personnel WHERE decoration LIKE 'NWC%' LIMIT 5;
   ```

---

## 📊 What Gets Inserted

| Field | Values |
|-------|--------|
| Total Records | 33 personnel |
| Category | FDC (28), Directing Staff (3) |
| Service | Nigerian Army (18), Navy (5), Air Force (7), Civilian (1), Foreign (3) |
| Year Range | 1993-1993 (editable) |
| Courses | Courses 2, 3, 5 |
| Image URLs | NULL (will add via Batch Image Upload) |

---

## ✅ Verification Checklist

After running INSERT:

- [ ] Total count is 33
- [ ] All services represented
- [ ] All ranks visible
- [ ] Decoration field has "NWC" prefix
- [ ] Seniority order 1-33
- [ ] No duplicate names
- [ ] All names match CSV

---

## ❌ If Something Goes Wrong

**Error: "Table does not exist"**
- Check table name is `personnel` (not `Personnel` or `staff`)
- Verify schema if using non-public schema

**Error: "Column does not exist"**
- Verify column names: `name`, `rank`, `category`, `service`, `period_start`, `period_end`, `citation`, `decoration`, `seniority_order`
- Check for custom field names in your schema

**Error: "Duplicate value"**
- Some records already exist
- Edit SQL to add `ON CONFLICT DO NOTHING` clause

**Success but 0 rows inserted**
- Check WHERE clause
- Run without WHERE to see all records

---

## 🔄 After Insertion

### Next Steps:
1. **Verify all 33 records inserted**
2. **Update years if needed** (all set to 1993)
3. **Add images via Batch Image Upload feature**
4. **Edit individual records to expand citations**
5. **Adjust seniority order if needed**

### Using Custom ID Format:
If you used trackable.sql, reference personnel by ID:
```sql
UPDATE personnel 
SET period_start = 1993, period_end = 1994
WHERE id = 'nwc-006-abdulkadir'::uuid;
```

---

## 📝 Summary

- **Easy (Recommended):** Use `nwc_personnel_supabase_seed.sql` → Paste in Supabase → Run
- **Trackable IDs:** Use `nwc_personnel_sql_seed_trackable.sql` if you need custom IDs
- **Generic SQL:** Use `nwc_personnel_sql_seed.sql` for standard PostgreSQL clients
