import type { APIRoute } from 'astro';
import { isAuthenticated } from '@/lib/auth';
import { listPhotos, insertPhoto, type PhotoRow } from '@/lib/db';
import { uploadToR2, buildR2Key } from '@/lib/r2';
import { extractExif } from '@/lib/exif';
import { newId } from '@/lib/ids';

export const prerender = false;

/**
 * GET  /api/photos  — list (admin only)
 * POST /api/photos  — multipart/form-data with file + fields → creates row + uploads to R2
 */
export const GET: APIRoute = async ({ cookies }) => {
  if (!(await isAuthenticated(cookies))) return err('Unauthorized', 401);
  try {
    const rows = await listPhotos();
    return ok({ photos: rows });
  } catch (e) {
    return err(describe(e), 500);
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!(await isAuthenticated(cookies))) return err('Unauthorized', 401);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return err('Expected multipart/form-data', 400);
  }

  const file = form.get('file');
  if (!(file instanceof File)) return err('Missing file field', 400);

  const title = (form.get('title') as string | null) ?? file.name;
  const status = ((form.get('status') as string | null) ?? 'draft') as 'draft' | 'live';
  const sortOrder = Number((form.get('sort_order') as string | null) ?? 0);

  // Aspect ratio is measured client-side via new Image() before
  // upload and sent as a float. Layout is derived from it — wide
  // (lands ≥ 1.4:1) spans more grid room, standard is the default.
  const rawAspect = Number((form.get('aspect_ratio') as string | null) ?? '');
  const aspectRatio = Number.isFinite(rawAspect) && rawAspect > 0 ? rawAspect : null;
  const layout: 'standard' | 'wide' = aspectRatio && aspectRatio >= 1.4 ? 'wide' : 'standard';

  const buf = Buffer.from(await file.arrayBuffer());
  const exif = await extractExif(buf);

  // Form overrides win over EXIF for the three kept fields. The
  // dropped columns (focal_length, camera, lens, category) stay in
  // the schema for back-compat with any pre-existing rows, but are
  // always written as NULL for new uploads.
  //
  // Raw form inputs from the admin are normalized to the display
  // format — viewer types "1.8" → stored as "ƒ/1.8", "1/250" →
  // "1/250s", "100" → "ISO 100". Already-formatted values (e.g.
  // EXIF auto-fill) pass through unchanged.
  const aperture = normalizeAperture((form.get('aperture') as string | null) ?? exif.aperture);
  const shutter = normalizeShutter((form.get('shutter') as string | null) ?? exif.shutter);
  const iso = normalizeIso((form.get('iso') as string | null) ?? exif.iso);

  const id = newId('p');
  const key = buildR2Key('photos', id, file.name);

  try {
    await uploadToR2(key, buf, file.type || 'application/octet-stream');
  } catch (e) {
    return err(`R2 upload failed: ${describe(e)}`, 500);
  }

  // Admin can override the EXIF-derived date via a `date_taken`
  // form field (ISO string). Otherwise fall back to EXIF's
  // DateTimeOriginal.
  const dateTaken = (form.get('date_taken') as string | null) ?? exif.dateTaken;

  const row: PhotoRow = {
    id,
    title,
    filename: file.name,
    r2_key: key,
    focal_length: null,
    aperture,
    shutter_speed: shutter,
    iso,
    camera: null,
    lens: null,
    category: null,
    layout,
    status,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    date_taken: dateTaken,
    aspect_ratio: aspectRatio,
    created_at: new Date().toISOString(),
  };

  try {
    await insertPhoto(row);
  } catch (e) {
    return err(`DB insert failed: ${describe(e)}`, 500);
  }

  return ok({ photo: row }, 201);
};

// ------------------------------------------------------------
// EXIF input normalizers
//
// The admin form lets the operator type raw numeric values ("1.8",
// "1/250", "100") that we coerce into the pill-text format the
// expanded view expects ("ƒ/1.8", "1/250s", "ISO 100"). Values that
// already include the display prefix (from EXIF auto-fill, or when
// the operator re-typed a formatted value) pass through as-is.
// ------------------------------------------------------------
function normalizeAperture(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = v.trim();
  if (!s) return null;
  // Already formatted
  if (/^[ƒf]\s*\/\s*\d/i.test(s)) {
    return s.replace(/^f/i, 'ƒ').replace(/\s+/g, '');
  }
  // Numeric only → e.g. 1.8
  const n = Number(s);
  if (Number.isFinite(n) && n > 0) {
    const rounded = Math.round(n * 10) / 10;
    return `ƒ/${rounded}`;
  }
  return s;
}

function normalizeShutter(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = v.trim();
  if (!s) return null;
  // Already ends in s or seconds (e.g. 4s, 1/250s)
  if (/s$/i.test(s)) return s;
  // Fraction like 1/250 → 1/250s
  if (/^\d+\/\d+$/.test(s)) return `${s}s`;
  // Bare number → seconds (e.g. 4 → 4s, 0.5 → 0.5s)
  const n = Number(s);
  if (Number.isFinite(n) && n > 0) return `${s}s`;
  return s;
}

function normalizeIso(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = v.trim();
  if (!s) return null;
  // Already prefixed
  if (/^iso\s*\d/i.test(s)) return s.replace(/^iso\s*/i, 'ISO ');
  // Bare number
  const n = Number(s);
  if (Number.isFinite(n) && n > 0) return `ISO ${Math.round(n)}`;
  return s;
}

function ok(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}
function err(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}
function describe(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
