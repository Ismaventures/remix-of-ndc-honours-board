-- NWC Personnel SQL Seed - Alternative Format with Trackable IDs
-- Use this version if you need to reference specific personnel IDs later
-- Replace the UUIDs with actual values from your database after insertion

-- First, get the UUIDs after insertion by querying:
-- SELECT id, name, rank, decoration FROM personnel WHERE decoration LIKE 'NWC%' ORDER BY seniority_order;

-- Then use them for updates, relationships, or image associations

INSERT INTO personnel (id, name, rank, category, service, period_start, period_end, citation, decoration, seniority_order) VALUES
-- COURSE 2 & 3 FACULTY
('nwc-001-laseinde', 'V O Laseinde', 'Captain', 'FDC', 'Nigerian Navy', 1993, 1994, 'Commanding Officer and Directing Staff member at National War College', 'NWC Course 2; Course 3; Course 5', 1),
('nwc-002-ochoche', 'S A Ochoche', 'Dr', 'FDC', 'Nigerian Army', 1993, 1994, 'Deputy Director Military Strategy and Directing Staff', 'NWC Course 2; Course 3', 2),
('nwc-003-yellowduke', 'Iba Yellow Duke', 'Colonel', 'FDC', 'Nigerian Army', 1993, 1994, 'Principal Staff Officer - Coordination', 'NWC Course 2; Course 3', 3),
('nwc-004-cole', 'S O Cole', 'Group Captain', 'FDC', 'Nigerian Air Force', 1993, 1994, 'Directing Staff member', 'NWC Course 2', 4),
('nwc-005-ojibara', 'S Y Ojibara', 'Group Captain', 'FDC', 'Nigerian Air Force', 1993, 1994, 'Directing Staff member', 'NWC Course 2', 5),
('nwc-006-abdulkadir', 'G Abdulkadir', 'Brigadier General', 'FDC', 'Nigerian Army', 1993, 1994, 'Deputy Commandant and Director of Studies', 'NWC Course 2; Course 3', 6),

-- COURSE 3 FACULTY
('nwc-007-suara', 'R.B. Suara', 'Air Commodore', 'FDC', 'Nigerian Air Force', 1994, 1995, 'Directing Staff member', 'NWC Course 3', 7),
('nwc-008-odedina', 'T. A. Odedina', 'Commodore', 'FDC', 'Nigerian Navy', 1994, 1995, 'Directing Staff member', 'NWC Course 3', 8),
('nwc-009-fayomi', 'A. O. Fayomi', 'Brigadier General', 'FDC', 'Nigerian Army', 1994, 1995, 'Course 3 Faculty', 'NWC Course 3', 9),

-- COURSE 5 FACULTY
('nwc-011-igoche', 'JI Igoche', 'Brigadier General', 'FDC', 'Nigerian Army', 1996, 1997, 'Course 5 Faculty', 'NWC Course 5', 11),
('nwc-012-ogundana', 'AO Ogundana', 'Air Commodore', 'FDC', 'Nigerian Air Force', 1996, 1997, 'Course 5 Faculty', 'NWC Course 5', 12),
('nwc-013-martins', 'E Martins', 'Ambassador', 'FDC', 'Civilian', 1996, 1997, 'Course 5 Faculty', 'NWC Course 5', 13),
('nwc-014-gbor', 'JW Gbor', 'Colonel', 'FDC', 'Nigerian Army', 1996, 1997, 'Course 5 Faculty', 'NWC Course 5', 14),
('nwc-015-edokpayi', 'JIO Edokpayi', 'Brigadier General', 'FDC', 'Nigerian Army', 1996, 1997, 'Course 5 Faculty', 'NWC Course 5', 15),
('nwc-016-enahoro', 'DO Enahoro', 'Brigadier General', 'FDC', 'Nigerian Army', 1996, 1997, 'Course 5 Faculty', 'NWC Course 5', 16),
('nwc-017-ogomudia', 'AO Ogomudia', 'Brigadier General', 'FDC', 'Nigerian Army', 1996, 1997, 'Course 5 Faculty', 'NWC Course 5', 17),
('nwc-018-okon', 'OE Okon', 'Brigadier General', 'FDC', 'Nigerian Army', 1996, 1997, 'Course 5 Faculty', 'NWC Course 5', 18),
('nwc-019-ogundele', 'B Ogundele', 'Commodore', 'FDC', 'Nigerian Navy', 1996, 1997, 'Course 5 Faculty', 'NWC Course 5', 19),
('nwc-020-abdulrahim', 'I A Abdulrahim', 'Air Commodore', 'FDC', 'Nigerian Air Force', 1996, 1997, 'Course 5 Faculty', 'NWC Course 5', 20),
('nwc-021-agboneni', 'G.O Agboneni', 'Air Commodore', 'FDC', 'Nigerian Air Force', 1996, 1997, 'Course 5 Faculty', 'NWC Course 5', 21),
('nwc-022-adedeji', 'AG Adedeji', 'Captain', 'FDC', 'Nigerian Navy', 1996, 1997, 'Course 5 Faculty', 'NWC Course 5', 22),

-- COURSE 1 STAFF & LEADERSHIP (1992-1993)
('nwc-023-momah', 'S Momah', 'Brigadier General', 'FDC', 'Nigerian Army', 1992, 1993, 'Staff Member - National War College', 'NWC Course 1 Staff', 23),
('nwc-024-tnadah', 'P Tnadah', 'Brigadier General', 'FDC', 'Nigerian Army', 1992, 1993, 'Staff Member - National War College', 'NWC Course 1 Staff', 24),
('nwc-025-george', 'O George', 'Commodore', 'FDC', 'Nigerian Navy', 1992, 1993, 'Staff Member - National War College', 'NWC Course 1 Staff', 25),
('nwc-026-ombu', 'EI Ombu', 'Air Commodore', 'FDC', 'Nigerian Air Force', 1992, 1993, 'Staff Member - National War College', 'NWC Course 1 Staff', 26),
('nwc-027-mohammed', 'A One Mohammed', 'Colonel', 'FDC', 'Nigerian Army', 1992, 1993, 'Staff Member - National War College', 'NWC Course 1 Staff', 27),
('nwc-028-olutumogun', 'EF Olutumogun', 'Colonel', 'FDC', 'Nigerian Army', 1992, 1993, 'Staff Member - National War College', 'NWC Course 1 Staff', 28),
('nwc-029-fagbemi-se', 'SE Fagbemi', 'Colonel', 'FDC', 'Nigerian Army', 1992, 1993, 'Director Military History and Research', 'NWC Course 1 Staff', 29),
('nwc-030-dule', 'SM Dule', 'Colonel', 'FDC', 'Nigerian Army', 1992, 1993, 'College Librarian', 'NWC Course 1 Staff', 30),

-- INTERNATIONAL EXCHANGE OFFICERS (COURSE 1)
('nwc-031-vellacott', 'RD Vellacott', 'Colonel', 'Directing Staff', 'Foreign', 1992, 1993, 'Exchange Officer - United Kingdom', 'NWC Course 1 Exchange', 31),
('nwc-032-ellison', 'Chris Ellison', 'Captain', 'Directing Staff', 'Foreign', 1992, 1993, 'Naval Exchange Officer - United Kingdom', 'NWC Course 1 Exchange', 32),
('nwc-033-delve', 'Delve', 'Group Captain', 'Directing Staff', 'Foreign', 1992, 1993, 'Air Force Exchange Officer - United Kingdom', 'NWC Course 1 Exchange', 33)
ON CONFLICT DO NOTHING;

-- NOTE: The ON CONFLICT DO NOTHING clause prevents errors if you run this script multiple times
-- If you use gen_random_uuid() instead, remove the ON CONFLICT clause

-- Retrieve inserted IDs for reference
-- SELECT id, name, rank, seniority_order FROM personnel WHERE decoration LIKE 'NWC%' ORDER BY seniority_order;
