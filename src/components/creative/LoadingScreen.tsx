import CatMark from '@/components/shared/CatMark';

interface Props {
  /**
   * When true the screen is painted + animated; when false it fades
   * out (420 ms) and becomes pointer-events-none. Controlled by the
   * parent — see CreativePortfolio's loader state.
   */
  visible: boolean;
}

/**
 * Branded loading overlay for /creative. Covers the React-hydration
 * window so returning visitors don't see a flash of placeholder
 * gradient tiles before the gallery settles in.
 *
 * - Full-viewport, fixed position, z-index 100 (above every other
 *   creative-page layer, including the music panel chrome).
 * - Theme-aware: background + signature colors read from the same
 *   --creative-* vars as the rest of the page, so the pre-hydration
 *   theme script in creative.astro gets this rendered in the right
 *   palette (Mist or Cream) from the very first paint.
 * - Reuses the existing CatMark glyph + Playfair italic signature so
 *   the screen feels like an extension of the brand, not generic
 *   chrome.
 * - Fast-hide: the parent flips `visible` to false on its first rAF
 *   after mount, so the screen is only up for the time the React
 *   bundle takes to hydrate. Images continue loading behind the
 *   gallery's own aspect-ratio-reserved placeholders after this
 *   fades out.
 * - Honors prefers-reduced-motion: the signature pulse + fade are
 *   replaced by instant show / instant hide.
 */
export default function LoadingScreen({ visible }: Props) {
  return (
    <div
      className="creative-loading-screen"
      data-visible={visible ? 'true' : undefined}
      aria-hidden={visible ? undefined : 'true'}
      role={visible ? 'status' : undefined}
      aria-label={visible ? 'Loading creative portfolio' : undefined}
    >
      <div className="creative-loading-screen-inner">
        <CatMark className="creative-loading-screen-cat" />
        <span className="creative-loading-screen-signature">Jackie</span>
      </div>
    </div>
  );
}
