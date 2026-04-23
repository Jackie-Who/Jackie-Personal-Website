# jackiehu.dev

A bespoke dual-identity portfolio split between **Technology** and **Creative**, held together by a left-brain / right-brain interactive hero. Live at [jackiehu.dev](https://jackiehu.dev).

This README is a walkthrough of how the site is built — the architecture, the infrastructure, and the patterns worth calling out. It's aimed at visitors who got curious after looking at the site, not at anyone trying to fork and run a copy.

---

## Architecture at a glance

```
  Visitor
    │
    ▼
  Vercel Edge  ──── Astro 5 (hybrid SSR + static)
    │                │
    │    ┌───────────┤
    │    │           │
    │    ▼           ▼
    │  Turso        Cloudflare R2
    │  (libSQL /    (S3-compatible
    │   SQLite)      object store)
    │    │           │
    │    │ rows      │ image + audio
    │    ▼           ▼ bytes
    │  Photo / track metadata
    ▼
  HTML + hydrated React islands
```

Most of the site is statically rendered at build time. Two routes opt into server rendering via `prerender = false`:

- `/creative` — refetches photos + tracks from Turso on each visit so new uploads show up without a redeploy.
- `/admin/*` and `/api/*` — the CMS needs a request context for auth + session cookies.

Everything else ships as static HTML.

---

## Tech stack

| Layer | Tool | Why this |
|-------|------|----------|
| Framework | [Astro 5](https://astro.build) + React 19 islands | Static-first so the hero pages are HTML-fast; React islands handle the interactive bits. |
| Styling | Tailwind 3 + CSS custom properties | Palette tokens live as CSS vars so a single `data-theme` flip swaps the whole creative page between light and dark. |
| Hero graphics | Canvas 2D (hand-rolled, no libraries) | The neural-web brain renders ~120 nodes + edges + firing synapses + particle bursts on a 2D canvas. A Three.js port would've added ~200 KB gzipped to the landing bundle for zero visible benefit. |
| Audio | `<audio>` + Web Audio `AnalyserNode` | The music-panel spectrum bars read real FFT data from the playing track — not a fake wave. |
| Hosting | [Vercel](https://vercel.com) | Free tier handles the traffic; the Astro adapter handles the hybrid rendering. |
| Database | [Turso](https://turso.tech) (libSQL / SQLite) | Free tier is generous for a personal site; sub-ms reads keep `/creative` SSR snappy. |
| Object storage | [Cloudflare R2](https://www.cloudflare.com/products/r2/) | S3-compatible, zero egress fees. Photos and audio files live here; signed URLs let the browser upload bytes directly without routing through Vercel's 4.5 MB function-body limit. |
| Auth | bcryptjs + [JOSE](https://github.com/panva/jose) JWT cookies | Stateless session cookies (httpOnly, SameSite=lax), no session store to run. |

---

## Design system

Three palettes, each with a background → surface → border → accent → text stack:

- **Creative — "Mist"** (dark default) and **"Cream"** (light twin). Pastel pale-blue accent on a cool near-black in dark mode, deeper sky-blue on warm cream in light. One CSS var block per mode; the toggle flips `data-theme='light'` on `.creative-app` and every `rgba(var(--creative-accent-rgb), …)` elsewhere in the stylesheet morphs with it.
- **Tech** — deeper blue on near-black, JetBrains Mono throughout, narrow dot-nav sidebar.
- **Neutral** — near-white + near-black, Inter. Used only on the hero landing.

Golden-ratio layout on the hero: `38.2% / 23.6% / 38.2%`, split between the creative panel, the center anchor (brain + cat + signature), and the tech panel. Panel transitions use a `550 ms cubic-bezier(0.4, 0, 0.2, 1)` everywhere for a consistent rhythm.

The hero's state machine uses three data attributes:

- `[data-takeover]` — instant state (colors, brain hemisphere activation, panel flex).
- `[data-visual]` — lagged 200 ms so text fades to opacity 0 before its font-family swaps.
- `[data-fading]` — boolean set during that 200 ms window so the opacity fade knows when to run.

Text never flashes a half-swapped font because the fade-out always finishes before the font changes.

---

## Notable patterns

### Presigned-URL uploads

Vercel caps serverless function request bodies at 4.5 MB. A single decent photo is 5-15 MB and a WAV file is routinely bigger than that. The CMS solves it by never sending bytes through the function:

1. Browser hits `POST /api/photos/presign` with just the filename + MIME type.
2. Server builds a presigned S3 PUT URL from R2 credentials and returns it.
3. Browser `PUT`s the file bytes directly to R2 over HTTPS.
4. Browser hits `POST /api/photos` with the final metadata (r2_key, EXIF, aspect ratio, blur data).

The Vercel function is only ever touching small JSON payloads. R2's per-object ceiling is 5 TB.

### Client-side media processing

Everything the server used to do to uploaded bytes now happens in the browser before the upload:

- **EXIF** — [exifr](https://github.com/MikeKovarik/exifr) reads aperture / shutter / ISO / DateTimeOriginal from the local `File` object.
- **Audio duration** — a hidden `<audio>` element emits `loadedmetadata`, we read `audio.duration`.
- **Blur-preview for photo-expanded backdrops** — a 96 px JPEG baked via a canvas downscale, stored as a base64 data URL on the photo row. The expanded-view's "from image" wall reads this pre-baked bitmap instead of applying a live 60 px blur filter to the full-res photo each frame.

Server stays stateless; uploads scale to file sizes the serverless body limit would otherwise kill.

### Graceful DB fallback

`/content/loader.ts` is the contract between the static placeholder data and the live database:

```ts
if (!isR2Configured() || !(await isDbReady())) return staticPhotos;
const rows = await listPhotos({ publishedOnly: true });
if (rows.length === 0) return staticPhotos;
return rows.map(rowToPhoto);
```

Result: the site renders fine even with no credentials in the environment — you just get the placeholder gradient photos and the canonical classical track list. This is what let `/` and `/tech` ship in phases 1–4 before the CMS existed.

### Three-layer hero architecture

The hero page is three independent layers stacked via z-index:

1. **`VisualPanels`** (z: 0) — three flex children that resize on takeover.
2. **`CodeBackground`** (z: 1) — imperative char-by-char DOM writes of an HTML document at 8 ms/char, 60 fps. Uses direct DOM mutation instead of React state because re-rendering the whole tree every frame at 60 fps would tank performance.
3. **`CenterAnchor`** (z: 5) — fixed 23.6 %-wide center column with the neural-brain canvas, the cat mark, the rotating signature, and the description line.
4. **`HitZones`** (z: 10) — three invisible golden-ratio buttons that capture hover / focus and fire takeover events.

Each layer only concerns itself with its own state; the data attributes on the root `.hero-app` are the only shared vocabulary.

### Neural-web brain

The hero's centerpiece is a 180 × 180 Canvas 2D rendering of a two-hemisphere neural web. Each frame of the rAF loop:

- Updates ambient sine drift on every node (gentle breathing motion).
- Applies cursor repulsion to nodes within 80 px of the pointer, with spring-return via linear interpolation.
- Follows cursor parallax — nodes shift by `z × parallax`, giving a pseudo-3D depth feel without a real 3D pipeline.
- Fires a random synapse (~every 420 ms on the active hemisphere) that sends a bright signal particle traveling along one of its edges, sometimes chain-firing the neighbor on arrival.
- Triggers a 4-signal corpus-callosum pulse when the takeover side changes — the "decision" crossing the midline.
- Fires a 30-particle click-burst from the active hemisphere's centroid when the viewer clicks to expand into a side page, ~500 ms before the page actually swipes.

All colors are driven by the takeover state and lerped per-frame so transitions between Mist / Cream / neutral read smoothly. Reduced-motion preference skips the rAF loop entirely and draws a single static frame.

---

## Build phases (how the site grew)

1. **Foundation** — Astro scaffold, Tailwind tokens, base layout, placeholder pages.
2. **Hero** — three-layer architecture, panel sliding, code typing animation, compile-to-page transitions.
3. **Tech** — scroll-snap portfolio container, resume with real metric cards, DiVA Discord-bot live showcase.
4. **Creative** — column-masonry then justified-rows gallery, expanded view with Lightroom wall presets, resizable music panel with reactive spectrum.
5. **CMS** — bcrypt + JOSE auth, Turso photo + music CRUD, R2 presigned uploads, EXIF / audio-duration / blur-preview client-side extraction.
6. **Polish** — neural-web brain, creative loading screen, per-bg-mode legibility, caption scroll-settle, volume UX, cursor whimsy (music-note burst).

---

Built by Yi Fei (Jackie) Hu — [GitHub](https://github.com/Jackie-Who) · [jackiehu.dev](https://jackiehu.dev)
