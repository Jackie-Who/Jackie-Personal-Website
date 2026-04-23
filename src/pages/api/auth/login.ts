import type { APIRoute } from 'astro';
import { verifyCredentials, issueSession, setSessionCookie } from '@/lib/auth';

export const prerender = false;

/**
 * POST /api/auth/login
 *
 * Body: { username: string, password: string }
 * Response: 200 + Set-Cookie on success, 401 on bad credentials.
 *
 * Note: the error message doesn't distinguish between a wrong
 * username and a wrong password — less info for a would-be attacker.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  let body: { username?: string; password?: string } = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const username = typeof body.username === 'string' ? body.username : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!username || !password) {
    return json({ error: 'Username and password are required' }, 400);
  }

  try {
    const ok = await verifyCredentials(username, password);
    if (!ok) return json({ error: 'Incorrect username or password' }, 401);

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
