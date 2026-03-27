-- Table: commandants
CREATE TABLE IF NOT EXISTS commandants (
  id text PRIMARY KEY,
  name text NOT NULL,
  title text NOT NULL,
  tenure_start integer NOT NULL,
  tenure_end integer,
  image_url text,
  description text,
  decoration text,
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
  decoration text,
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
  description text,
  decoration text
);

ALTER TABLE commandants ADD COLUMN IF NOT EXISTS decoration text;
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS decoration text;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS decoration text;

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

-- Table: ui_settings (per-auth-user persisted UI preferences)
CREATE TABLE IF NOT EXISTS ui_settings (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  setting_key text NOT NULL,
  setting_value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, setting_key)
);

-- Table: device_clients (online devices for remote admin control)
CREATE TABLE IF NOT EXISTS device_clients (
  device_id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_label text NOT NULL,
  current_view text NOT NULL DEFAULT 'home',
  auto_display_enabled boolean NOT NULL DEFAULT false,
  last_seen timestamptz NOT NULL DEFAULT now()
);

-- Table: device_control_commands (queued remote commands for target devices)
CREATE TABLE IF NOT EXISTS device_control_commands (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_device_id text NOT NULL REFERENCES device_clients(device_id) ON DELETE CASCADE,
  command_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  executed_at timestamptz
);

-- Table: super_admins (who can issue global site control commands)
CREATE TABLE IF NOT EXISTS super_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: global_site_control (global close/open commands for all visitors)
CREATE TABLE IF NOT EXISTS global_site_control (
  id bigserial PRIMARY KEY,
  action text NOT NULL CHECK (action IN ('close-site', 'open-site')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  issued_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Row Level Security
ALTER TABLE commandants ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ui_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_control_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_site_control ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS ui_settings_own_read ON ui_settings;
CREATE POLICY ui_settings_own_read ON ui_settings
FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS device_clients_own_read ON device_clients;
CREATE POLICY device_clients_own_read ON device_clients
FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS device_control_commands_own_read ON device_control_commands;
CREATE POLICY device_control_commands_own_read ON device_control_commands
FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS super_admins_own_read ON super_admins;
CREATE POLICY super_admins_own_read ON super_admins
FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS global_site_control_public_read ON global_site_control;
CREATE POLICY global_site_control_public_read ON global_site_control
FOR SELECT USING (true);

-- Authenticated write policies
DROP POLICY IF EXISTS commandants_auth_write ON commandants;
DROP POLICY IF EXISTS commandants_auth_insert ON commandants;
DROP POLICY IF EXISTS commandants_auth_update ON commandants;
DROP POLICY IF EXISTS commandants_auth_delete ON commandants;
CREATE POLICY commandants_auth_insert ON commandants
FOR INSERT
WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY commandants_auth_update ON commandants
FOR UPDATE
USING ((select auth.role()) = 'authenticated')
WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY commandants_auth_delete ON commandants
FOR DELETE
USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS personnel_auth_write ON personnel;
DROP POLICY IF EXISTS personnel_auth_insert ON personnel;
DROP POLICY IF EXISTS personnel_auth_update ON personnel;
DROP POLICY IF EXISTS personnel_auth_delete ON personnel;
CREATE POLICY personnel_auth_insert ON personnel
FOR INSERT
WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY personnel_auth_update ON personnel
FOR UPDATE
USING ((select auth.role()) = 'authenticated')
WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY personnel_auth_delete ON personnel
FOR DELETE
USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS visits_auth_write ON visits;
DROP POLICY IF EXISTS visits_auth_insert ON visits;
DROP POLICY IF EXISTS visits_auth_update ON visits;
DROP POLICY IF EXISTS visits_auth_delete ON visits;
CREATE POLICY visits_auth_insert ON visits
FOR INSERT
WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY visits_auth_update ON visits
FOR UPDATE
USING ((select auth.role()) = 'authenticated')
WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY visits_auth_delete ON visits
FOR DELETE
USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS audio_tracks_auth_write ON audio_tracks;
DROP POLICY IF EXISTS audio_tracks_auth_insert ON audio_tracks;
DROP POLICY IF EXISTS audio_tracks_auth_update ON audio_tracks;
DROP POLICY IF EXISTS audio_tracks_auth_delete ON audio_tracks;
CREATE POLICY audio_tracks_auth_insert ON audio_tracks
FOR INSERT
WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY audio_tracks_auth_update ON audio_tracks
FOR UPDATE
USING ((select auth.role()) = 'authenticated')
WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY audio_tracks_auth_delete ON audio_tracks
FOR DELETE
USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS audio_assignments_auth_write ON audio_assignments;
DROP POLICY IF EXISTS audio_assignments_auth_insert ON audio_assignments;
DROP POLICY IF EXISTS audio_assignments_auth_update ON audio_assignments;
DROP POLICY IF EXISTS audio_assignments_auth_delete ON audio_assignments;
CREATE POLICY audio_assignments_auth_insert ON audio_assignments
FOR INSERT
WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY audio_assignments_auth_update ON audio_assignments
FOR UPDATE
USING ((select auth.role()) = 'authenticated')
WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY audio_assignments_auth_delete ON audio_assignments
FOR DELETE
USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS ui_settings_own_write ON ui_settings;
DROP POLICY IF EXISTS ui_settings_own_insert ON ui_settings;
DROP POLICY IF EXISTS ui_settings_own_update ON ui_settings;
DROP POLICY IF EXISTS ui_settings_own_delete ON ui_settings;
CREATE POLICY ui_settings_own_insert ON ui_settings
FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY ui_settings_own_update ON ui_settings
FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY ui_settings_own_delete ON ui_settings
FOR DELETE
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS device_clients_own_write ON device_clients;
DROP POLICY IF EXISTS device_clients_own_insert ON device_clients;
DROP POLICY IF EXISTS device_clients_own_update ON device_clients;
DROP POLICY IF EXISTS device_clients_own_delete ON device_clients;
CREATE POLICY device_clients_own_insert ON device_clients
FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY device_clients_own_update ON device_clients
FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY device_clients_own_delete ON device_clients
FOR DELETE
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS device_control_commands_own_write ON device_control_commands;
DROP POLICY IF EXISTS device_control_commands_own_insert ON device_control_commands;
DROP POLICY IF EXISTS device_control_commands_own_update ON device_control_commands;
DROP POLICY IF EXISTS device_control_commands_own_delete ON device_control_commands;
CREATE POLICY device_control_commands_own_insert ON device_control_commands
FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY device_control_commands_own_update ON device_control_commands
FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY device_control_commands_own_delete ON device_control_commands
FOR DELETE
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS global_site_control_super_admin_insert ON global_site_control;
CREATE POLICY global_site_control_super_admin_insert ON global_site_control
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM super_admins
    WHERE super_admins.user_id = (select auth.uid())
  )
  AND issued_by = (select auth.uid())
);

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
DROP POLICY IF EXISTS ndc_audio_auth_insert ON storage.objects;
DROP POLICY IF EXISTS ndc_audio_auth_update ON storage.objects;
DROP POLICY IF EXISTS ndc_audio_auth_delete ON storage.objects;
CREATE POLICY ndc_audio_auth_insert ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'ndc-audio' AND (select auth.role()) = 'authenticated');
CREATE POLICY ndc_audio_auth_update ON storage.objects
FOR UPDATE
USING (bucket_id = 'ndc-audio' AND (select auth.role()) = 'authenticated')
WITH CHECK (bucket_id = 'ndc-audio' AND (select auth.role()) = 'authenticated');
CREATE POLICY ndc_audio_auth_delete ON storage.objects
FOR DELETE
USING (bucket_id = 'ndc-audio' AND (select auth.role()) = 'authenticated');
