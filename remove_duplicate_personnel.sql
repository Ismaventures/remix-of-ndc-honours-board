-- Script to identify and remove duplicate personnel entries
-- SITUATION: Every person appears TWICE - once with UUID, once with trackable ID (nwc-xxx)
-- SOLUTION: Delete all UUID entries, keep trackable IDs (nwc-xxx format)
-- Run each step separately in Supabase SQL Editor

-- ============================================================================
-- STEP 1: View all duplicates before deletion
-- ============================================================================
-- Copy and run this code first to see which names are duplicated
-- Then review the results before proceeding to STEP 2

SELECT 
  name, 
  COUNT(*) as count,
  STRING_AGG(id, ' | ') as all_ids,
  STRING_AGG(CASE WHEN id LIKE 'nwc-%' THEN 'TRACKABLE' ELSE 'UUID' END, ' | ') as id_types
FROM personnel
WHERE decoration LIKE 'NWC%'
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY name;


-- ============================================================================
-- STEP 2a: Show which UUIDs will be deleted
-- ============================================================================
-- Run this to preview which duplicate UUID entries will be removed
-- These are the ones that DON'T have the nwc-xxx trackable ID format

SELECT 
  id,
  name,
  rank,
  seniority_order,
  decoration
FROM personnel
WHERE decoration LIKE 'NWC%'
  AND id NOT LIKE 'nwc-%'
ORDER BY seniority_order;

-- Count: Should show ~27 UUID entries to delete


-- ============================================================================
-- STEP 2b: DELETE all UUID duplicates (keep trackable nwc-xxx IDs)
-- ============================================================================
-- Only run this AFTER reviewing STEP 2a results
-- This will DELETE all UUID entries and KEEP the nwc-xxx trackable IDs

DELETE FROM personnel 
WHERE decoration LIKE 'NWC%'
  AND id NOT LIKE 'nwc-%';

-- Result message should show: X rows affected


-- ============================================================================
-- STEP 3: Verify ALL duplicates are removed
-- ============================================================================
-- Run this after STEP 2b to confirm all duplicates are gone
-- If result is EMPTY = success! If showing names = more duplicates exist

SELECT 
  name, 
  COUNT(*) as count,
  STRING_AGG(id, ', ') as remaining_ids
FROM personnel
WHERE decoration LIKE 'NWC%'
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY name;

-- If empty result above = all duplicates removed successfully!
-- Congratulations! ✓


-- ============================================================================
-- STEP 4: View final NWC personnel count and all remaining entries
-- ============================================================================
-- Run this to see final unique NWC personnel after deduplication

SELECT 
  COUNT(*) as total_nwc_personnel,
  COUNT(DISTINCT name) as unique_names
FROM personnel
WHERE decoration LIKE 'NWC%';

-- List all remaining NWC personnel in order (should be ~33 entries, all with nwc-xxx IDs)
SELECT 
  seniority_order,
  id,
  name,
  rank,
  category,
  service,
  period_start,
  period_end,
  decoration
FROM personnel
WHERE decoration LIKE 'NWC%'
ORDER BY seniority_order;
