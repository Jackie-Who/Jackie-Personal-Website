import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';

/**
 * Astro 5 dropped the `hybrid` mode — `static` now supports per-page
 * opt-in server rendering via `export const prerender = false`. The
 * Vercel adapter handles dispatch between pre-rendered HTML and the
 * serverless function for routes marked non-prerender (admin + api).
 */
export default defineConfig({
  output: 'static',
  adapter: vercel(),
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false }),
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
