import type { APIRoute } from 'astro';
import { isAuthenticated } from '@/lib/auth';
import { presignUploadUrl, buildR2Key } from '@/lib/r2';
import { newId } from '@/lib/ids';

export const prerender = false;

/**
 * POST /api/music/presign
 *
 * Issues one or two short-lived presigned PUT URLs — one for the
 * audio file (required) and one for optional cover art. The browser
 * PUTs each file's bytes directly to R2 via those URLs, bypassing
 * Vercel's 4.5 MB serverless function body limit (which kills most
 * audio uploads on the multipart path).
 *
 * Request body (JSON):
 *   {
 *     audio_filename: string,
 *     audio_content_type: string,     // e.g. "audio/mpeg"
 *     cover_filename?: string,
 *     cover_content_type?: string,    // e.g. "image/jpeg"
 *   }
 *
 * Response (JSON):
 *   {
 *     id, audio_r2_key, audio_upload_url, audio_public_url,
 *     cover_r2_key?, cover_upload_url?, cover_public_url?,
 *   }
 *
 * The browser then PUTs each file to its upload_url, and finally
 * POSTs metadata to /api/music with the returned r2_keys.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!(await isAuthenticated(cookies))) return err('Unauthorized', 401);

  let body: {
    audio_filename?: string;
    audio_content_type?: string;
    cover_filename?: string;
    cover_content_type?: string;
  };
  try {
    body = await request.json();
  } catch {
    return err('Expected JSON body', 400);
  }

  const audioFilename = (body.audio_filename ?? '').trim();
  const audioContentType = (body.audio_content_type ?? '').trim();
  if (!audioFilename) return err('Missing audio_filename', 400);
  if (!audioContentType.startsWith('audio/')) {
    return err('audio_content_type must be an audio/* MIME', 400);
  }

  const hasCover = !!(body.cover_filename && body.cover_content_type);
  if (hasCover && !body.cover_content_type?.startsWith('image/')) {
    return err('cover_content_type must be an image/* MIME', 400);
  }

  const id = newId('t');
  const audioKey = buildR2Key('music', id, audioFilename);

  try {
    const audio = await presignUploadUrl(audioKey, audioContentType);
    const result: Record<string, string> = {
      id,
      audio_r2_key: audio.key,
      audio_upload_url: audio.url,
      audio_public_url: audio.publicUrl,
    };
    if (hasCover && body.cover_filename && body.cover_content_type) {
      const coverKey = buildR2Key('covers', id, body.cover_filename);
      const cover = await presignUploadUrl(coverKey, body.cover_content_type);
      result.cover_r2_key = cover.key;
      result.cover_upload_url = cover.url;
      result.cover_public_url = cover.publicUrl;
    }
    return ok(result);
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
