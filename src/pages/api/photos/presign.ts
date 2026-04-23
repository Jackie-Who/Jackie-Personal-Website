import type { APIRoute } from 'astro';
import { isAuthenticated } from '@/lib/auth';
import { presignUploadUrl, buildR2Key } from '@/lib/r2';
import { newId } from '@/lib/ids';

export const prerender = false;

/**
 * POST /api/photos/presign
 *
 * Issues a short-lived presigned PUT URL the browser uses to send
 * the photo's raw bytes directly to R2. This bypasses Vercel's
 * 4.5 MB serverless function body limit (which blocks files bigger
 * than ~4 MB before they ever reach /api/photos).
 *
 * Request body (JSON):
 *   { filename: string, contentType: string }
 *
 * Response (JSON):
 *   { id, r2_key, upload_url, public_url }
 *
 * The browser then PUTs the file bytes to `upload_url` with the
 * same `Content-Type` header, and finally POSTs the metadata to
 * /api/photos with `r2_key` so the server knows where to attach
 * the DB row.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!(await isAuthenticated(cookies))) return err('Unauthorized', 401);

  let body: { filename?: string; contentType?: string };
  try {
    body = await request.json();
  } catch {
    return err('Expected JSON body', 400);
  }

  const filename = (body.filename ?? '').trim();
  const contentType = (body.contentType ?? '').trim();
  if (!filename) return err('Missing filename', 400);
  if (!contentType.startsWith('image/')) return err('contentType must be an image/* MIME', 400);

  const id = newId('p');
  const key = buildR2Key('photos', id, filename);

  try {
    const { url, publicUrl } = await presignUploadUrl(key, contentType);
    return ok({ id, r2_key: key, upload_url: url, public_url: publicUrl });
  } catch (e) {
    return err(`Presign failed: ${describe(e)}`, 500);
  }
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
