import { defineMiddleware } from 'astro:middleware';
import { isAuthenticated } from '@/lib/auth';

/**
 * Gate every /admin/* route (except /admin/login) behind a session
 * check. API routes handle their own auth so they can return JSON
 * 401s rather than HTML redirects.
 *
 * Astro redirects issued from inside a layout component get
 * discarded; middleware is the correct surface for auth gates.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const path = url.pathname;

  // Only gate admin pages (not the login page itself, and not APIs).
  if (!path.startsWith('/admin')) return next();
  if (path === '/admin/login' || path.startsWith('/admin/login/')) return next();

  let authed = false;
  try {
    authed = await isAuthenticated(context.cookies);
  } catch {
    authed = false;
  }

  if (!authed) {
    return context.redirect('/admin/login');
  }

  return next();
});
