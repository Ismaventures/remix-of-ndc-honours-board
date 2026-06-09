-- ============================================================
-- Populate CSE course designations for Directing Staff
-- Run this in Supabase SQL Editor to add CSE data
-- ============================================================

-- This creates CSE groupings based on period_end year
-- Automatically assigns course numbers within each year

-- UPDATE 1: Clear existing non-CSE decoration data for Directing Staff
UPDATE personnel
SET decoration = NULL
WHERE category = 'Directing Staff'
AND (decoration IS NULL OR decoration NOT LIKE 'CSE%');

-- UPDATE 2: Assign CSE designations
-- Group by period_end year, assign multiple courses if needed
WITH staff_ranked AS (
  SELECT 
    id,
    name,
    period_end,
    ROW_NUMBER() OVER (PARTITION BY period_end ORDER BY name) as seq_in_year
  FROM personnel
  WHERE category = 'Directing Staff'
),
staff_with_course AS (
  SELECT 
    id,
    period_end,
    CASE 
      WHEN seq_in_year <= 2 THEN 1
      WHEN seq_in_year <= 4 THEN 2
      WHEN seq_in_year <= 6 THEN 3
      ELSE 4
    END as course_num
  FROM staff_ranked
)
UPDATE personnel p
SET decoration = 'CSE ' || c.course_num || '/' || c.period_end
FROM staff_with_course c
WHERE p.id = c.id;

-- VERIFY: Show all Directing Staff with their new CSE designations
SELECT 
  name,
  rank,
  period_start,
  period_end,
  decoration,
  service
FROM personnel
WHERE category = 'Directing Staff'
ORDER BY period_end DESC, decoration, name;

-- SUMMARY: Show CSE groupings by year
SELECT 
  period_end as year,
  decoration,
  COUNT(*) as staff_count,
  STRING_AGG(name, ', ' ORDER BY name) as staff_members
FROM personnel
WHERE category = 'Directing Staff'
  AND decoration LIKE 'CSE%'
GROUP BY period_end, decoration
ORDER BY period_end DESC, decoration;

