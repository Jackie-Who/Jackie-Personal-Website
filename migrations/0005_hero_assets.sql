-- 0005 — singleton hero_assets table for the homepage hero's
-- creative-side image + video. The "image" is the resting-state
-- thumbnail and the "video" is what plays on hover. Until set, the
-- hero falls back to its built-in CSS placeholder.
--
-- Singleton row: id = 'main'. Always present (INSERT OR IGNORE
-- below seeds it). The admin UI updates the *_r2_key + filename
-- columns in place rather than creating new rows.
--
-- Apply once:
--   npm run migrate
-- or
--   turso db shell <your-db> < migrations/0005_hero_assets.sql

CREATE TABLE IF NOT EXISTS hero_assets (
  id TEXT PRIMARY KEY,
  creative_image_r2_key TEXT,
  creative_image_filename TEXT,
  creative_video_r2_key TEXT,
  creative_video_filename TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO hero_assets (id) VALUES ('main');
