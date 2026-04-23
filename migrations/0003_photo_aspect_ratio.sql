-- 0003 — add `aspect_ratio` (REAL) column to photos.
-- The admin client measures each uploaded image's natural
-- width / height and sends the ratio as a form field; the public
-- gallery uses the stored ratio to reserve correct layout space
-- per tile (no layout shift when the real image decodes). Nullable
-- so pre-upgrade rows still load (they fall back to a 1:1 default).
--
-- Apply once:
--   node scripts/migrate.mjs       # picks up all SQL in migrations/
-- or
--   turso db shell <your-db> < migrations/0003_photo_aspect_ratio.sql

ALTER TABLE photos ADD COLUMN aspect_ratio REAL;
