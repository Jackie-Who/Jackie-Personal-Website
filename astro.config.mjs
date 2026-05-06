import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

/**
 * Astro 5 dropped the `hybrid` mode — `static` now supports per-page
 * opt-in server rendering via `export const prerender = false`. The
 * Vercel adapter handles dispatch between pre-rendered HTML and the
 * serverless function for routes marked non-prerender (admin + api).
 */
export default defineConfig({
  // Canonical site URL. Used for:
  //  - BaseLayout's <link rel="canonical"> and og:url
  //  - @astrojs/sitemap absolute URLs
  // Without this, Astro builds canonical URLs from the request host —
  // so Vercel preview URLs (jackiehu-xxx.vercel.app) would leak into
  // the search index when crawled.
  site: 'https://jackiehu.dev',
  output: 'static',
  adapter: vercel(),
  /**
   * Disable Astro's built-in Origin-header check for state-changing
   * requests. On Vercel, the edge layer rewrites request headers in
   * a way that Astro's comparator doesn't always accept, so
   * multipart/form-data POSTs (e.g. photo + music uploads) get a
   * silent 403 even though they're same-origin.
   *
   * CSRF protection is still enforced via the session cookie —
   * `SameSite=lax` + `httpOnly` (see lib/auth.ts) means a malicious
   * third-party site can't forge a request that carries the admin
   * session. Astro's origin check is redundant in that setup.
   */
  security: {
    checkOrigin: false,
  },
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false }),
    // Sitemap auto-generated from prerendered routes at build time.
    // Excludes admin / api / login routes — those are private surfaces
    // that shouldn't appear in search results. The remaining public
    // routes (`/`, `/tech`, `/creative`) are emitted to /sitemap-index.xml.
    sitemap({
      filter: (page) =>
        !page.includes('/admin') && !page.includes('/api') && !page.includes('/login'),
    }),
  ],
  server: {
    port: 4321,
    host: true,
  },
  vite: {
    ssr: {
      noExternal: [],
    },
  },
});
