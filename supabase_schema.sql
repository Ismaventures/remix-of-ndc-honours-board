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
