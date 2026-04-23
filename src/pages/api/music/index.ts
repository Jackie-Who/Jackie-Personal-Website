import type { APIRoute } from 'astro';
import { isAuthenticated } from '@/lib/auth';
import { listTracks, insertTrack, type TrackRow } from '@/lib/db';
import { r2PublicUrl } from '@/lib/r2';

export const prerender = false;

/**
 * GET  /api/music  — list (admin only)
 * POST /api/music  — JSON body describing a track whose audio (and
 *                    optional cover) bytes have already been PUT to
 *                    R2 via the presigned URL flow.
 *
 * Upload path:
 *   1. client asks /api/music/presign for signed PUT URLs
 *   2. client PUTs audio bytes (and optional cover) straight to R2
 *   3. client POSTs to this endpoint with metadata + r2_keys
 *
 * Audio duration and recorded_date are extracted entirely on the
 * client (HTMLAudioElement.duration + File.lastModified), so the
 * server never needs the audio bytes and the 4.5 MB Vercel body
 * limit never applies.
 */
export const GET: APIRoute = async ({ cookies }) => {
  if (!(await isAuthenticated(cookies))) return err('Unauthorized', 401);
  try {
    const rows = await listTracks();
    // Enrich with public URLs (handy for admin previews + future
    // backfills). Derived from r2_key + R2_PUBLIC_URL server-side so
    // the env var never reaches the client.
    const enriched = rows.map((r) => ({
      ...r,
      audio_public_url: r2PublicUrl(r.audio_r2_key),
      cover_public_url: r.cover_r2_key ? r2PublicUrl(r.cover_r2_key) : null,
    }));
    return ok({ tracks: enriched });
  } catch (e) {
    return err(describe(e), 500);
  }
};

interface CreateTrackBody {
  id?: string;
  audio_r2_key?: string;
  audio_filename?: string;
  cover_r2_key?: string | null;
  cover_filename?: string | null;
  title?: string;
  composer?: string | null;
  duration_seconds?: number | string | null;
  recorded_date?: string | null;
  status?: 'draft' | 'live';
  sort_order?: number | string;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!(await isAuthenticated(cookies))) return err('Unauthorized', 401);

  let body: CreateTrackBody;
  try {
    body = (await request.json()) as CreateTrackBody;
  } catch {
    return err('Expected JSON body', 400);
  }

  const id = (body.id ?? '').trim();
  const audioKey = (body.audio_r2_key ?? '').trim();
  const audioFilename = (body.audio_filename ?? '').trim();
  if (!id || !audioKey || !audioFilename) {
    return err('Missing id / audio_r2_key / audio_filename', 400);
  }

  const coverKey = (body.cover_r2_key ?? '')?.trim() || null;
  const coverFilename = (body.cover_filename ?? '')?.trim() || null;

  const title = (body.title ?? '').trim() || audioFilename;
  const composer = (body.composer ?? '')?.trim() || null;
  const status: 'draft' | 'live' = body.status === 'live' ? 'live' : 'draft';
  const rawSort = Number(body.sort_order ?? 0);
  const sortOrder = Number.isFinite(rawSort) ? rawSort : 0;

  const rawDuration = Number(body.duration_seconds ?? 0);
  const durationSeconds = Number.isFinite(rawDuration) && rawDuration > 0
    ? Math.round(rawDuration)
    : null;

  const recordedDate = (body.recorded_date ?? null) || null;

  const row: TrackRow = {
    id,
    title,
    composer,
    audio_filename: audioFilename,
    audio_r2_key: audioKey,
    cover_filename: coverFilename,
    cover_r2_key: coverKey,
    duration_seconds: durationSeconds,
    // `type` and `notes` were dropped from the upload flow — stored
    // as null on new rows. Legacy rows keep whatever they had.
    type: null,
    recorded_date: recordedDate,
    notes: null,
    status,
    sort_order: sortOrder,
    created_at: new Date().toISOString(),
  };

  try {
    await insertTrack(row);
  } catch (e) {
    return err(`DB insert failed: ${describe(e)}`, 500);
  }

  return ok({ track: row }, 201);
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
