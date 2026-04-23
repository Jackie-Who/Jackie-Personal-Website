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

const FLICKER_INTERVAL_MS = 140;

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
 * FANCY_FONTS set via inline font-family — the CSS default still
 * applies when the interval is cleared.
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

    let fonts = shuffle(FANCY_FONTS);
    let i = 0;
    const tick = () => {
      if (i >= fonts.length) {
        fonts = shuffle(FANCY_FONTS);
        i = 0;
      }
      el.style.fontFamily = fonts[i];
      i += 1;
    };
    tick();
    const id = window.setInterval(tick, FLICKER_INTERVAL_MS);

    return () => {
      window.clearInterval(id);
      el.style.removeProperty('font-family');
    };
  }, [visualTakeover]);

  return (
    <div className="hero-center">
      {/* Brain moved UP to HeroSection as its own hero-level layer
          so it can bounce toward the hovered side (creative / tech)
          without being constrained to the 23.6 %-wide center column.
          CatMark + signature + description stay absolutely centered
          here; the brain floats behind them at a lower z-index. */}
      <CatMark className="hero-cat" winkRadius={52} />
      <h1 ref={sigRef} className="hero-signature">Jackie</h1>
      <p className="hero-description">{DESCRIPTIONS[visualTakeover]}</p>
    </div>
  );
}
