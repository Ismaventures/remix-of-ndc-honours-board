-- Curated personnel seed from user-provided chronicles text.
-- Categories mapped as: FWC, FDC, Directing Staff, Allied.
-- Safe to rerun via UPSERT on id.

WITH seed_data AS (
	SELECT * FROM (VALUES
		-- Allied Officers
		('p-allied-001', 'DJ Ralls (UK)', 'Brig Gen', 'Allied', 'Foreign', 1992, 1993, NULL, 'Allied Officers list.', 1),
		('p-allied-002', 'Vellacott (UK)', 'Col', 'Allied', 'Foreign', 1992, 1994, NULL, 'Allied Officers list.', 2),
		('p-allied-003', 'CV Ellison (UK)', 'Capt', 'Allied', 'Foreign', 1992, 1994, NULL, 'Allied Officers list.', 3),
		('p-allied-004', 'H. Delve (UK)', 'Gp Capt', 'Allied', 'Foreign', 1992, 1994, NULL, 'Allied Officers list.', 4),

		-- Distinguished Fellow of the Defence College (FDC+)
		('p-fdc-001', 'GS Akunwafor', 'Amb', 'FDC', 'Foreign', 2003, 2008, NULL, 'Distinguished Fellow of the Defence College (FDC+).', 1),
		('p-fdc-002', 'MD Isah', 'Brig Gen', 'FDC', 'Army', 2006, 2008, NULL, 'Distinguished Fellow of the Defence College (FDC+).', 2),
		('p-fdc-003', 'MN Ekwere', 'Air Cdre', 'FDC', 'Air Force', 2006, 2008, NULL, 'Distinguished Fellow of the Defence College (FDC+).', 3),
		('p-fdc-004', 'I. Salihu', 'Air Cdre', 'FDC', 'Air Force', 2007, 2008, NULL, 'Distinguished Fellow of the Defence College (FDC+).', 4),
		('p-fdc-005', 'OO Olawunmi', 'Cdre', 'FDC', 'Navy', 2007, 2008, NULL, 'Distinguished Fellow of the Defence College (FDC+).', 5),
		('p-fdc-006', 'MF Daniel', 'Cdre', 'FDC', 'Navy', 2007, 2008, NULL, 'Distinguished Fellow of the Defence College (FDC+).', 6),
		('p-fdc-007', 'DJ Ezeoba', 'Cdre', 'FDC', 'Navy', 2007, 2008, NULL, 'Distinguished Fellow of the Defence College (FDC+).', 7),
		('p-fdc-008', 'IA Shomade', 'Air Cdre', 'FDC', 'Air Force', 2007, 2008, NULL, 'Distinguished Fellow of the Defence College (FDC+).', 8),
		('p-fdc-016', 'OB Ogunjimi', 'Cdre', 'FDC', 'Navy', 2007, 2009, NULL, 'Distinguished Fellow of the Defence College (FDC+).', 16),
		('p-fdc-017', 'AS Badeh', 'Air Cdre', 'FDC', 'Air Force', 2008, 2009, NULL, 'Distinguished Fellow of the Defence College (FDC+).', 17),

		-- Chronicle of Directing Staff
		('p-ds-023', 'TT Waya', 'Brig Gen', 'Directing Staff', 'Army', 2008, 2010, NULL, 'Chronicle of Directing Staff.', 23),
		('p-ds-024', 'SU Chinweuba', 'Cdre', 'Directing Staff', 'Navy', 2008, 2010, NULL, 'Chronicle of Directing Staff.', 24),
		('p-ds-033', 'JM Gbum', 'Air Cdre', 'Directing Staff', 'Air Force', 2009, 2010, NULL, 'Chronicle of Directing Staff.', 33),
		('p-ds-047', 'IS Zabadi', 'Prof', 'Directing Staff', 'Civilian', 2009, 2013, NULL, 'Chronicle of Directing Staff.', 47),
		('p-ds-053', 'CEO Oyebade', 'Brig Gen', 'Directing Staff', 'Army', 2010, 2012, NULL, 'Chronicle of Directing Staff.', 53),
		('p-ds-115', 'SO Olabanji', 'Brig Gen', 'Directing Staff', 'Army', 2014, 2016, NULL, 'Chronicle of Directing Staff.', 115),
		('p-ds-122', 'US Mohammed', 'Brig Gen', 'Directing Staff', 'Army', 2015, 2015, NULL, 'Chronicle of Directing Staff.', 122),
		('p-ds-163', 'TI Sampson', 'Dr', 'Directing Staff', 'Civilian', 2017, 2019, NULL, 'Chronicle of Directing Staff.', 163),
		('p-ds-172', 'HD Zakaria', 'Cdre', 'Directing Staff', 'Navy', 2018, 2020, NULL, 'Chronicle of Directing Staff.', 172),

		-- Distinguished Fellow of the War College (FWC+)
		('p-fwc-001', 'JAJ Femi', 'Air Cdre', 'FWC', 'Air Force', 1992, 1993, NULL, 'Distinguished Fellow of the War College (FWC+).', 1),
		('p-fwc-002', 'DAB Mark', 'Brig Gen', 'FWC', 'Army', 1992, 1993, NULL, 'Distinguished Fellow of the War College (FWC+).', 2),
		('p-fwc-003', 'FBI Porbeni', 'Cdre', 'FWC', 'Navy', 1992, 1994, NULL, 'Distinguished Fellow of the War College (FWC+).', 3),
		('p-fwc-004', 'VN Omozokpia', 'Air Cdre', 'FWC', 'Air Force', 1992, 1993, NULL, 'Distinguished Fellow of the War College (FWC+).', 4),
		('p-fwc-005', 'EF Olutunmogun', 'Brig Gen', 'FWC', 'Army', 1992, 1994, NULL, 'Distinguished Fellow of the War College (FWC+).', 5),
		('p-fwc-006', 'PBT Tnadah', 'Brig Gen', 'FWC', 'Army', 1992, 1994, NULL, 'Distinguished Fellow of the War College (FWC+).', 6),
		('p-fwc-007', 'EI Ombu', 'Air Cdre', 'FWC', 'Air Force', 1992, 1995, NULL, 'Distinguished Fellow of the War College (FWC+).', 7),
		('p-fwc-008', 'I. Martins', 'Amb', 'FWC', 'Foreign', 1992, 2001, NULL, 'Distinguished Fellow of the War College (FWC+).', 8),
		('p-fwc-009', 'I. Ogohi', 'Cdre', 'FWC', 'Navy', 1992, 1994, NULL, 'Distinguished Fellow of the War College (FWC+).', 9),
		('p-fwc-010', 'SI Momah', 'Brig Gen', 'FWC', 'Army', 1993, 1994, NULL, 'Distinguished Fellow of the War College (FWC+).', 10),
		('p-fwc-038', 'MC Osahor', 'Brig Gen', 'FWC', 'Army', 1999, 2001, NULL, 'Distinguished Fellow of the War College (FWC+).', 38),
		('p-fwc-039', 'BO Obadan', 'Air Cdre', 'FWC', 'Air Force', 1999, 2001, NULL, 'Distinguished Fellow of the War College (FWC+).', 39),
		('p-fwc-040', 'AAU Kama', 'Brig Gen', 'FWC', 'Army', 1999, 1999, NULL, 'Distinguished Fellow of the War College (FWC+).', 40),
		('p-fwc-058', 'OA Azazi', 'Brig Gen', 'FWC', 'Army', 2001, 2003, NULL, 'Distinguished Fellow of the War College (FWC+).', 58),
		('p-fwc-073', 'AA Ilogho', 'Brig Gen', 'FWC', 'Army', 2003, 2006, NULL, 'Distinguished Fellow of the War College (FWC+).', 73),
		('p-fwc-074', 'F. Sulyman', 'Air Cdre', 'FWC', 'Air Force', 2003, 2006, NULL, 'Distinguished Fellow of the War College (FWC+).', 74),
		('p-fwc-080', 'AB Dambazau', 'Brig Gen', 'FWC', 'Army', 2004, 2006, NULL, 'Distinguished Fellow of the War College (FWC+).', 80)
	) AS t(
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
	CASE
		WHEN lower(category) IN ('directing staff', 'staff') THEN
			name || ' served on the Directing Staff from ' || period_start || ' to ' || period_end || ', supporting leadership development and professional military education.'
		WHEN lower(category) IN ('fwc', 'fwc+') THEN
			name || ' was recognized in the War College cohort and served from ' || period_start || ' to ' || period_end || ', contributing to strategic defence learning.'
		WHEN lower(category) IN ('fdc', 'fdc+') THEN
			name || ' served in the Defence College era from ' || period_start || ' to ' || period_end || ', contributing to higher defence and policy studies.'
		WHEN lower(category) = 'allied' THEN
			name || ' served as an Allied Officer from ' || period_start || ' to ' || period_end || ', supporting international military cooperation at the College.'
		ELSE
			name || ' served as ' || rank || ' in ' || category || ' from ' || period_start || ' to ' || period_end || '.'
	END AS citation,
	seniority_order
FROM seed_data
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

-- Supplemental manually verified entries.
-- Inserts only records whose names are not already present in this file/database.
WITH manual_verified AS (
	SELECT * FROM (VALUES
		('p-001', 'JAJ Femi', 'Air Commodore', 'fwc+', 'Air Force', 1992, 1993, NULL::text, 'Manual verification (Chronicle images).', 1),
		('p-002', 'DAB Mark', 'Brigadier General', 'fwc+', 'Army', 1992, 1993, NULL::text, 'Manual verification (Chronicle images).', 2),
		('p-003', 'FBI Porbeni', 'Commodore', 'fwc+', 'Navy', 1992, 1994, NULL::text, 'Manual verification (Chronicle images).', 3),
		('p-008', 'I Martins', 'Ambassador', 'fwc+', 'Foreign Service', 1992, 2001, NULL::text, 'Manual verification (Chronicle images).', 8),
		('p-058', 'OA Azazi', 'Brigadier General', 'fwc+', 'Army', 2001, 2003, NULL::text, 'Manual verification (Chronicle images).', 58),
		('p-fdc-001', 'GS Akunwafor', 'Ambassador', 'fdc+', 'Foreign Service', 2003, 2008, NULL::text, 'Manual verification (Chronicle images).', 1),
		('p-fdc-002', 'MD Isah', 'Brigadier General', 'fdc+', 'Army', 2006, 2008, NULL::text, 'Manual verification (Chronicle images).', 2),
		('p-fdc-007', 'DJ Ezeoba', 'Commodore', 'fdc+', 'Navy', 2007, 2008, NULL::text, 'Manual verification (Chronicle images).', 7),
		('p-fdc-017', 'AS Badeh', 'Air Commodore', 'fdc+', 'Air Force', 2008, 2009, NULL::text, 'Manual verification (Chronicle images).', 17),
		('p-staff-033', 'JM Gbum', 'Air Commodore', 'Staff', 'Air Force', 2009, 2010, NULL::text, 'Manual verification (Chronicle images).', 33),
		('p-staff-047', 'IS Zabadi', 'Professor', 'Staff', 'Academic', 2009, 2013, NULL::text, 'Manual verification (Chronicle images).', 47),
		('p-staff-053', 'CEO Oyebade', 'Brigadier General', 'Staff', 'Army', 2010, 2012, NULL::text, 'Manual verification (Chronicle images).', 53),
		('p-staff-115', 'SO Olabanji', 'Brigadier General', 'Staff', 'Army', 2014, 2016, NULL::text, 'Manual verification (Chronicle images).', 115),
		('p-staff-163', 'TI Sampson', 'Doctor', 'Staff', 'Academic', 2017, 2019, NULL::text, 'Manual verification (Chronicle images).', 163),
		('p-staff-172', 'HD Zakaria', 'Commodore', 'Staff', 'Navy', 2018, 2020, NULL::text, 'Manual verification (Chronicle images).', 172)
	) AS t(
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
	m.id,
	m.name,
	m.rank,
	m.category,
	m.service,
	m.period_start,
	m.period_end,
	m.image_url,
	CASE
		WHEN lower(m.category) IN ('directing staff', 'staff') THEN
			m.name || ' served on the Directing Staff from ' || m.period_start || ' to ' || m.period_end || ', supporting leadership development and professional military education.'
		WHEN lower(m.category) IN ('fwc', 'fwc+') THEN
			m.name || ' was recognized in the War College cohort and served from ' || m.period_start || ' to ' || m.period_end || ', contributing to strategic defence learning.'
		WHEN lower(m.category) IN ('fdc', 'fdc+') THEN
			m.name || ' served in the Defence College era from ' || m.period_start || ' to ' || m.period_end || ', contributing to higher defence and policy studies.'
		WHEN lower(m.category) = 'allied' THEN
			m.name || ' served as an Allied Officer from ' || m.period_start || ' to ' || m.period_end || ', supporting international military cooperation at the College.'
		ELSE
			m.name || ' served as ' || m.rank || ' in ' || m.category || ' from ' || m.period_start || ' to ' || m.period_end || '.'
	END AS citation,
	m.seniority_order
FROM manual_verified m
WHERE NOT EXISTS (
	SELECT 1
	FROM personnel p
	WHERE lower(regexp_replace(p.name, '[^a-z0-9]', '', 'g')) = lower(regexp_replace(m.name, '[^a-z0-9]', '', 'g'))
)
ON CONFLICT (id) DO NOTHING;

