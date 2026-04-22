import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import type { AstroCookies } from 'astro';

/**
 * Admin auth — single-password gate.
 *
 * `ADMIN_PASSWORD` env var is the plaintext password. On login we
 * hash + compare via bcrypt (the hashing adds a small server-side
 * cost that makes brute-forcing the env var non-trivial even if an
 * attacker ever gets access to this surface). On success we mint a
 * short-lived JWT signed with `AUTH_SECRET` and store it as an
 * httpOnly cookie; middleware checks it on every admin request.
 */

const COOKIE_NAME = 'jackie_admin';
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours
const ALG = 'HS256';

function readEnv(): { password: string; secret: string } {
  const env = import.meta.env;
  const get = (k: string) => (env as Record<string, string | undefined>)[k] ?? process.env[k];

  const password = get('ADMIN_PASSWORD');
  // `AUTH_SECRET` falls back to ADMIN_PASSWORD when unset so the admin
  // still works out-of-the-box for single-user deploys. Rotate in prod.
  const secret = get('AUTH_SECRET') ?? password ?? '';

  if (!password) {
    throw new Error('ADMIN_PASSWORD is not set. Populate .env before using /admin.');
  }
  return { password, secret };
}

/** Validate a plain-text password attempt against ADMIN_PASSWORD. */
export async function verifyPassword(attempt: string): Promise<boolean> {
  const { password } = readEnv();
  // We hash the known-good password at check time (not storage) so the
  // env var stays human-readable; bcrypt still provides constant-time
  // comparison through its compare function after re-hashing.
  const hash = await bcrypt.hash(password, 8);
  return bcrypt.compare(attempt, hash);
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
