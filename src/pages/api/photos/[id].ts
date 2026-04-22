import type { APIRoute } from 'astro';
import { isAuthenticated } from '@/lib/auth';
import { getPhoto, updatePhoto, deletePhoto, type PhotoRow } from '@/lib/db';
import { deleteFromR2 } from '@/lib/r2';

export const prerender = false;

/**
 * PUT    /api/photos/:id  — metadata update (JSON body)
 * DELETE /api/photos/:id  — removes row + R2 object
 */
export const PUT: APIRoute = async ({ request, cookies, params }) => {
  if (!(await isAuthenticated(cookies))) return err('Unauthorized', 401);
  const id = params.id;
  if (!id) return err('Missing id', 400);

  let patch: Partial<PhotoRow> = {};
  try {
    patch = await request.json();
  } catch {
    return err('Invalid JSON', 400);
  }

  // Disallow editing the immutable identity + storage key fields.
  delete (patch as { id?: string }).id;
  delete (patch as { r2_key?: string }).r2_key;
  delete (patch as { created_at?: string }).created_at;

  try {
    const existing = await getPhoto(id);
    if (!existing) return err('Not found', 404);
    await updatePhoto(id, patch);
    const updated = await getPhoto(id);
    return ok({ photo: updated });
  } catch (e) {
    return err(describe(e), 500);
  }
};

export const DELETE: APIRoute = async ({ cookies, params }) => {
  if (!(await isAuthenticated(cookies))) return err('Unauthorized', 401);
  const id = params.id;
  if (!id) return err('Missing id', 400);

  try {
    const row = await getPhoto(id);
    if (!row) return err('Not found', 404);

    // Delete R2 object first; if that fails the row stays so the
    // admin can retry. A half-deleted state (DB gone, R2 present)
    // would orphan the blob.
    try {
      await deleteFromR2(row.r2_key);
    } catch (e) {
      return err(`R2 delete failed: ${describe(e)}`, 500);
    }
    await deletePhoto(id);
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
