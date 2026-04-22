import type { APIRoute } from 'astro';
import { isAuthenticated } from '@/lib/auth';
import { getTrack, updateTrack, deleteTrack, type TrackRow } from '@/lib/db';
import { deleteFromR2 } from '@/lib/r2';

export const prerender = false;

export const PUT: APIRoute = async ({ request, cookies, params }) => {
  if (!(await isAuthenticated(cookies))) return err('Unauthorized', 401);
  const id = params.id;
  if (!id) return err('Missing id', 400);

  let patch: Partial<TrackRow> = {};
  try {
    patch = await request.json();
  } catch {
    return err('Invalid JSON', 400);
  }

  // Immutable fields
  delete (patch as { id?: string }).id;
  delete (patch as { audio_r2_key?: string }).audio_r2_key;
  delete (patch as { cover_r2_key?: string }).cover_r2_key;
  delete (patch as { created_at?: string }).created_at;

  try {
    const existing = await getTrack(id);
    if (!existing) return err('Not found', 404);
    await updateTrack(id, patch);
    const updated = await getTrack(id);
    return ok({ track: updated });
  } catch (e) {
    return err(describe(e), 500);
  }
};

export const DELETE: APIRoute = async ({ cookies, params }) => {
  if (!(await isAuthenticated(cookies))) return err('Unauthorized', 401);
  const id = params.id;
  if (!id) return err('Missing id', 400);

  try {
    const row = await getTrack(id);
    if (!row) return err('Not found', 404);

    try {
      await deleteFromR2(row.audio_r2_key);
      if (row.cover_r2_key) await deleteFromR2(row.cover_r2_key);
    } catch (e) {
      return err(`R2 delete failed: ${describe(e)}`, 500);
    }
    await deleteTrack(id);
    return ok({ ok: true });
  } catch (e) {
    return err(describe(e), 500);
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
