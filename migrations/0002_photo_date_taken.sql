-- 0002 — add `date_taken` column to photos, used to group the
-- public gallery by year. Auto-populated from EXIF DateTimeOriginal
-- on upload; editable via admin form. Nullable so existing rows
-- don't need backfill (they fall into the "Undated" group).
--
-- Apply once against your Turso / libSQL database:
--   turso db shell <your-db> < migrations/0002_photo_date_taken.sql

ALTER TABLE photos ADD COLUMN date_taken TEXT;
