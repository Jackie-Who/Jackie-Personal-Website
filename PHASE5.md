# Phase 5 — CMS

The admin panel (`/admin`) lets you upload, edit, and publish photos and
music tracks without redeploying. This doc covers turning the CMS on.

## What ships in Phase 5

| Piece | Where |
|-------|-------|
| Auth gate (session-cookie JWT, bcrypt password check) | `src/lib/auth.ts`, `src/middleware.ts` |
| Turso (libSQL) client + queries | `src/lib/db.ts` |
| Cloudflare R2 upload / delete | `src/lib/r2.ts` |
| EXIF auto-extraction | `src/lib/exif.ts` |
| Audio duration detection | `src/lib/audio.ts` |
| REST API (10 endpoints) | `src/pages/api/auth/*.ts`, `src/pages/api/photos/*.ts`, `src/pages/api/music/*.ts` |
| Admin UI (login, photos, music) | `src/pages/admin/*.astro`, `src/components/admin/*.tsx`, `src/layouts/AdminLayout.astro` |
| Dynamic content loader (fallback to static) | `src/content/loader.ts` — used by `src/pages/creative.astro` |
| SQL migration | `migrations/0001_init.sql` |

Every admin page + API route is server-rendered (`export const prerender = false`);
the rest of the site stays pre-rendered.

## Dependencies added

```
npm install @libsql/client @aws-sdk/client-s3 @aws-sdk/s3-request-presigner bcryptjs jose exifr music-metadata
npm install --save-dev @types/bcryptjs
```

## Provision the backend

### 1. Turso database

```bash
turso db create jackie-site            # pick a region close to your deploy
turso db show jackie-site --url        # → TURSO_DATABASE_URL
turso db tokens create jackie-site     # → TURSO_AUTH_TOKEN
turso db shell jackie-site < migrations/0001_init.sql
```

### 2. Cloudflare R2 bucket

1. Create a bucket (e.g. `jackie-site-assets`).
2. Issue an API token with **Object Read & Write** on that bucket.
3. Enable public access via `r2.dev` or attach a custom domain —
   that URL becomes `R2_PUBLIC_URL`.

### 3. Environment variables

Copy `.env.example` → `.env` and fill:

```
ADMIN_USERNAME=<pick any username>
ADMIN_PASSWORD=<pick a long password>
AUTH_SECRET=<long random string — `openssl rand -hex 32`>
TURSO_DATABASE_URL=libsql://jackie-site-<account>.turso.io
TURSO_AUTH_TOKEN=<from `turso db tokens create`>
R2_ACCOUNT_ID=<Cloudflare account ID>
R2_ACCESS_KEY_ID=<R2 token>
R2_SECRET_ACCESS_KEY=<R2 token secret>
R2_BUCKET_NAME=jackie-site-assets
R2_PUBLIC_URL=https://assets.your-domain.com
```

On Vercel, paste these into **Project → Settings → Environment Variables** (see the top-level `VERCEL-SETUP.md` for the full click-through walkthrough).

## Sign in

Visit `/admin/login`, enter `ADMIN_PASSWORD`. Session cookie lasts 8 h.

## Graceful degradation

- `/creative` server-renders on every request. When Turso + R2 aren't
  configured, the loader (`src/content/loader.ts`) falls back to the
  static placeholder arrays in `src/content/photos.ts` + `tracks.ts`,
  so the public page keeps working during Phases 1–4.
- Admin pages flag missing config with a banner and refuse to let
  uploads proceed — no half-successful uploads.

## API endpoints

```
POST   /api/auth/login              Body: { password } → sets cookie
POST   /api/auth/logout             Clears cookie
GET    /api/photos                  List all (admin only)
POST   /api/photos                  multipart/form-data; uploads to R2, auto-EXIF
PUT    /api/photos/:id              JSON patch (metadata only)
DELETE /api/photos/:id              Removes row + R2 object
GET    /api/music                   List all (admin only)
POST   /api/music                   multipart; audio required, cover optional, auto-duration
PUT    /api/music/:id               JSON patch
DELETE /api/music/:id               Removes row + R2 object(s)
```

Auth is verified by `src/middleware.ts` for HTML routes; API routes
check the session cookie themselves and return JSON 401.

## Known follow-ups

- Public site still reads from static fallback when DB has no rows.
  If you want an empty state instead, change `loadPhotos()` / `loadTracks()`
  in `src/content/loader.ts` to return `[]` on empty.
- `/tech` projects are still hardcoded (`src/content/projects/`). If we
  want those editable too, extend the schema + admin with a `projects`
  table in a follow-up.
- Image resizing happens client-side (browser renders the full file).
  Upgrade path: plug a Cloudflare Images transform into `R2_PUBLIC_URL`
  or add an `/api/img/[id]` resizer that pipes through Vercel image opt.
