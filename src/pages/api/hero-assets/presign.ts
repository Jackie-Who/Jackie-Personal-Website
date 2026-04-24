import type { APIRoute } from 'astro';
import { isAuthenticated } from '@/lib/auth';
import { presignUploadUrl, buildR2Key } from '@/lib/r2';
import { newId } from '@/lib/ids';

export const prerender = false;

/**
 * POST /api/hero-assets/presign
 *
 * Returns a presigned PUT URL for uploading the hero's creative-side
 * image OR video directly to R2 from the browser. Used by the admin
 * HeroAssetsManager — same pattern as photos / music presign flows.
 *
 * Request body (JSON):
 *   { kind: 'image' | 'video', filename: string, contentType: string }
 *
 * Response (JSON):
 *   { r2_key, upload_url, public_url }
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!(await isAuthenticated(cookies))) return err('Unauthorized', 401);

  let body: { kind?: string; filename?: string; contentType?: string };
  try {
    body = await request.json();
  } catch {
    return err('Expected JSON body', 400);
  }

  const kind = body.kind;
  const filename = (body.filename ?? '').trim();
  const contentType = (body.contentType ?? '').trim();

  if (kind !== 'image' && kind !== 'video') {
    return err("kind must be 'image' or 'video'", 400);
  }
  if (!filename) return err('Missing filename', 400);
  if (kind === 'image' && !contentType.startsWith('image/')) {
    return err('contentType must be image/* for kind=image', 400);
  }
  if (kind === 'video' && !contentType.startsWith('video/')) {
    return err('contentType must be video/* for kind=video', 400);
  }

  // Object IDs distinguish image vs. video for storage hygiene —
  // hero/h_<id>-<filename> vs. hero-video/v_<id>-<filename>.
  const id = newId(kind === 'image' ? 'h' : 'v');
  const prefix = kind === 'image' ? 'hero' : 'hero-video';
  const key = buildR2Key(prefix, id, filename);

  try {
    const { url, publicUrl } = await presignUploadUrl(key, contentType);
    return ok({ r2_key: key, upload_url: url, public_url: publicUrl });
  } catch (e) {
    return err(`Presign failed: ${describe(e)}`, 500);
  }
};

function ok(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
function err(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
function describe(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
