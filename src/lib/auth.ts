import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import type { AstroCookies } from 'astro';

/**
 * Admin auth — username + password gate.
 *
 * `ADMIN_USERNAME` and `ADMIN_PASSWORD` are the plaintext credentials,
 * stored as env vars. On login we compare them via bcrypt (the hash is
 * computed at check time, not stored — the env vars stay human-readable
 * and the bcrypt pass still buys constant-time comparison). On success
 * we mint a short-lived JWT signed with `AUTH_SECRET` and store it as
 * an httpOnly cookie; middleware checks it on every admin request.
 *
 * Two-field auth is mostly a "second factor" against brute-force of
 * the password alone — an attacker has to guess both the username and
 * the password, and each attempt still costs a bcrypt hash.
 */

const COOKIE_NAME = 'jackie_admin';
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours
const ALG = 'HS256';

interface AdminEnv {
  username: string;
  password: string;
  secret: string;
}

function readEnv(): AdminEnv {
  const env = import.meta.env;
  const get = (k: string) => (env as Record<string, string | undefined>)[k] ?? process.env[k];

  const username = get('ADMIN_USERNAME');
  const password = get('ADMIN_PASSWORD');
  // `AUTH_SECRET` falls back to ADMIN_PASSWORD when unset so the admin
  // still works out-of-the-box for single-user deploys. Rotate in prod.
  const secret = get('AUTH_SECRET') ?? password ?? '';

  if (!username || !password) {
    throw new Error(
      'ADMIN_USERNAME and ADMIN_PASSWORD must both be set. Populate .env (or Vercel env vars) before using /admin.',
    );
  }
  return { username, password, secret };
}

/**
 * Validate a username + password attempt.
 *
 * Both checks run (even when the username is wrong) so timing
 * doesn't leak which field was wrong. We hash each known-good value
 * at check time and rely on bcrypt's constant-time compare.
 */
export async function verifyCredentials(
  attemptUsername: string,
  attemptPassword: string,
): Promise<boolean> {
  const { username, password } = readEnv();
  const uHash = await bcrypt.hash(username, 8);
  const pHash = await bcrypt.hash(password, 8);
  const [uOk, pOk] = await Promise.all([
    bcrypt.compare(attemptUsername, uHash),
    bcrypt.compare(attemptPassword, pHash),
  ]);
  return uOk && pOk;
}

/** Mint a signed session token. */
export async function issueSession(): Promise<string> {
  const { secret } = readEnv();
  const key = new TextEncoder().encode(secret);
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setIssuer('jackie-admin')
    .setExpirationTime(`${COOKIE_MAX_AGE}s`)
    .sign(key);
}

/** Verify a session token; returns `true` if valid + not expired. */
export async function verifySession(token: string): Promise<boolean> {
  try {
    const { secret } = readEnv();
    const key = new TextEncoder().encode(secret);
    await jwtVerify(token, key, { issuer: 'jackie-admin' });
    return true;
  } catch {
    return false;
  }
}

export function setSessionCookie(cookies: AstroCookies, token: string): void {
  cookies.set(COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
  });
}

export function clearSessionCookie(cookies: AstroCookies): void {
  cookies.delete(COOKIE_NAME, { path: '/' });
}

export function readSessionCookie(cookies: AstroCookies): string | null {
  const c = cookies.get(COOKIE_NAME);
  return c?.value ?? null;
}

/**
 * Helper for Astro pages / API routes — returns `true` when the
 * request is authenticated. Use at the top of any admin page / API
 * handler. Call site is responsible for redirecting / 401-ing.
 */
export async function isAuthenticated(cookies: AstroCookies): Promise<boolean> {
  const token = readSessionCookie(cookies);
  if (!token) return false;
  return verifySession(token);
}
