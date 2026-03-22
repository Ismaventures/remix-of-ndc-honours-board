-- Table: commandants
CREATE TABLE IF NOT EXISTS commandants (
  id text PRIMARY KEY,
  name text NOT NULL,
  title text NOT NULL,
  tenure_start integer NOT NULL,
  tenure_end integer,
  image_url text,
  description text,
  is_current boolean NOT NULL DEFAULT false
);

-- Table: personnel
CREATE TABLE IF NOT EXISTS personnel (
  id text PRIMARY KEY,
  name text NOT NULL,
  rank text NOT NULL,
  category text NOT NULL,
  service text NOT NULL,
  period_start integer NOT NULL,
  period_end integer NOT NULL,
  image_url text,
  citation text,
  seniority_order integer
);

-- Table: visits
CREATE TABLE IF NOT EXISTS visits (
  id text PRIMARY KEY,
  name text NOT NULL,
  title text NOT NULL,
  country text NOT NULL,
  date date NOT NULL,
  image_url text,
  description text
);

-- Table: audio_tracks
CREATE TABLE IF NOT EXISTS audio_tracks (
  id text PRIMARY KEY,
  name text NOT NULL,
  filename text NOT NULL,
  bucket_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: audio_assignments
CREATE TABLE IF NOT EXISTS audio_assignments (
  context text PRIMARY KEY,
  track_id text REFERENCES audio_tracks(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Row Level Security
ALTER TABLE commandants ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_assignments ENABLE ROW LEVEL SECURITY;

-- Public read policies
DROP POLICY IF EXISTS commandants_public_read ON commandants;
CREATE POLICY commandants_public_read ON commandants
FOR SELECT USING (true);

DROP POLICY IF EXISTS personnel_public_read ON personnel;
CREATE POLICY personnel_public_read ON personnel
FOR SELECT USING (true);

DROP POLICY IF EXISTS visits_public_read ON visits;
CREATE POLICY visits_public_read ON visits
FOR SELECT USING (true);

DROP POLICY IF EXISTS audio_tracks_public_read ON audio_tracks;
CREATE POLICY audio_tracks_public_read ON audio_tracks
FOR SELECT USING (true);

DROP POLICY IF EXISTS audio_assignments_public_read ON audio_assignments;
CREATE POLICY audio_assignments_public_read ON audio_assignments
FOR SELECT USING (true);

-- Authenticated write policies
DROP POLICY IF EXISTS commandants_auth_write ON commandants;
CREATE POLICY commandants_auth_write ON commandants
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS personnel_auth_write ON personnel;
CREATE POLICY personnel_auth_write ON personnel
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS visits_auth_write ON visits;
CREATE POLICY visits_auth_write ON visits
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS audio_tracks_auth_write ON audio_tracks;
CREATE POLICY audio_tracks_auth_write ON audio_tracks
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS audio_assignments_auth_write ON audio_assignments;
CREATE POLICY audio_assignments_auth_write ON audio_assignments
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Storage bucket: ndc-audio
INSERT INTO storage.buckets (id, name, public)
VALUES ('ndc-audio', 'ndc-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for ndc-audio
DROP POLICY IF EXISTS ndc_audio_public_read ON storage.objects;
CREATE POLICY ndc_audio_public_read ON storage.objects
FOR SELECT
USING (bucket_id = 'ndc-audio');

DROP POLICY IF EXISTS ndc_audio_auth_write ON storage.objects;
CREATE POLICY ndc_audio_auth_write ON storage.objects
FOR ALL
USING (bucket_id = 'ndc-audio' AND auth.role() = 'authenticated')
WITH CHECK (bucket_id = 'ndc-audio' AND auth.role() = 'authenticated');
