import type { APIRoute } from 'astro';
import { isAuthenticated } from '@/lib/auth';
import { getHeroAssets, updateHeroAssets, type HeroAssetsRow } from '@/lib/db';
import { r2PublicUrl } from '@/lib/r2';

export const prerender = false;

/**
 * GET  /api/hero-assets — current singleton row (admin only).
 *                         Enriched with public_url fields derived
 *                         from r2_key + R2_PUBLIC_URL.
 * PUT  /api/hero-assets — replace one or both r2_key/filename pairs.
 *                         JSON body: any subset of HeroAssetsRow's
 *                         editable fields.
 *
 * Upload flow mirrors photos / music: client gets a presigned URL
 * from /api/hero-assets/presign, PUTs the file directly to R2, then
 * PUTs the metadata here. The function only touches small JSON
 * payloads — never the file bytes themselves.
 */
export const GET: APIRoute = async ({ cookies }) => {
  if (!(await isAuthenticated(cookies))) return err('Unauthorized', 401);
  try {
    const row = await getHeroAssets();
    if (!row) return ok({ assets: null });
    return ok({
      assets: {
        ...row,
        creative_image_public_url: row.creative_image_r2_key
          ? r2PublicUrl(row.creative_image_r2_key)
          : null,
        creative_video_public_url: row.creative_video_r2_key
          ? r2PublicUrl(row.creative_video_r2_key)
          : null,
      },
    });
  } catch (e) {
    return err(describe(e), 500);
  }
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  if (!(await isAuthenticated(cookies))) return err('Unauthorized', 401);

  let body: Partial<HeroAssetsRow>;
  try {
    body = (await request.json()) as Partial<HeroAssetsRow>;
  } catch {
    return err('Expected JSON body', 400);
  }

  // Only the four media fields are user-editable.
  const patch: Partial<HeroAssetsRow> = {};
  if ('creative_image_r2_key' in body) patch.creative_image_r2_key = body.creative_image_r2_key ?? null;
  if ('creative_image_filename' in body) patch.creative_image_filename = body.creative_image_filename ?? null;
  if ('creative_video_r2_key' in body) patch.creative_video_r2_key = body.creative_video_r2_key ?? null;
  if ('creative_video_filename' in body) patch.creative_video_filename = body.creative_video_filename ?? null;

  if (Object.keys(patch).length === 0) {
    return err('No editable fields in body', 400);
  }

  try {
    await updateHeroAssets(patch);
    const updated = await getHeroAssets();
    return ok({ assets: updated });
  } catch (e) {
    return err(`DB update failed: ${describe(e)}`, 500);
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
