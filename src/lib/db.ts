import { createClient, type Client } from '@libsql/client';

/**
 * Turso (libSQL) client for the CMS.
 *
 * Lazy-initialized on first use. If the required env vars aren't
 * set, any DB call throws a clear error — lets the site still build
 * and serve the static parts without credentials. Phase 5 API routes
 * rely on this; pre-rendered Phase 1–4 pages never touch it.
 */

let client: Client | null = null;

export function getDb(): Client {
  if (client) return client;

  const url = import.meta.env.TURSO_DATABASE_URL ?? process.env.TURSO_DATABASE_URL;
  const authToken = import.meta.env.TURSO_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error(
      'TURSO_DATABASE_URL is not set. Run `cp .env.example .env` and populate Turso credentials.',
    );
  }

  client = createClient({
    url,
    ...(authToken ? { authToken } : {}),
  });
  return client;
}

/**
 * Quick probe that returns true when the DB is reachable + the
 * expected tables exist. Used by the content loaders to fall back
 * to the static placeholder arrays gracefully at build time when
 * no Turso instance is configured yet.
 */
export async function isDbReady(): Promise<boolean> {
  try {
    const c = getDb();
    const r = await c.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('photos','tracks')",
    );
    return r.rows.length >= 2;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------
// Schema — mirrors /site-architecture-spec-final.md §Database.
// Kept inline here so deploy targets that don't run migration
// files (Vercel preview, local SQLite) can bootstrap by calling
// ensureSchema() once at startup.
// ------------------------------------------------------------
export async function ensureSchema(): Promise<void> {
  const c = getDb();
  await c.batch([
    `CREATE TABLE IF NOT EXISTS photos (
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
      date_taken TEXT,
      aspect_ratio REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS tracks (
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
    )`,
  ], 'write');
}

// ------------------------------------------------------------
// Row types — one-to-one with the SQL schema.
// ------------------------------------------------------------
export interface PhotoRow {
  id: string;
  title: string;
  filename: string;
  r2_key: string;
  focal_length: string | null;
  aperture: string | null;
  shutter_speed: string | null;
  iso: string | null;
  camera: string | null;
  lens: string | null;
  category: string | null;
  layout: string;
  status: string;
  sort_order: number;
  /** ISO date string from EXIF DateTimeOriginal, or null. Used to
   *  group gallery tiles by year on the public creative page. */
  date_taken: string | null;
  /** Natural image width / height. Measured client-side on upload
   *  and stored so the gallery can reserve correct layout space
   *  before the real image decodes. Null for pre-0003 rows. */
  aspect_ratio: number | null;
  created_at: string;
}

export interface TrackRow {
  id: string;
  title: string;
  composer: string | null;
  audio_filename: string;
  audio_r2_key: string;
  cover_filename: string | null;
  cover_r2_key: string | null;
  duration_seconds: number | null;
  type: string | null;
  recorded_date: string | null;
  notes: string | null;
  status: string;
  sort_order: number;
  created_at: string;
}

// ------------------------------------------------------------
// Queries
// ------------------------------------------------------------

export async function listPhotos(opts?: { publishedOnly?: boolean }): Promise<PhotoRow[]> {
  const c = getDb();
  const where = opts?.publishedOnly ? "WHERE status = 'live'" : '';
  const r = await c.execute(`SELECT * FROM photos ${where} ORDER BY sort_order ASC, created_at DESC`);
  return r.rows as unknown as PhotoRow[];
}

export async function getPhoto(id: string): Promise<PhotoRow | null> {
  const c = getDb();
  const r = await c.execute({
    sql: 'SELECT * FROM photos WHERE id = ? LIMIT 1',
    args: [id],
  });
  return (r.rows[0] as unknown as PhotoRow) ?? null;
}

export async function insertPhoto(row: PhotoRow): Promise<void> {
  const c = getDb();
  await c.execute({
    sql: `INSERT INTO photos
      (id, title, filename, r2_key, focal_length, aperture, shutter_speed, iso,
       camera, lens, category, layout, status, sort_order, date_taken, aspect_ratio)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      row.id, row.title, row.filename, row.r2_key,
      row.focal_length, row.aperture, row.shutter_speed, row.iso,
      row.camera, row.lens, row.category, row.layout, row.status, row.sort_order,
      row.date_taken, row.aspect_ratio,
    ],
  });
}

export async function updatePhoto(id: string, patch: Partial<PhotoRow>): Promise<void> {
  const keys = Object.keys(patch).filter((k) => k !== 'id');
  if (keys.length === 0) return;
  const set = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => (patch as Record<string, unknown>)[k]);
  const c = getDb();
  await c.execute({
    sql: `UPDATE photos SET ${set} WHERE id = ?`,
    args: [...(values as (string | number | null)[]), id],
  });
}

export async function deletePhoto(id: string): Promise<void> {
  const c = getDb();
  await c.execute({
    sql: 'DELETE FROM photos WHERE id = ?',
    args: [id],
  });
}

export async function listTracks(opts?: { publishedOnly?: boolean }): Promise<TrackRow[]> {
  const c = getDb();
  const where = opts?.publishedOnly ? "WHERE status = 'live'" : '';
  const r = await c.execute(`SELECT * FROM tracks ${where} ORDER BY sort_order ASC, created_at DESC`);
  return r.rows as unknown as TrackRow[];
}

export async function getTrack(id: string): Promise<TrackRow | null> {
  const c = getDb();
  const r = await c.execute({
    sql: 'SELECT * FROM tracks WHERE id = ? LIMIT 1',
    args: [id],
  });
  return (r.rows[0] as unknown as TrackRow) ?? null;
}

export async function insertTrack(row: TrackRow): Promise<void> {
  const c = getDb();
  await c.execute({
    sql: `INSERT INTO tracks
      (id, title, composer, audio_filename, audio_r2_key, cover_filename, cover_r2_key,
       duration_seconds, type, recorded_date, notes, status, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      row.id, row.title, row.composer, row.audio_filename, row.audio_r2_key,
      row.cover_filename, row.cover_r2_key, row.duration_seconds,
      row.type, row.recorded_date, row.notes, row.status, row.sort_order,
    ],
  });
}

export async function updateTrack(id: string, patch: Partial<TrackRow>): Promise<void> {
  const keys = Object.keys(patch).filter((k) => k !== 'id');
  if (keys.length === 0) return;
  const set = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => (patch as Record<string, unknown>)[k]);
  const c = getDb();
  await c.execute({
    sql: `UPDATE tracks SET ${set} WHERE id = ?`,
    args: [...(values as (string | number | null)[]), id],
  });
}

export async function deleteTrack(id: string): Promise<void> {
  const c = getDb();
  await c.execute({
    sql: 'DELETE FROM tracks WHERE id = ?',
    args: [id],
  });
}
