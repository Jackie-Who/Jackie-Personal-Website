import { useEffect, useRef } from 'react';
import CatMark from '@/components/shared/CatMark';
import type { Takeover } from './HeroSection';

interface Props {
  /** Lagged takeover — drives the signature/description font + text
   *  swap during the 200 ms fade-through. Separate from `takeover`
   *  so the brain (which now lives in its own hero-level layer) can
   *  react instantly while text waits its turn. */
  visualTakeover: Takeover;
}

const DESCRIPTIONS: Record<Takeover, string> = {
  neutral: 'a bit of everything…',
  creative: 'a bit of life',
  tech: 'a bit of work',
};

/* 25 display/script faces that flicker under the "Jackie" signature
   while creative is hovered. Cycled at ~7 fps (140ms) for roughly a
   3.5s unique span, then reshuffled so the sequence feels fresh. */
const FANCY_FONTS = [
  '"Playfair Display", serif',
  '"Cormorant Garamond", serif',
  '"Instrument Serif", serif',
  '"DM Serif Display", serif',
  '"Abril Fatface", serif',
  '"Bodoni Moda", serif',
  '"Fraunces", serif',
  '"Yeseva One", serif',
  '"Cinzel", serif',
  '"Marcellus", serif',
  '"Italiana", serif',
  '"Forum", serif',
  '"Cardo", serif',
  '"Pinyon Script", cursive',
  '"Great Vibes", cursive',
  '"Dancing Script", cursive',
  '"Parisienne", cursive',
  '"Tangerine", cursive',
  '"Lobster", cursive',
  '"Caveat", cursive',
  '"Sacramento", cursive',
  '"Satisfy", cursive',
  '"Yellowtail", cursive',
  '"Kaushan Script", cursive',
  '"Alex Brush", cursive',
];

/** The 22 cycle-only fonts that aren't already loaded eagerly by
 *  BaseLayout. We inject this stylesheet lazily — once, the first
 *  time a viewer enters the creative side — so first-paint font
 *  cost stays tiny for visitors who never trigger the cycle. */
const LAZY_FONT_HREF =
  'https://fonts.googleapis.com/css2?' +
  'family=Abril+Fatface&family=Alex+Brush&family=Bodoni+Moda:wght@500' +
  '&family=Cardo&family=Caveat:wght@500&family=Cinzel:wght@500' +
  '&family=DM+Serif+Display&family=Dancing+Script:wght@500&family=Forum' +
  '&family=Fraunces:wght@500&family=Great+Vibes&family=Italiana' +
  '&family=Kaushan+Script&family=Lobster&family=Marcellus' +
  '&family=Parisienne&family=Pinyon+Script&family=Sacramento' +
  '&family=Satisfy&family=Tangerine:wght@700&family=Yellowtail' +
  '&family=Yeseva+One&display=swap';

// ──────────────────────────────────────────────────────────────
// Font-cycle tunables.
// ──────────────────────────────────────────────────────────────
/** Tick duration. 140 ms ≈ 7 fps which reads as a flicker rather
 *  than animation. Lower → strobier; higher → too lazy to read as
 *  shimmering. */
const FLICKER_INTERVAL_MS = 140;
/** Minimum number of FANCY_FONTS that must be loaded before the
 *  cycle is allowed to start. The 3 eager fonts (Playfair / Cormorant
 *  / Instrument) are always available, so this gates against starting
 *  with too-little variety on a cold cache. */
const MIN_READY_TO_CYCLE = 6;
/** Hard cap on the priming phase. If 6 fonts haven't loaded after
 *  this long, start the cycle anyway with whatever's ready — better
 *  to flicker through the 3 eager faces than hold the static default
 *  indefinitely on a slow connection. */
const MAX_PRIMING_MS = 220;

/** Once the cycle has primed and started in this page-load, skip
 *  the priming phase on subsequent hovers — fonts are cached, no
 *  reason to wait. Module-level so it survives effect re-runs. */
let cycleHasPrimed = false;
/** ensureLazyFonts gate. */
let lazyFontsRequested = false;

/** Extract the first quoted family name from a font stack like
 *  `'"Playfair Display", serif'`. Returns null for stacks that
 *  start with a generic (no quoted name to track). */
function firstFamily(fontStack: string): string | null {
  return fontStack.match(/"([^"]+)"/)?.[1] ?? null;
}

/** Is a given FANCY_FONTS entry currently renderable with its real
 *  woff2, not a serif/cursive fallback? Uses the FontFaceSet API
 *  (`document.fonts.check`), which is authoritative when supported.
 *  Falls back to optimistic `true` on browsers without FontFaceSet
 *  (very old; current code's behavior anyway). */
function isFontReady(fontStack: string): boolean {
  const family = firstFamily(fontStack);
  if (!family) return true;
  if (typeof document === 'undefined') return false;
  if (!document.fonts?.check) return true;
  // .check() needs a CSS shorthand; the 16 px is arbitrary, just to
  // satisfy the parser. The check is per-family, size-independent.
  try {
    return document.fonts.check(`16px "${family}"`);
  } catch {
    return false;
  }
}

/**
 * Inject the cycle-only font stylesheet exactly once per page-load,
 * then explicitly trigger woff2 loading for each declared family.
 *
 * Prior implementation stopped at stylesheet injection, leaving the
 * browser to lazy-fetch each woff2 only when the cycle's tick first
 * tried to render text in that family. That race produced the
 * "stagger on a certain font" bug: with `display=swap`, the first few
 * cycle frames for a given font rendered in serif fallback while the
 * woff2 was still in flight, and the real glyph "popped" mid-cycle.
 *
 * The fix: once the stylesheet's load event fires (so the @font-face
 * rules are registered), call `document.fonts.load()` for each of the
 * 22 cycle families. That immediately enqueues parallel woff2
 * fetches. The cycle then gates per-tick on `document.fonts.check()`
 * and only renders fonts that have actually arrived — no fallback
 * flash, no popping.
 */
function ensureLazyFonts() {
  if (lazyFontsRequested) return;
  if (typeof document === 'undefined') return;
  lazyFontsRequested = true;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = LAZY_FONT_HREF;

  const triggerWoff2Loads = () => {
    if (!document.fonts?.load) return;
    for (const fontStack of FANCY_FONTS) {
      const family = firstFamily(fontStack);
      if (!family) continue;
      // Already loaded (eager or cached from a prior session)?
      // .check() is cheap; skip the redundant .load() if so.
      try {
        if (document.fonts.check(`16px "${family}"`)) continue;
      } catch {
        /* .check can throw on malformed strings; fall through to .load */
      }
      // Fire-and-forget — the cycle reads the result via .check().
      // Errors are non-fatal: the family stays unloaded and the
      // cycle skips it.
      document.fonts.load(`16px "${family}"`).catch(() => {
        /* network or font-face mismatch; cycle gracefully degrades */
      });
    }
  };

  // Stylesheet load event fires when the CSS is parsed and
  // @font-face rules registered. Some old browsers don't fire
  // onload reliably for cross-origin <link>; the 220 ms backstop
  // ensures triggerWoff2Loads runs even in that case. The internal
  // guard inside document.fonts.load makes this idempotent.
  link.addEventListener('load', triggerWoff2Loads, { once: true });
  window.setTimeout(triggerWoff2Loads, 220);

  document.head.appendChild(link);
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Layer 2 — center anchor. Fixed at left:38.2% width:23.6%.
 *
 * Never moves when panels slide. Typography, color, and background
 * morph based on the parent's [data-takeover] state via CSS. The
 * description text also morphs per visual takeover — it flips during
 * the font fade-out so the swap is invisible.
 *
 * On creative takeover, the signature additionally cycles through the
 * FANCY_FONTS set via inline font-family — the rAF loop only writes
 * inline styles for fonts that are actually loaded, and clears the
 * inline value on cleanup so the CSS default re-applies cleanly.
 */
export default function CenterAnchor({ visualTakeover }: Props) {
  const sigRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = sigRef.current;
    if (!el) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (visualTakeover !== 'creative' || reduced) {
      el.style.removeProperty('font-family');
      return;
    }

    // First creative-hover of this page-load — request the cycle's
    // 22 lazy fonts AND explicitly trigger woff2 loading. Browser
    // caches; subsequent hovers re-run the cycle against already-
    // loaded faces with no network cost.
    ensureLazyFonts();

    // ────────────────────────────────────────────────────────────
    // Two-phase cycle state machine.
    //
    //   PRIMING — hold the CSS default (Playfair italic) while
    //             waiting for enough lazy fonts to arrive. Phase
    //             ends when MIN_READY_TO_CYCLE fonts are loaded
    //             OR MAX_PRIMING_MS elapses, whichever first.
    //   CYCLING — flicker through ready fonts at 7 fps. Unloaded
    //             fonts in the queue are skipped (advance to next
    //             ready entry within the same tick) so no fallback
    //             flash ever paints.
    //
    // Module-level `cycleHasPrimed` short-circuits PRIMING after
    // the first successful start in this page-load — fonts are
    // cached after that, no reason to wait again.
    // ────────────────────────────────────────────────────────────
    let cancelled = false;
    let rafId = 0;
    let lastTickAt = 0;
    let queue: string[] = shuffle(FANCY_FONTS);
    let queueIdx = 0;
    const startedAt = performance.now();

    const readyCount = (): number => {
      let n = 0;
      for (const s of FANCY_FONTS) if (isFontReady(s)) n += 1;
      return n;
    };

    const inPrimingPhase = (): boolean => {
      if (cycleHasPrimed) return false;
      if (readyCount() >= MIN_READY_TO_CYCLE) return false;
      if (performance.now() - startedAt >= MAX_PRIMING_MS) return false;
      return true;
    };

    /** Advance the queue to the next loaded font and apply it.
     *  Skips unloaded entries inline (within the same tick) so an
     *  in-flight font never produces a serif/cursive fallback frame.
     *  When the queue is exhausted, reshuffle so newly-arrived
     *  fonts get folded in on the next pass. */
    const advanceCycle = () => {
      while (queueIdx < queue.length) {
        const candidate = queue[queueIdx];
        queueIdx += 1;
        if (isFontReady(candidate)) {
          el.style.fontFamily = candidate;
          return;
        }
      }
      // Exhausted — reshuffle. The new queue may include newly-
      // loaded fonts; this tick produces no visible swap, the
      // next tick (140 ms later) will pick from the fresh queue.
      queue = shuffle(FANCY_FONTS);
      queueIdx = 0;
    };

    const loop = (now: number) => {
      if (cancelled) return;

      if (now - lastTickAt >= FLICKER_INTERVAL_MS) {
        lastTickAt = now;
        if (inPrimingPhase()) {
          // Hold on CSS default — clear any stale inline value
          // left from a prior cycle run.
          el.style.removeProperty('font-family');
        } else {
          cycleHasPrimed = true;
          advanceCycle();
        }
      }

      rafId = window.requestAnimationFrame(loop);
    };
    rafId = window.requestAnimationFrame(loop);

    return () => {
      cancelled = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      el.style.removeProperty('font-family');
    };
  }, [visualTakeover]);

  // Each variant is rendered as a COMPLETE phrase (not split into
  // prefix + tail). Two layers are stacked absolutely inside the
  // .hero-description box, both centered. When the about-phase
  // activates, the default phrase fades to 0 and the about phrase
  // fades to 1 — both stay independently centered, so "a bit about
  // me" reads as cleanly framed even though it's shorter than "a bit
  // of everything…". This also avoids whitespace-collapse bugs from
  // the prior prefix-split approach.
  const defaultPhrase = DESCRIPTIONS[visualTakeover];
  const aboutPhrase = 'a bit about me';

  return (
    <div className="hero-center">
      {/* Brain moved UP to HeroSection as its own hero-level layer
          so it can bounce toward the hovered side (creative / tech)
          without being constrained to the 23.6 %-wide center column.
          CatMark + signature + description stay absolutely centered
          here; the brain floats behind them at a lower z-index. */}
      <CatMark className="hero-cat" winkRadius={52} />
      <h1 ref={sigRef} className="hero-signature">Jackie</h1>
      <p className="hero-description">
        <span className="hero-description-default">{defaultPhrase}</span>
        <span className="hero-description-about" aria-hidden="true">
          {aboutPhrase}
        </span>
      </p>
    </div>
  );
}
