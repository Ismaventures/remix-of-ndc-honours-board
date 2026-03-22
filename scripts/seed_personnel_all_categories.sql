-- Complete personnel seed for all categories: FWC, FDC, Directing Staff, Allied
-- Safe to run multiple times (uses UPSERT on id).

WITH
seed_data AS (
  SELECT
    ARRAY[
      'Adebayo O. Olukotun', 'Ibrahim M. Suleiman', 'Chukwuemeka A. Nwosu',
      'Yusuf B. Garba', 'Oluwaseun T. Adeyemi', 'Mohammed K. Abdullahi',
      'Emeka J. Okonkwo', 'Aliyu S. Danjuma', 'Tunde R. Akinwale',
      'Hassan A. Bello', 'Chijioke N. Eze', 'Abdulrahman I. Musa',
      'Kayode F. Ogunbiyi', 'Usman D. Shehu', 'Obiora C. Amadi',
      'Musa A. Yar''Adua', 'Festus O. Adekunle', 'Sani M. Abacha',
      'Rotimi P. Williams', 'Babatunde L. Akintola', 'Olusegun K. Lawal',
      'Garba T. Idris', 'Abubakar H. Waziri', 'Sylvester E. Umoh',
      'Daniel O. Obi', 'Aminu B. Kano', 'Peter C. Okafor',
      'Shehu U. Dikko', 'Boniface I. Nnaji', 'Lateef A. Jakande',
      'Theophilus Y. Danjuma', 'Muhammadu R. Buhari', 'Ike S. Nwachukwu',
      'Alani A. Akinrinade', 'Gibson S. Jalo', 'Oladipo D. Diya',
      'Alexander A. Ogomudia', 'Martin L. Agwai', 'Azubuike I. Ihejirika',
      'Kenneth T. Minimah'
    ]::text[] AS names,
    ARRAY[
      'General', 'Admiral', 'Air Chief Marshal',
      'Lieutenant General', 'Vice Admiral', 'Air Marshal',
      'Major General', 'Rear Admiral', 'Air Vice Marshal',
      'Brigadier General', 'Commodore', 'Air Commodore',
      'Colonel', 'Captain (Navy)', 'Group Captain'
    ]::text[] AS ranks,
    ARRAY['FWC', 'FDC', 'Directing Staff', 'Allied']::text[] AS categories,
    ARRAY['Army', 'Navy', 'Air Force']::text[] AS services,
    ARRAY[
      'Recognized for outstanding contributions to strategic leadership and national defence development.',
      'Distinguished service in fostering inter-service cooperation and joint military operations excellence.',
      'Exemplary dedication to the advancement of defence policy and strategic studies.',
      'Commended for exceptional leadership in promoting regional security cooperation.',
      'Noted for significant contributions to military doctrine and defence strategy formulation.',
      'Honored for outstanding commitment to training future defence leaders of Nigeria.'
    ]::text[] AS citations
),
records AS (
  SELECT
    'p-' || idx::text AS id,
    names[idx] AS name,
    ranks[((idx - 1) % array_length(ranks, 1)) + 1] AS rank,
    categories[((idx - 1) % array_length(categories, 1)) + 1] AS category,
    CASE
      WHEN categories[((idx - 1) % array_length(categories, 1)) + 1] = 'Allied' THEN 'Foreign'
      ELSE services[((idx - 1) % array_length(services, 1)) + 1]
    END AS service,
    1992 + floor((idx - 1) / 3.0)::int AS period_start,
    1994 + floor((idx - 1) / 3.0)::int AS period_end,
    NULL::text AS image_url,
    citations[((idx - 1) % array_length(citations, 1)) + 1] AS citation,
    ((idx - 1) % array_length(ranks, 1)) + 1 AS seniority_order
  FROM seed_data,
  generate_subscripts(names, 1) AS idx
)
INSERT INTO personnel (
  id,
  name,
  rank,
  category,
  service,
  period_start,
  period_end,
  image_url,
  citation,
  seniority_order
)
SELECT
  id,
  name,
  rank,
  category,
  service,
  period_start,
  period_end,
  image_url,
  citation,
  seniority_order
FROM records
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  rank = EXCLUDED.rank,
  category = EXCLUDED.category,
  service = EXCLUDED.service,
  period_start = EXCLUDED.period_start,
  period_end = EXCLUDED.period_end,
  image_url = EXCLUDED.image_url,
  citation = EXCLUDED.citation,
  seniority_order = EXCLUDED.seniority_order;
