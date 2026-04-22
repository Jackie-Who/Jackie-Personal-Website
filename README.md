# Jackie's Personal Website

A bespoke portfolio split between two identities — **Technology** and **Creative** — built around a left-brain / right-brain interactive hero.

Owner: Yi Fei (Jackie) Hu · Langley, BC · [Jackie-Who](https://github.com/Jackie-Who)

---

## Stack

| Layer | Tool |
|-------|------|
| Framework | Astro 5 + React 19 islands |
| Styling | Tailwind CSS 3 + design-token CSS custom properties |
| 3D/WebGL | Three.js (Phase 6 — ships with SVG placeholder first) |
| Audio | Custom HTML5 Audio player |
| Hosting | Vercel |
| Database | Turso (SQLite) — Phase 5 |
| Asset storage | Cloudflare R2 — Phase 5 |

## Getting started

```bash
npm install
npm run dev       # http://localhost:4321
npm run build
npm run preview
```

## Directory layout

```
.
├── astro.config.mjs      — Astro + React + Tailwind + Vercel integrations
├── tailwind.config.mjs   — Design tokens (creative / tech / neutral palettes)
├── tsconfig.json         — Strict TS with @/* path alias
├── migrations/           — SQL migrations for Turso
├── public/               — Static assets (favicon, og-image, audio files)
└── src/
    ├── components/
    │   ├── hero/         — Phase 2: three-layer hero page
    │   ├── tech/         — Phase 3: scroll-snap portfolio + Discord bot showcase
    │   ├── creative/     — Phase 4: gallery + music panel
    │   ├── admin/        — Phase 5: CMS (login, photo + music managers)
    │   └── shared/       — CatMark, social icons
    ├── content/          — projects/, photos, tracks, resume, loader (DB → static fallback)
    ├── layouts/          — BaseLayout.astro (HTML shell) + AdminLayout.astro
    ├── lib/              — db / r2 / auth / exif / audio / ids (Phase 5)
    ├── middleware.ts     — Auth gate for /admin/*
    ├── pages/            — index, tech, creative, admin/, api/
    └── styles/           — globals.css (design tokens, resets)
```

## Design tokens

Three palettes, each with background → surface → border → accent → text hierarchy:

- **Creative** — `#0e0a12` bg, `#c8a0b8` accent, Playfair Display / Cormorant serif italic
- **Tech** — `#080c16` bg, `#5a9fd4` accent, JetBrains Mono
- **Neutral** — `#fafafa` bg, `#1a1a1a` accent, Inter (hero landing only)

Golden ratio split: `38.2% / 23.6% / 38.2%`. Panel transition: `550ms cubic-bezier(0.4, 0, 0.2, 1)`.

All tokens live in `tailwind.config.mjs` and mirror in `src/styles/globals.css` as CSS custom properties for inline use.

## Build phases

1. **Phase 1 — Foundation** ✅ Scaffolding, Tailwind tokens, base layout, placeholder pages.
2. **Phase 2 — Hero page** ✅ Three-layer architecture, panel sliding, code typing, compile transition.
3. **Phase 3 — Tech portfolio** ✅ Scroll-snap container, resume with metric cards, DiVA Discord agent project showcase.
4. **Phase 4 — Creative portfolio** ✅ Masonry gallery, expanded view with Lightroom bg picker, resizable music panel.
5. **Phase 5 — CMS** ✅ Auth (bcrypt + JWT), Turso photo + music CRUD, R2 upload, EXIF / audio-duration auto-extract. See `PHASE5.md`.
6. **Phase 6 — Polish** 🔜 Three.js brain, responsive, SEO, Lighthouse tuning.

## Environment variables

Copy `.env.example` to `.env`. All variables are Phase 5+; the site runs without them, falling back to static placeholder content on `/creative`.

```bash
ADMIN_PASSWORD=
AUTH_SECRET=
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
```

See `PHASE5.md` for full CMS setup instructions.

## Deploy

Vercel auto-detects Astro. Push to `main` and let the default build run. Set env vars in Vercel project settings to enable the CMS.

## Quality gates

Before marking any phase complete:

1. `npx astro build` passes clean
2. Keyboard navigation on every interactive element
3. `prefers-reduced-motion` respected
4. Lighthouse 90+ on all categories (enforced in Phase 6)
