-- Phase 5 CMS — initial schema.
-- Apply once against your Turso database (or libSQL / local SQLite)
-- before running the admin panel. See also src/lib/db.ts #ensureSchema
-- for a programmatic equivalent usable from scripts.
--
-- Usage:
--   turso db shell <your-db> < migrations/0001_init.sql

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  focal_length TEXT,
  aperture TEXT,
  shutter_speed TEXT,
  iso TEXT,
  camera TEXT,
  lens TEXT,
  category TEXT,
  layout TEXT DEFAULT 'standard',
  status TEXT DEFAULT 'draft',
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  composer TEXT,
  audio_filename TEXT NOT NULL,
  audio_r2_key TEXT NOT NULL,
  cover_filename TEXT,
  cover_r2_key TEXT,
  duration_seconds INTEGER,
  type TEXT,
  recorded_date TEXT,
  notes TEXT,
  status TEXT DEFAULT 'draft',
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for published-list ordering.
CREATE INDEX IF NOT EXISTS idx_photos_status_sort ON photos (status, sort_order);
CREATE INDEX IF NOT EXISTS idx_tracks_status_sort ON tracks (status, sort_order);
