import type { APIRoute } from 'astro';
import { isAuthenticated } from '@/lib/auth';
import { listPhotos, insertPhoto, type PhotoRow } from '@/lib/db';
import { r2PublicUrl } from '@/lib/r2';

export const prerender = false;

/**
 * GET  /api/photos  — list (admin only)
 * POST /api/photos  — JSON body describing a photo that's already
 *                     been PUT to R2 via the presigned URL flow.
 *
 * The POST handler used to be multipart/form-data — the browser
 * shipped the file bytes, we uploaded to R2, then wrote the DB row.
 * Vercel caps serverless function bodies at 4.5 MB, so any photo
 * larger than that got 413'd before the handler ran. The upload
 * flow is now split in two:
 *   1. client asks /api/photos/presign for a signed PUT URL
 *   2. client PUTs the bytes directly to R2 (no Vercel in the loop)
 *   3. client POSTs to this endpoint with the metadata + r2_key
 */
export const GET: APIRoute = async ({ cookies }) => {
  if (!(await isAuthenticated(cookies))) return err('Unauthorized', 401);
  try {
    const rows = await listPhotos();
    // Enrich with the public R2 URL so the admin client can
    // re-download each image (e.g. to backfill blur_data_url for
    // rows uploaded before migration 0004). The value is derivable
    // from r2_key + R2_PUBLIC_URL, but only the server has those env
    // vars — cheaper to compute once here than expose R2_PUBLIC_URL
    // as a public/build-time var.
    const enriched = rows.map((r) => ({
      ...r,
      public_url: r2PublicUrl(r.r2_key),
    }));
    return ok({ photos: enriched });
  } catch (e) {
    return err(describe(e), 500);
  }
};

interface CreatePhotoBody {
  id?: string;
  r2_key?: string;
  filename?: string;
  title?: string;
  aspect_ratio?: number | string | null;
  aperture?: string | null;
  shutter?: string | null;
  iso?: string | null;
  status?: 'draft' | 'live';
  sort_order?: number | string;
  date_taken?: string | null;
  /** Base64 data URL of a ~32px pre-blurred JPEG of this photo.
   *  Generated client-side at upload. Used to paint a fixed
   *  "from image" wall in the expanded photo viewer. */
  blur_data_url?: string | null;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!(await isAuthenticated(cookies))) return err('Unauthorized', 401);

  let body: CreatePhotoBody;
  try {
    body = (await request.json()) as CreatePhotoBody;
  } catch {
    return err('Expected JSON body', 400);
  }

  const id = (body.id ?? '').trim();
  const r2Key = (body.r2_key ?? '').trim();
  const filename = (body.filename ?? '').trim();
  if (!id || !r2Key || !filename) return err('Missing id / r2_key / filename', 400);

  const title = (body.title ?? '').trim() || filename;
  const status: 'draft' | 'live' = body.status === 'live' ? 'live' : 'draft';
  const rawSort = Number(body.sort_order ?? 0);
  const sortOrder = Number.isFinite(rawSort) ? rawSort : 0;

  // Aspect ratio is measured client-side via `new Image()` before
  // upload. Layout derives from it — wide (≥ 1.4:1) gets the wider
  // tile slot in the gallery; everything else is standard.
  const rawAspect = Number(body.aspect_ratio ?? '');
  const aspectRatio = Number.isFinite(rawAspect) && rawAspect > 0 ? rawAspect : null;
  const layout: 'standard' | 'wide' = aspectRatio && aspectRatio >= 1.4 ? 'wide' : 'standard';

  // The admin's EXIF fields are whatever the client produced: either
  // auto-filled from browser-side exifr, or hand-typed. Normalize to
  // the display format either way so the public gallery never has to
  // guess (viewer types "1.8" → stored "ƒ/1.8"; "1/250" → "1/250s";
  // "100" → "ISO 100"; already-formatted values pass through).
  const aperture = normalizeAperture(body.aperture ?? null);
  const shutter = normalizeShutter(body.shutter ?? null);
  const iso = normalizeIso(body.iso ?? null);

  const dateTaken = (body.date_taken ?? null) || null;
  const blurDataUrl = typeof body.blur_data_url === 'string' && body.blur_data_url.startsWith('data:')
    ? body.blur_data_url
    : null;

  const row: PhotoRow = {
    id,
    title,
    filename,
    r2_key: r2Key,
    focal_length: null,
    aperture,
    shutter_speed: shutter,
    iso,
    camera: null,
    lens: null,
    category: null,
    layout,
    status,
    sort_order: sortOrder,
    date_taken: dateTaken,
    aspect_ratio: aspectRatio,
    blur_data_url: blurDataUrl,
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
