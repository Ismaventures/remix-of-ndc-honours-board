-- ============================================================
-- NWC COURSE 1 (1992-1993) PARTICIPANTS - BULK INSERT
-- ============================================================
-- Add remaining Course 1 participants/fellows to reach ~60 total
-- Currently have 11 staff members, need ~49 more participants
--
-- INSTRUCTIONS:
-- 1. Fill in the names, ranks, services in the VALUES section below
-- 2. Copy and paste the entire INSERT statement into Supabase SQL Editor
-- 3. Run to add all Course 1 participants at once
-- ============================================================

INSERT INTO personnel (id, name, rank, category, service, period_start, period_end, citation, decoration, seniority_order) VALUES
-- COURSE 1 PARTICIPANTS (1992-1993) - ADD YOUR DATA HERE
-- Format: ('nwc-###-lastname', 'Full Name', 'Rank', 'FWC or FDC', 'Service Branch', 1992, 1993, 'Citation text', 'NWC Course 1', seniority_order)

-- Example entries (replace with actual data):
('nwc-034-participant1', '[PARTICIPANT NAME 1]', '[RANK]', 'FWC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 34),
('nwc-035-participant2', '[PARTICIPANT NAME 2]', '[RANK]', 'FWC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 35),
('nwc-036-participant3', '[PARTICIPANT NAME 3]', '[RANK]', 'FWC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 36),
('nwc-037-participant4', '[PARTICIPANT NAME 4]', '[RANK]', 'FDC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 37),
('nwc-038-participant5', '[PARTICIPANT NAME 5]', '[RANK]', 'FDC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 38),
('nwc-039-participant6', '[PARTICIPANT NAME 6]', '[RANK]', 'FWC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 39),
('nwc-040-participant7', '[PARTICIPANT NAME 7]', '[RANK]', 'FWC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 40),
('nwc-041-participant8', '[PARTICIPANT NAME 8]', '[RANK]', 'FDC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 41),
('nwc-042-participant9', '[PARTICIPANT NAME 9]', '[RANK]', 'FDC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 42),
('nwc-043-participant10', '[PARTICIPANT NAME 10]', '[RANK]', 'FWC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 43),
('nwc-044-participant11', '[PARTICIPANT NAME 11]', '[RANK]', 'FWC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 44),
('nwc-045-participant12', '[PARTICIPANT NAME 12]', '[RANK]', 'FDC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 45),
('nwc-046-participant13', '[PARTICIPANT NAME 13]', '[RANK]', 'FWC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 46),
('nwc-047-participant14', '[PARTICIPANT NAME 14]', '[RANK]', 'FDC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 47),
('nwc-048-participant15', '[PARTICIPANT NAME 15]', '[RANK]', 'FWC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 48),
('nwc-049-participant16', '[PARTICIPANT NAME 16]', '[RANK]', 'FDC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 49),
('nwc-050-participant17', '[PARTICIPANT NAME 17]', '[RANK]', 'FWC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 50),
('nwc-051-participant18', '[PARTICIPANT NAME 18]', '[RANK]', 'FDC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 51),
('nwc-052-participant19', '[PARTICIPANT NAME 19]', '[RANK]', 'FWC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 52),
('nwc-053-participant20', '[PARTICIPANT NAME 20]', '[RANK]', 'FDC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 53),
('nwc-054-participant21', '[PARTICIPANT NAME 21]', '[RANK]', 'FWC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 54),
('nwc-055-participant22', '[PARTICIPANT NAME 22]', '[RANK]', 'FDC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 55),
('nwc-056-participant23', '[PARTICIPANT NAME 23]', '[RANK]', 'FWC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 56),
('nwc-057-participant24', '[PARTICIPANT NAME 24]', '[RANK]', 'FDC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 57),
('nwc-058-participant25', '[PARTICIPANT NAME 25]', '[RANK]', 'FWC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 58),
('nwc-059-participant26', '[PARTICIPANT NAME 26]', '[RANK]', 'FDC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 59),
('nwc-060-participant27', '[PARTICIPANT NAME 27]', '[RANK]', 'FWC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 60),
('nwc-061-participant28', '[PARTICIPANT NAME 28]', '[RANK]', 'FDC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 61),
('nwc-062-participant29', '[PARTICIPANT NAME 29]', '[RANK]', 'FWC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 62),
('nwc-063-participant30', '[PARTICIPANT NAME 30]', '[RANK]', 'FDC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 63),
('nwc-064-participant31', '[PARTICIPANT NAME 31]', '[RANK]', 'FWC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 64),
('nwc-065-participant32', '[PARTICIPANT NAME 32]', '[RANK]', 'FDC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 65),
('nwc-066-participant33', '[PARTICIPANT NAME 33]', '[RANK]', 'FWC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 66),
('nwc-067-participant34', '[PARTICIPANT NAME 34]', '[RANK]', 'FDC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 67),
('nwc-068-participant35', '[PARTICIPANT NAME 35]', '[RANK]', 'FWC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 68),
('nwc-069-participant36', '[PARTICIPANT NAME 36]', '[RANK]', 'FDC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 69),
('nwc-070-participant37', '[PARTICIPANT NAME 37]', '[RANK]', 'FWC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 70),
('nwc-071-participant38', '[PARTICIPANT NAME 38]', '[RANK]', 'FDC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 71),
('nwc-072-participant39', '[PARTICIPANT NAME 39]', '[RANK]', 'FWC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 72),
('nwc-073-participant40', '[PARTICIPANT NAME 40]', '[RANK]', 'FDC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 73),
('nwc-074-participant41', '[PARTICIPANT NAME 41]', '[RANK]', 'FWC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 74),
('nwc-075-participant42', '[PARTICIPANT NAME 42]', '[RANK]', 'FDC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 75),
('nwc-076-participant43', '[PARTICIPANT NAME 43]', '[RANK]', 'FWC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 76),
('nwc-077-participant44', '[PARTICIPANT NAME 44]', '[RANK]', 'FDC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 77),
('nwc-078-participant45', '[PARTICIPANT NAME 45]', '[RANK]', 'FWC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 78),
('nwc-079-participant46', '[PARTICIPANT NAME 46]', '[RANK]', 'FDC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 79),
('nwc-080-participant47', '[PARTICIPANT NAME 47]', '[RANK]', 'FWC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 80),
('nwc-081-participant48', '[PARTICIPANT NAME 48]', '[RANK]', 'FDC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 81),
('nwc-082-participant49', '[PARTICIPANT NAME 49]', '[RANK]', 'FWC', '[Service]', 1992, 1993, 'Course 1 Participant', 'NWC Course 1', 82)

ON CONFLICT DO NOTHING;

-- ============================================================
-- VERIFICATION QUERY
-- Run this to check Course 1 total count:
-- SELECT COUNT(*) as "Total Course 1 Personnel" FROM personnel WHERE decoration LIKE 'NWC Course 1%';
-- ============================================================
