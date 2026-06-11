-- NWC Personnel Batch Insert SQL
-- National War College (NWC) Nigeria - Personnel Database Seed
-- Year: 1993
-- Source: "THE WAY WE WERE" Volume 1

-- Insert 33 personnel records into the personnel table
-- Note: Adjust table name and schema as needed for your setup

INSERT INTO personnel (id, name, rank, category, service, period_start, period_end, citation, decoration, seniority_order)
VALUES
  (gen_random_uuid(), 'V O Laseinde', 'Captain', 'FDC', 'Nigerian Navy', 1993, 1993, 'Commanding Officer and Directing Staff member at National War College', 'NWC Course 2; Course 3; Course 5', 1),
  (gen_random_uuid(), 'S A Ochoche', 'Dr', 'FDC', 'Nigerian Army', 1993, 1993, 'Deputy Director Military Strategy and Directing Staff', 'NWC Course 2; Course 3', 2),
  (gen_random_uuid(), 'Iba Yellow Duke', 'Colonel', 'FDC', 'Nigerian Army', 1993, 1993, 'Principal Staff Officer - Coordination', 'NWC Course 2; Course 3', 3),
  (gen_random_uuid(), 'S O Cole', 'Group Captain', 'FDC', 'Nigerian Air Force', 1993, 1993, 'Directing Staff member', 'NWC Course 2', 4),
  (gen_random_uuid(), 'S Y Ojibara', 'Group Captain', 'FDC', 'Nigerian Air Force', 1993, 1993, 'Directing Staff member', 'NWC Course 2', 5),
  (gen_random_uuid(), 'G Abdulkadir', 'Brigadier General', 'FDC', 'Nigerian Army', 1993, 1993, 'Deputy Commandant and Director of Studies', 'NWC Course 2; Course 3', 6),
  (gen_random_uuid(), 'R.B. Suara', 'Air Commodore', 'FDC', 'Nigerian Air Force', 1993, 1993, 'Directing Staff member', 'NWC Course 3', 7),
  (gen_random_uuid(), 'T. A. Odedina', 'Commodore', 'FDC', 'Nigerian Navy', 1993, 1993, 'Directing Staff member', 'NWC Course 3', 8),
  (gen_random_uuid(), 'A. O. Fayomi', 'Brigadier General', 'FDC', 'Nigerian Army', 1993, 1993, 'Course 3 Faculty', 'NWC Course 3', 9),
  (gen_random_uuid(), 'M Fagbemi', 'Colonel', 'FDC', 'Nigerian Army', 1993, 1993, 'Deputy Director Military History', 'NWC Course 3', 10),
  (gen_random_uuid(), 'JI Igoche', 'Brigadier General', 'FDC', 'Nigerian Army', 1993, 1993, 'Course 5 Faculty', 'NWC Course 5', 11),
  (gen_random_uuid(), 'AO Ogundana', 'Air Commodore', 'FDC', 'Nigerian Air Force', 1993, 1993, 'Course 5 Faculty', 'NWC Course 5', 12),
  (gen_random_uuid(), 'E Martins', 'Ambassador', 'FDC', 'Civilian', 1993, 1993, 'Course 5 Faculty', 'NWC Course 5', 13),
  (gen_random_uuid(), 'JW Gbor', 'Colonel', 'FDC', 'Nigerian Army', 1993, 1993, 'Course 5 Faculty', 'NWC Course 5', 14),
  (gen_random_uuid(), 'JIO Edokpayi', 'Brigadier General', 'FDC', 'Nigerian Army', 1993, 1993, 'Course 5 Faculty', 'NWC Course 5', 15),
  (gen_random_uuid(), 'DO Enahoro', 'Brigadier General', 'FDC', 'Nigerian Army', 1993, 1993, 'Course 5 Faculty', 'NWC Course 5', 16),
  (gen_random_uuid(), 'AO Ogomudia', 'Brigadier General', 'FDC', 'Nigerian Army', 1993, 1993, 'Course 5 Faculty', 'NWC Course 5', 17),
  (gen_random_uuid(), 'OE Okon', 'Brigadier General', 'FDC', 'Nigerian Army', 1993, 1993, 'Course 5 Faculty', 'NWC Course 5', 18),
  (gen_random_uuid(), 'B Ogundele', 'Commodore', 'FDC', 'Nigerian Navy', 1993, 1993, 'Course 5 Faculty', 'NWC Course 5', 19),
  (gen_random_uuid(), 'I A Abdulrahim', 'Air Commodore', 'FDC', 'Nigerian Air Force', 1993, 1993, 'Course 5 Faculty', 'NWC Course 5', 20),
  (gen_random_uuid(), 'G.O Agboneni', 'Air Commodore', 'FDC', 'Nigerian Air Force', 1993, 1993, 'Course 5 Faculty', 'NWC Course 5', 21),
  (gen_random_uuid(), 'AG Adedeji', 'Captain', 'FDC', 'Nigerian Navy', 1993, 1993, 'Course 5 Faculty', 'NWC Course 5', 22),
  (gen_random_uuid(), 'S Momah', 'Brigadier General', 'FDC', 'Nigerian Army', 1993, 1993, 'Staff Member - National War College', 'NWC Staff', 23),
  (gen_random_uuid(), 'P Tnadah', 'Brigadier General', 'FDC', 'Nigerian Army', 1993, 1993, 'Staff Member - National War College', 'NWC Staff', 24),
  (gen_random_uuid(), 'O George', 'Commodore', 'FDC', 'Nigerian Navy', 1993, 1993, 'Staff Member - National War College', 'NWC Staff', 25),
  (gen_random_uuid(), 'EI Ombu', 'Air Commodore', 'FDC', 'Nigerian Air Force', 1993, 1993, 'Staff Member - National War College', 'NWC Staff', 26),
  (gen_random_uuid(), 'A One Mohammed', 'Colonel', 'FDC', 'Nigerian Army', 1993, 1993, 'Staff Member - National War College', 'NWC Staff', 27),
  (gen_random_uuid(), 'EF Olutumogun', 'Colonel', 'FDC', 'Nigerian Army', 1993, 1993, 'Staff Member - National War College', 'NWC Staff', 28),
  (gen_random_uuid(), 'SE Fagbemi', 'Colonel', 'FDC', 'Nigerian Army', 1993, 1993, 'Director Military History and Research', 'NWC Staff', 29),
  (gen_random_uuid(), 'SM Dule', 'Colonel', 'FDC', 'Nigerian Army', 1993, 1993, 'College Librarian', 'NWC Staff', 30),
  (gen_random_uuid(), 'RD Vellacott', 'Colonel', 'Directing Staff', 'Foreign', 1993, 1993, 'Exchange Officer - United Kingdom', 'NWC Exchange', 31),
  (gen_random_uuid(), 'Chris Ellison', 'Captain', 'Directing Staff', 'Foreign', 1993, 1993, 'Naval Exchange Officer - United Kingdom', 'NWC Exchange', 32),
  (gen_random_uuid(), 'Delve', 'Group Captain', 'Directing Staff', 'Foreign', 1993, 1993, 'Air Force Exchange Officer - United Kingdom', 'NWC Exchange', 33);

-- Verification queries (run after insert to verify data)

-- Count inserted records
-- SELECT COUNT(*) as total_personnel FROM personnel WHERE decoration LIKE 'NWC%';

-- View by course
-- SELECT decoration, COUNT(*) as count FROM personnel WHERE decoration LIKE 'NWC%' GROUP BY decoration;

-- View by service
-- SELECT service, COUNT(*) as count FROM personnel WHERE decoration LIKE 'NWC%' GROUP BY service;

-- View by rank
-- SELECT rank, COUNT(*) as count FROM personnel WHERE decoration LIKE 'NWC%' GROUP BY rank ORDER BY count DESC;

-- View all inserted records
-- SELECT name, rank, category, service, period_start, period_end, decoration, seniority_order FROM personnel WHERE decoration LIKE 'NWC%' ORDER BY seniority_order;
