-- ============================================================
-- CMS Migration: Editable museum content tables
-- Run this in your Supabase SQL Editor after the base schema
-- ============================================================

-- 1. Museum Sections (the 4 main entry-point cards)
CREATE TABLE IF NOT EXISTS museum_sections (
  id text PRIMARY KEY,                          -- "about-ndc", "museum-collections", etc.
  title text NOT NULL,
  subtitle text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  icon_name text NOT NULL DEFAULT 'Landmark',   -- Lucide icon name
  accent text NOT NULL DEFAULT '',              -- gradient classes
  service_color text NOT NULL DEFAULT '#002060', -- hex
  display_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. About / History Items (the 5 history cards on the About NDC page)
CREATE TABLE IF NOT EXISTS museum_about_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eyebrow text NOT NULL DEFAULT '',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Collection Wings (the 5 collection metadata entries)
CREATE TABLE IF NOT EXISTS museum_collection_wings (
  id text PRIMARY KEY,                           -- "history", "state", etc.
  title text NOT NULL,
  category text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  curatorial_note text NOT NULL DEFAULT '',
  highlights text[] NOT NULL DEFAULT '{}'::text[],
  featured_fact text NOT NULL DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Collection Items (the 25 artefact cards — extends museum_artifacts approach)
--    Create museum_artifacts if the base schema hasn't been run yet,
--    then add CMS-specific columns.
CREATE TABLE IF NOT EXISTS museum_artifacts (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  era text,
  origin_label text,
  strategic_significance text,
  media_urls text[] NOT NULL DEFAULT '{}'::text[],
  tags text[] NOT NULL DEFAULT '{}'::text[],
  related_artifact_ids text[] NOT NULL DEFAULT '{}'::text[],
  gallery_category text,
  period_label text,
  map_lat double precision,
  map_lng double precision,
  map_zoom integer,
  linked_view text,
  linked_record_id text,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

--    Add collection_id to museum_artifacts so items belong to a wing
ALTER TABLE museum_artifacts ADD COLUMN IF NOT EXISTS collection_id text;
ALTER TABLE museum_artifacts ADD COLUMN IF NOT EXISTS tag text;
ALTER TABLE museum_artifacts ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE museum_artifacts ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
ALTER TABLE museum_artifacts ADD COLUMN IF NOT EXISTS image_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 5. Tour Routes (the 3 guided tour definitions)
CREATE TABLE IF NOT EXISTS museum_tour_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  duration text NOT NULL DEFAULT '',
  audience text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  stops text[] NOT NULL DEFAULT '{}'::text[],
  service_color text NOT NULL DEFAULT '#002060',
  collection_id text,                             -- references museum_collection_wings.id
  display_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Enable RLS
-- ============================================================
ALTER TABLE museum_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE museum_about_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE museum_collection_wings ENABLE ROW LEVEL SECURITY;
ALTER TABLE museum_tour_routes ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY museum_sections_public_read ON museum_sections FOR SELECT USING (true);
CREATE POLICY museum_about_items_public_read ON museum_about_items FOR SELECT USING (true);
CREATE POLICY museum_collection_wings_public_read ON museum_collection_wings FOR SELECT USING (true);
CREATE POLICY museum_tour_routes_public_read ON museum_tour_routes FOR SELECT USING (true);

-- Authenticated write (insert / update / delete)
CREATE POLICY museum_sections_auth_insert ON museum_sections FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY museum_sections_auth_update ON museum_sections FOR UPDATE USING ((select auth.role()) = 'authenticated') WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY museum_sections_auth_delete ON museum_sections FOR DELETE USING ((select auth.role()) = 'authenticated');

CREATE POLICY museum_about_items_auth_insert ON museum_about_items FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY museum_about_items_auth_update ON museum_about_items FOR UPDATE USING ((select auth.role()) = 'authenticated') WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY museum_about_items_auth_delete ON museum_about_items FOR DELETE USING ((select auth.role()) = 'authenticated');

CREATE POLICY museum_collection_wings_auth_insert ON museum_collection_wings FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY museum_collection_wings_auth_update ON museum_collection_wings FOR UPDATE USING ((select auth.role()) = 'authenticated') WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY museum_collection_wings_auth_delete ON museum_collection_wings FOR DELETE USING ((select auth.role()) = 'authenticated');

CREATE POLICY museum_tour_routes_auth_insert ON museum_tour_routes FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY museum_tour_routes_auth_update ON museum_tour_routes FOR UPDATE USING ((select auth.role()) = 'authenticated') WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY museum_tour_routes_auth_delete ON museum_tour_routes FOR DELETE USING ((select auth.role()) = 'authenticated');

-- Also add authenticated write for museum_artifacts if it doesn't exist for the new columns
-- (base schema already has museum_artifacts_auth_insert/update/delete, so this is safe)

-- ============================================================
-- Seed default data (matches current hardcoded values)
-- ============================================================

-- Seed Museum Sections
INSERT INTO museum_sections (id, title, subtitle, description, icon_name, accent, service_color, display_order) VALUES
  ('about-ndc', 'About NDC', 'History, mandate & leadership context', 'Established in 1992, the National Defence College is Nigeria''s apex institution for strategic and security studies. Explore its founding charter, mandate, and leadership continuity.', 'Landmark', 'from-[#002060] via-[#003090] to-[#004dc0]', '#002060', 0),
  ('museum-collections', 'Museum Collections', 'Curated exhibition journeys', 'Five curated collection lanes — from the NDC''s institutional memory to its global defence education footprint — presented as professional museum exhibitions.', 'GalleryHorizontalEnd', 'from-[#5c4117] via-[#8b6526] to-[#FFD700]', '#FFD700', 1),
  ('guided-tours', 'Guided Tours', 'Narrated visitor routes', 'Auto and manual guided tour routes with narration, covering orientation, leadership trails, collection highlights, and the Hall of Fame honour gallery.', 'Route', 'from-[#8B0000] via-[#CC0000] to-[#FF0000]', '#FF0000', 2),
  ('hall-of-fame', 'Hall of Fame', 'Honours gallery', 'Commandants, Fellows of the War College, Fellows of the Defence College, Directing Staff, Allied Officers, and Distinguished Visitors — grouped as one ceremonial honour gallery.', 'Trophy', 'from-[#005070] via-[#0088b0] to-[#00B0F0]', '#00B0F0', 3)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  description = EXCLUDED.description,
  icon_name = EXCLUDED.icon_name,
  accent = EXCLUDED.accent,
  service_color = EXCLUDED.service_color,
  display_order = EXCLUDED.display_order;

-- Seed About History Items
INSERT INTO museum_about_items (id, eyebrow, title, body, display_order) VALUES
  (gen_random_uuid(), 'Founded 1992', 'Establishment of the NDC', 'The National Defence College, Abuja was established in 1992 as Nigeria''s premier institution for higher strategic and security studies, serving as the apex military educational establishment for senior officers and select civilian leaders.', 0),
  (gen_random_uuid(), 'Mandate', 'Strategic leadership development', 'The NDC prepares selected senior military officers and civilian equivalents for higher command and strategic leadership through joint and combined operations thinking, national security policy, and defence management.', 1),
  (gen_random_uuid(), 'Evolution', 'From founding to national prominence', 'Since its inception, the NDC has evolved from a nascent defence study centre into a nationally and internationally recognised institution, shaping Nigeria''s strategic thinking through thousands of graduates across military and civilian sectors.', 2),
  (gen_random_uuid(), 'Tri-Service Heritage', 'Army, Navy & Air Force synergy', 'As a tri-service institution, the NDC embodies the joint operational philosophy of the Nigerian Armed Forces — bringing together Army, Navy, and Air Force perspectives under one strategic education framework.', 3),
  (gen_random_uuid(), 'Collaborations', 'International partnerships & engagement', 'The NDC maintains partnerships with defence colleges worldwide, hosts distinguished visitors from allied nations, and contributes to regional security dialogue through ECOWAS and AU frameworks.', 4);

-- Seed Collection Wings
INSERT INTO museum_collection_wings (id, title, category, summary, curatorial_note, highlights, featured_fact, display_order) VALUES
  ('history', 'History Collection', 'Institutional memory', 'Documenting the NDC story from its 1992 founding charter through to its evolution as Nigeria''s premier joint military education establishment — early records, symbolic artefacts, photographs, and ceremonial milestones.', 'Presented as a chronology-led gallery with highlighted milestones, interpretive captions, and the narrative thread of how the college grew from its founding vision to national prominence.', ARRAY['1992 founding artefacts and charter documents', 'College milestones and ceremonial records', 'Photographic archive of institutional growth'], 'The NDC has trained over 3,000 senior officers and strategic leaders since its founding in 1992.', 0),
  ('state', 'State Collection', 'National identity', 'National symbols, honours, and artefacts connecting the NDC to Nigeria''s defence heritage — state-linked memorabilia, national service records, and civic ceremony items that frame the college within the national identity.', 'This civic layer connects the institution to the nation it serves, presenting Nigeria''s defence heritage through the lens of the college''s contribution to national security.', ARRAY['National defence heritage displays', 'State ceremony and honours memorabilia', 'Nigerian Armed Forces institutional linkages'], 'The NDC serves as the only institution in Nigeria mandated to provide the highest level of strategic defence education.', 1),
  ('regional', 'Regional Collection', 'Continental context', 'ECOWAS partnerships, African Union peacekeeping contributions, and the NDC''s role in continental security education — regional perspectives, neighbouring contexts, and professional exchange programmes.', 'Showcases how the NDC connects to the broader African security landscape through West African and continental military education partnerships.', ARRAY['ECOWAS and AU partnership artefacts', 'West African security dialogue records', 'Pan-African defence education exchanges'], 'NDC graduates have served in senior peacekeeping roles across multiple African Union and UN missions.', 2),
  ('world', 'World Collection', 'Global perspective', 'International defence education exchanges, partnership memoranda with global war colleges, and the NDC''s position on the world strategic education map — a collection that situates the college within a global professional peer network.', 'This lane represents the outward-looking, modern side of the NDC — its connections, exchange programmes, and comparative standing among peer defence institutions worldwide.', ARRAY['Bilateral MoUs with international war colleges', 'International exchange officer records', 'Global strategic education comparison'], 'The NDC maintains formal partnerships with defence colleges across four continents.', 3),
  ('archives', 'Archives', 'Hall of Fame bridge', 'The formal gateway into the Honours Board — linking curated exhibition content to the full institutional records of commandants, fellows, directing staff, allied officers, and distinguished visitors.', 'The archive collection serves as the visitor''s transition from curated museum storytelling into the deeper institutional records and the Hall of Fame honour gallery.', ARRAY['Direct bridge into the Hall of Fame', 'Fast access to existing archive categories', 'Seamless transition from exhibition to records'], 'The NDC archives preserve records dating back to its very first course in 1992.', 4)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  summary = EXCLUDED.summary,
  curatorial_note = EXCLUDED.curatorial_note,
  highlights = EXCLUDED.highlights,
  featured_fact = EXCLUDED.featured_fact,
  display_order = EXCLUDED.display_order;

-- Seed Tour Routes
INSERT INTO museum_tour_routes (title, duration, audience, description, stops, service_color, collection_id, display_order) VALUES
  ('State Collection Tour', '7–10 mins', 'National identity & heritage', 'A curated tour through Nigeria''s defence heritage artefacts — national colours, presidential memorabilia, defence medals, Armed Forces Day records, and the national security architecture exhibit.', ARRAY['Nigerian Armed Forces Colours', 'Presidential Visit Archive', 'Defence Medal Register', 'Armed Forces Day', 'Security Architecture'], '#002060', 'state', 0),
  ('Regional Collection Tour', '8–12 mins', 'Continental & West African context', 'Explore the NDC''s ECOWAS partnerships, African Union peacekeeping contributions, West African officer exchanges, regional security dialogue records, and pan-African defence education networks.', ARRAY['ECOWAS Cooperation', 'AU Peacekeeping', 'Officers Exchange', 'Security Dialogue', 'Pan-African Network'], '#FF0000', 'regional', 1),
  ('World Collection Tour', '8–12 mins', 'Global partnerships & perspective', 'Discover the NDC''s international connections — bilateral MoUs with war colleges worldwide, exchange officer programmes, global conference records, diplomatic gift collections, and comparative defence studies.', ARRAY['International MoUs', 'Exchange Officers', 'Global Conferences', 'Diplomatic Gifts', 'Comparative Study'], '#00B0F0', 'world', 2);

-- Seed Collection Items into museum_artifacts (only if not already present)
INSERT INTO museum_artifacts (id, name, description, era, media_urls, tags, collection_id, tag, location, display_order, is_published) VALUES
  ('h1', 'Founding Charter & Establishment Order', 'The original presidential directive establishing the National Defence College as Nigeria''s apex strategic studies institution.', '1992', '{}', ARRAY['Founding Document'], 'history', 'Founding Document', NULL, 0, true),
  ('h2', 'First NDC Course Group Assembly', 'Photographic record of the pioneering Course 1 participants who launched the college''s academic tradition.', '1992', '{}', ARRAY['Academic Heritage'], 'history', 'Academic Heritage', NULL, 1, true),
  ('h3', 'College Seal & Crest Evolution', 'Tracing the evolution of the NDC''s institutional identity through its official emblems and heraldic symbols.', '1992–Present', '{}', ARRAY['Institutional Identity'], 'history', 'Institutional Identity', NULL, 2, true),
  ('h4', '10th Anniversary Milestone Archive', 'Commemorative records marking a decade of strategic education excellence at the National Defence College.', '2002', '{}', ARRAY['Milestone'], 'history', 'Milestone', NULL, 3, true),
  ('h5', 'Silver Jubilee Commemorative Collection', 'Artefacts and documentation from the NDC''s 25th anniversary celebrations and institutional retrospective.', '2017', '{}', ARRAY['Anniversary'], 'history', 'Anniversary', NULL, 4, true),
  ('s1', 'Nigerian Armed Forces Colours', 'The national defence colours representing the Nigerian Army, Navy, and Air Force — the tri-service foundation of the NDC.', 'National Heritage', '{}', ARRAY['State Symbol'], 'state', 'State Symbol', 'Abuja, FCT', 0, true),
  ('s2', 'Presidential Visit Ceremonial Archive', 'Memorabilia from presidential visits to the NDC, including addresses, gifts of state, and official photographs.', 'State Occasions', '{}', ARRAY['Diplomatic'], 'state', 'Diplomatic', 'Lagos, Nigeria', 1, true),
  ('s3', 'Defence Medal & Honours Register', 'A curated display of national defence medals, awards, and distinctions conferred on NDC personnel and graduates.', 'National Awards', '{}', ARRAY['Honours'], 'state', 'Honours', 'Kaduna, Nigeria', 2, true),
  ('s4', 'Armed Forces Day Commemoration', 'Records from the NDC''s participation in national Armed Forces Remembrance Day ceremonies and memorial activities.', 'Annual Observance', '{}', ARRAY['Commemoration'], 'state', 'Commemoration', 'Abuja, FCT', 3, true),
  ('s5', 'National Security Architecture Exhibit', 'An interpretive display explaining the NDC''s place within Nigeria''s broader national security and defence apparatus.', 'Strategic Framework', '{}', ARRAY['Policy'], 'state', 'Policy', 'Abuja, FCT', 4, true),
  ('r1', 'ECOWAS Defence Cooperation Archive', 'Documents and artefacts from the NDC''s partnerships with ECOWAS member states on collective regional security education.', 'West Africa', '{}', ARRAY['Partnership'], 'regional', 'Partnership', 'Accra, Ghana', 0, true),
  ('r2', 'African Union Peacekeeping Contributions', 'Records of NDC graduates'' service in AU peacekeeping operations across the African continent.', 'Continental Missions', '{}', ARRAY['Peacekeeping'], 'regional', 'Peacekeeping', 'Addis Ababa, Ethiopia', 1, true),
  ('r3', 'West African Officers Exchange Programme', 'Photographic and documentary records of military officer exchanges with defence institutions across West Africa.', 'Professional Exchange', '{}', ARRAY['Exchange'], 'regional', 'Exchange', 'Dakar, Senegal', 2, true),
  ('r4', 'Regional Security Dialogue Archive', 'Materials from NDC participation in sub-regional and continental security conferences and strategic dialogue forums.', 'Multilateral Forums', '{}', ARRAY['Dialogue'], 'regional', 'Dialogue', 'Nairobi, Kenya', 3, true),
  ('r5', 'Pan-African Defence Education Network', 'Records of collaboration with peer defence colleges in Ghana, Kenya, South Africa, and other African nations.', 'Educational Partnerships', '{}', ARRAY['Network'], 'regional', 'Network', 'Pretoria, South Africa', 4, true),
  ('w1', 'International War College MoU Archive', 'Signed memoranda of understanding with defence colleges across four continents, establishing academic and research cooperation.', 'Global Partnerships', '{}', ARRAY['Agreements'], 'world', 'Agreements', 'Washington D.C., USA', 0, true),
  ('w2', 'International Exchange Officer Programme', 'Photographic and service records of international officers who have attended courses or served at the NDC.', 'Global Exchange', '{}', ARRAY['Exchange'], 'world', 'Exchange', 'London, United Kingdom', 1, true),
  ('w3', 'Global Strategic Studies Conference Records', 'Materials from NDC participation in international strategic studies conferences, symposia, and research collaborations.', 'Academic Outreach', '{}', ARRAY['Conference'], 'world', 'Conference', 'Beijing, China', 2, true),
  ('w4', 'Allied Nations Diplomatic Gift Collection', 'A curated collection of ceremonial gifts presented to the NDC by visiting defence delegations from partner nations worldwide.', 'International Relations', '{}', ARRAY['Diplomatic'], 'world', 'Diplomatic', 'New Delhi, India', 3, true),
  ('w5', 'World Defence College Comparative Study', 'Research materials positioning the NDC within the global network of senior military education institutions.', 'Benchmarking', '{}', ARRAY['Research'], 'world', 'Research', 'Paris, France', 4, true),
  ('a1', 'Commandant Succession Master Registry', 'The complete institutional record of all NDC commandants from founding to present, with biographical data and tenure details.', 'Leadership Archive', '{}', ARRAY['Registry'], 'archives', 'Registry', NULL, 0, true),
  ('a2', 'Course Participants Comprehensive Register', 'Master enrolment records covering all FWC, FDC, and course participants through every NDC academic year.', 'Academic Records', '{}', ARRAY['Enrolment'], 'archives', 'Enrolment', NULL, 1, true),
  ('a3', 'Distinguished Visitors Official Registry', 'The formal guest book and photographic registry of heads of state, defence chiefs, and dignitaries who have visited the NDC.', 'Diplomatic Archive', '{}', ARRAY['Visitors'], 'archives', 'Visitors', NULL, 2, true),
  ('a4', 'Directing Staff Service Records', 'Service histories and academic profiles of directing staff members who have shaped the NDC''s educational programmes.', 'Faculty Archive', '{}', ARRAY['Personnel'], 'archives', 'Personnel', NULL, 3, true),
  ('a5', 'Institutional Research & Publications', 'The NDC''s body of published research, strategic papers, dissertations, and policy recommendations.', 'Academic Output', '{}', ARRAY['Publications'], 'archives', 'Publications', NULL, 4, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  era = EXCLUDED.era,
  tags = EXCLUDED.tags,
  collection_id = EXCLUDED.collection_id,
  tag = EXCLUDED.tag,
  location = EXCLUDED.location,
  display_order = EXCLUDED.display_order;
