import { useCallback, useEffect, useRef, useState } from 'react';
import { navigate } from 'astro:transitions/client';
import VisualPanels from './VisualPanels';
import CenterAnchor from './CenterAnchor';
import HitZones from './HitZones';
import CodeBackground from './CodeBackground';
import CreativeBackground from './CreativeBackground';
import NeuralBrain from './NeuralBrain';
import AcademicBackdrop from './AcademicBackdrop';
import './hero.css';

export type Takeover = 'neutral' | 'creative' | 'tech';
/** State machine for the page's transition into a side route.
 *  - idle: no navigation queued.
 *  - expanding-{side}: 780 ms expansion animation playing on hero.
 *  - loading-{side}: expansion finished; loader overlay covers the
 *    hero while ClientRouter fetches the destination's HTML/CSS/JS.
 *    The loader matches creative.astro's SSR loader so the page swap
 *    looks like one continuous loading state, not "hero → blank →
 *    new page". */
export type NavState =
  | 'idle'
  | 'expanding-tech'
  | 'expanding-creative'
  | 'loading-tech'
  | 'loading-creative';

const EXPANSION_DURATION_MS = 780;
const FONT_SWAP_DELAY_MS = 200;

interface Props {
  /** Public URL of the resting-state creative-side image, or null
   *  if the admin hasn't uploaded one yet (then the CSS placeholder
   *  shows). Loaded server-side from the hero_assets singleton. */
  creativeImageUrl?: string | null;
  /** Public URL of the on-hover creative-side video, or null. */
  creativeVideoUrl?: string | null;
}

export default function HeroSection({ creativeImageUrl, creativeVideoUrl }: Props = {}) {
  const [takeover, setTakeover] = useState<Takeover>('neutral');
  // visualTakeover lags takeover by FONT_SWAP_DELAY_MS. This keeps
  // discrete font-family changes invisible during the opacity fade —
  // text fades to 0 in the old font, swaps font while invisible, fades
  // back to 1 in the new font. Panel bg / brain color still track the
  // instant takeover for a responsive feel.
  const [visualTakeover, setVisualTakeover] = useState<Takeover>('neutral');
  const [nav, setNav] = useState<NavState>('idle');
  const timersRef = useRef<number[]>([]);
  const visualTimerRef = useRef<number | null>(null);
  // Read /creative's persisted theme so the handoff loader can paint
  // in the same palette the new page will use. Without this, a dark-
  // mode returning visitor would see a cream loader while navigating
  // and then a dark page — jarring color mismatch.
  const [creativeTheme, setCreativeTheme] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('creative-theme');
      if (saved === 'dark' || saved === 'light') setCreativeTheme(saved);
    } catch {
      /* storage unavailable — stays light */
    }
  }, []);

  useEffect(() => {
    return () => {
      for (const id of timersRef.current) window.clearTimeout(id);
      timersRef.current = [];
      if (visualTimerRef.current !== null) {
        window.clearTimeout(visualTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (takeover === visualTakeover) return;
    if (visualTimerRef.current !== null) {
      window.clearTimeout(visualTimerRef.current);
    }
    visualTimerRef.current = window.setTimeout(() => {
      setVisualTakeover(takeover);
      visualTimerRef.current = null;
    }, FONT_SWAP_DELAY_MS);
    return () => {
      if (visualTimerRef.current !== null) {
        window.clearTimeout(visualTimerRef.current);
        visualTimerRef.current = null;
      }
    };
  }, [takeover, visualTakeover]);

  // Prefetch the side pages once on mount so by the time the viewer
  // commits to navigating, the destination's HTML is already in the
  // browser cache. Drops perceived navigation latency. Uses raw
  // <link rel="prefetch"> injection because the imperative
  // `prefetch()` from astro:transitions/client isn't available in
  // every Astro 5 patch — link injection works regardless.
  useEffect(() => {
    const inject = (href: string) => {
      if (document.head.querySelector(`link[rel="prefetch"][href="${href}"]`)) return;
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = href;
      document.head.appendChild(link);
    };
    inject('/creative');
    inject('/tech');
  }, []);

  const handleEnter = useCallback(
    (zone: Takeover) => {
      if (nav !== 'idle') return;
      setTakeover(zone);
    },
    [nav],
  );

  const triggerNavigate = useCallback((destination: 'tech' | 'creative') => {
    // Two-phase: flip state to loading-* (renders the handoff loader
    // overlay on top of the hero), wait two animation frames so the
    // browser actually paints the loader, then fire navigate(). The
    // loader covers the hero's expansion-end state during the
    // ClientRouter fetch + DOM swap window. Without this delay the
    // navigate() call can outrace the loader's first paint and the
    // viewer briefly sees the dark hero fading directly into the
    // new page (which was the bug).
    setNav(destination === 'creative' ? 'loading-creative' : 'loading-tech');
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        navigate(`/${destination}`);
      });
    });
  }, []);

  const handleTech = useCallback(() => {
    if (nav !== 'idle') return;
    setTakeover('tech');
    setNav('expanding-tech');
    timersRef.current.push(
      window.setTimeout(() => {
        triggerNavigate('tech');
      }, EXPANSION_DURATION_MS),
    );
  }, [nav, triggerNavigate]);

  const handleCreative = useCallback(() => {
    if (nav !== 'idle') return;
    setTakeover('creative');
    setNav('expanding-creative');
    timersRef.current.push(
      window.setTimeout(() => {
        triggerNavigate('creative');
      }, EXPANSION_DURATION_MS),
    );
  }, [nav, triggerNavigate]);

  const disabled = nav !== 'idle';
  const expandingTo: Takeover | null =
    nav === 'expanding-tech' ? 'tech' : nav === 'expanding-creative' ? 'creative' : null;
  const fading = takeover !== visualTakeover;
  const handoff: 'creative' | 'tech' | null =
    nav === 'loading-creative' ? 'creative' : nav === 'loading-tech' ? 'tech' : null;

  return (
    <div
      className="hero-app"
      data-takeover={takeover}
      data-visual={visualTakeover}
      data-fading={fading || undefined}
      data-expanding={expandingTo || undefined}
    >
      {/* Academic backdrop FIRST so it sits at the bottom of the
          stacking context — the side panels (rendered after) mask
          their portions of the text with opaque bgs, leaving only
          the transparent center panel area showing. */}
      <AcademicBackdrop />

      <VisualPanels
        creativeBackground={
          <CreativeBackground
            active={takeover === 'creative'}
            imageUrl={creativeImageUrl}
            videoUrl={creativeVideoUrl}
          />
        }
      />

      <CodeBackground typing={takeover === 'tech'} />

      {/* Brain layer — sits between the code background (z:1) and
          the center anchor (z:5). Larger than the center column
          and free to translate horizontally so it can lean toward
          whichever side the viewer is hovering. All colors and
          thinking-particle effects happen inside the canvas,
          driven by takeover + nav. */}
      <div className="hero-brain-layer" aria-hidden="true">
        <NeuralBrain takeover={takeover} nav={nav} />
      </div>

      <CenterAnchor visualTakeover={visualTakeover} />

      <HitZones
        onEnterZone={handleEnter}
        onCreativeActivate={handleCreative}
        onTechActivate={handleTech}
        disabled={disabled}
      />

      {/* Handoff loader — covers the hero AFTER expansion, BEFORE
          ClientRouter swaps DOM. Bridges the moment between the
          hero unmounting and the destination page's SSR loader
          appearing. Designed to look identical to the creative
          page's SSR loader so the swap is visually seamless: the
          viewer sees one continuous loading state, not a flash. */}
      {handoff !== null && (
        <div
          className="hero-handoff-loader"
          data-destination={handoff}
          data-creative-theme={handoff === 'creative' ? creativeTheme : undefined}
          role="status"
          aria-label={`Loading ${handoff} portfolio`}
        >
          <div className="hero-handoff-loader-inner">
            <div className="cat-mark" role="img" aria-label="Cat signature">
              <div className="cat-mark-ears" aria-hidden="true">
                <span>^</span>
                <span>^</span>
              </div>
              <div className="cat-mark-face" aria-hidden="true">
                <span className="cat-mark-eye cat-mark-eye-left">•</span>
                <span className="cat-mark-nose">ㅅ</span>
                <span className="cat-mark-eye cat-mark-eye-right">•</span>
              </div>
            </div>
            <span className="hero-handoff-loader-signature">Jackie</span>
          </div>
        </div>
      )}
    </div>
  );
}
