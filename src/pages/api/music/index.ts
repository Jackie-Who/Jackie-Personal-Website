import type { APIRoute } from 'astro';
import { isAuthenticated } from '@/lib/auth';
import { listTracks, insertTrack, type TrackRow } from '@/lib/db';
import { uploadToR2, buildR2Key } from '@/lib/r2';
import { extractAudioMetadata } from '@/lib/audio';
import { newId } from '@/lib/ids';

export const prerender = false;

/**
 * GET  /api/music  — list (admin only)
 * POST /api/music  — multipart/form-data with audio (required), cover (optional) + fields
 */
export const GET: APIRoute = async ({ cookies }) => {
  if (!(await isAuthenticated(cookies))) return err('Unauthorized', 401);
  try {
    const rows = await listTracks();
    return ok({ tracks: rows });
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

  const audio = form.get('audio');
  if (!(audio instanceof File)) return err('Missing audio field', 400);
  const cover = form.get('cover');
  const coverFile = cover instanceof File && cover.size > 0 ? cover : null;

  const title = (form.get('title') as string | null) ?? audio.name;
  const composer = (form.get('composer') as string | null) ?? null;
  const type = (form.get('type') as string | null) ?? null;
  const recordedDate = (form.get('recorded_date') as string | null) ?? null;
  const notes = (form.get('notes') as string | null) ?? null;
  const status = ((form.get('status') as string | null) ?? 'draft') as 'draft' | 'live';
  const sortOrder = Number((form.get('sort_order') as string | null) ?? 0);

  const audioBuf = Buffer.from(await audio.arrayBuffer());
  const meta = await extractAudioMetadata(audioBuf, audio.type);

  const id = newId('t');
  const audioKey = buildR2Key('music', id, audio.name);

  try {
    await uploadToR2(audioKey, audioBuf, audio.type || 'audio/mpeg');
  } catch (e) {
    return err(`R2 audio upload failed: ${describe(e)}`, 500);
  }

  let coverKey: string | null = null;
  if (coverFile) {
    const coverBuf = Buffer.from(await coverFile.arrayBuffer());
    coverKey = buildR2Key('covers', id, coverFile.name);
    try {
      await uploadToR2(coverKey, coverBuf, coverFile.type || 'image/jpeg');
    } catch (e) {
      return err(`R2 cover upload failed: ${describe(e)}`, 500);
    }
  }

  const row: TrackRow = {
    id,
    title,
    composer,
    audio_filename: audio.name,
    audio_r2_key: audioKey,
    cover_filename: coverFile?.name ?? null,
    cover_r2_key: coverKey,
    duration_seconds: meta.durationSeconds,
    type,
    recorded_date: recordedDate,
    notes,
    status,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
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
