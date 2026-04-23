-- 0004 — add `blur_data_url` (TEXT) column to photos.
-- Storing a pre-blurred, downsampled base64 data URL means the
-- "from image" wall in expanded view can paint a fixed backdrop
-- without running a live `filter: blur(60px)` pass on the full-res
-- image. That live blur was repainting every time a neighboring
-- element with backdrop-filter (the wall-color pill, the glass
-- back button) hovered, which produced visible shimmer artifacts.
--
-- The admin client generates this on upload (32 px wide JPEG
-- q=0.55 → typically ~800 chars base64). Nullable so pre-0004
-- rows still load; a one-shot client-side backfill populates them
-- from the R2 original on next admin visit.
--
-- Apply once:
--   npm run migrate
-- or
--   turso db shell <your-db> < migrations/0004_photo_blur_data_url.sql

ALTER TABLE photos ADD COLUMN blur_data_url TEXT;
