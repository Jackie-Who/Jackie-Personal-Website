import type { APIRoute } from 'astro';
import { verifyPassword, issueSession, setSessionCookie } from '@/lib/auth';

export const prerender = false;

/**
 * POST /api/auth/login
 *
 * Body: { password: string }
 * Response: 200 + Set-Cookie on success, 401 on bad password.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  let body: { password?: string } = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const pw = typeof body.password === 'string' ? body.password : '';
  if (!pw) return json({ error: 'Password required' }, 400);

  try {
    const ok = await verifyPassword(pw);
    if (!ok) return json({ error: 'Incorrect password' }, 401);

    const token = await issueSession();
    setSessionCookie(cookies, token);
    return json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return json({ error: msg }, 500);
  }
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
