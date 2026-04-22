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
  const layout = ((form.get('layout') as string | null) ?? 'standard') as 'standard' | 'wide';
  const category = (form.get('category') as string | null) ?? null;
  const status = ((form.get('status') as string | null) ?? 'draft') as 'draft' | 'live';
  const sortOrder = Number((form.get('sort_order') as string | null) ?? 0);

  const buf = Buffer.from(await file.arrayBuffer());
  const exif = await extractExif(buf);

  // Respect explicit overrides from the admin form, else use EXIF.
  const focal = (form.get('focal') as string | null) ?? exif.focal;
  const aperture = (form.get('aperture') as string | null) ?? exif.aperture;
  const shutter = (form.get('shutter') as string | null) ?? exif.shutter;
  const iso = (form.get('iso') as string | null) ?? exif.iso;
  const camera = (form.get('camera') as string | null) ?? exif.camera;
  const lens = (form.get('lens') as string | null) ?? exif.lens;

  const id = newId('p');
  const key = buildR2Key('photos', id, file.name);

  try {
    await uploadToR2(key, buf, file.type || 'application/octet-stream');
  } catch (e) {
    return err(`R2 upload failed: ${describe(e)}`, 500);
  }

  const row: PhotoRow = {
    id,
    title,
    filename: file.name,
    r2_key: key,
    focal_length: focal,
    aperture,
    shutter_speed: shutter,
    iso,
    camera,
    lens,
    category,
    layout,
    status,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    created_at: new Date().toISOString(),
  };

  try {
    await insertPhoto(row);
  } catch (e) {
    return err(`DB insert failed: ${describe(e)}`, 500);
  }

  return ok({ photo: row }, 201);
};

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
