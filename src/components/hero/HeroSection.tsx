import { useCallback, useEffect, useRef, useState } from 'react';
import { navigate } from 'astro:transitions/client';
import VisualPanels from './VisualPanels';
import CenterAnchor from './CenterAnchor';
import HitZones from './HitZones';
import CodeBackground from './CodeBackground';
import CreativeBackground from './CreativeBackground';
import NeuralBrain from './NeuralBrain';
import AcademicBackdrop from './AcademicBackdrop';
import AboutMeSection from './AboutMeSection';
import HeroContactDrawer from './HeroContactDrawer';
import './hero.css';

export type Takeover = 'neutral' | 'creative' | 'tech';

/** Vertical "scroll-jack" phase for the hero. Default is `hero` (the
 *  classic side-panel layout). Wheeling/touching down advances to
 *  `about` (center widens, profile + bio fade in below the cat
 *  anchor); wheeling further advances to `contact` (the slide-up
 *  drawer with the contact form). Wheeling up retreats one phase. */
export type AboutPhase = 'hero' | 'about' | 'contact';
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
  // About-me / contact scroll-jack phase. Controls the panel-width
  // reshape, the CenterAnchor's vertical translate, the about-me
  // content reveal, and the contact drawer slide-up.
  const [aboutPhase, setAboutPhase] = useState<AboutPhase>('hero');
  const aboutPhaseRef = useRef<AboutPhase>('hero');
  aboutPhaseRef.current = aboutPhase;
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

  /**
   * Wheel + touch scroll-jack that drives the about-me reveal.
   *
   * Phases progress sequentially: hero → about → contact. Each wheel
   * event advances or retreats the phase by exactly one step, with
   * a short cooldown so a single inertial swipe doesn't fly past
   * multiple stops in one go (the user's intent is "snap scroll" —
   * one notch should commit to one phase, not three).
   *
   * Wheel events are NOT consumed (preventDefault is intentionally
   * NOT called) so the page's native scroll still works for users
   * who happen to have a tall hero on a small viewport. The
   * intercept here just adds an extra discrete state machine on
   * top of normal scroll input.
   *
   * Touch input is captured analogously — touchstart records Y,
   * touchmove fires the same advance/retreat once the cumulative
   * delta crosses a threshold.
   *
   * Skipped while a side takeover is in flight or during navigation
   * (nav !== idle), so wheeling during the expansion animation
   * doesn't queue a phase change that fires after the hero has
   * already committed to a route.
   */
  useEffect(() => {
    const PHASE_COOLDOWN_MS = 520;
    const TOUCH_THRESHOLD_PX = 48;
    let lastPhaseChange = 0;
    let touchStartY = 0;
    let touchAccum = 0;

    const advance = (direction: 1 | -1) => {
      const now = performance.now();
      if (now - lastPhaseChange < PHASE_COOLDOWN_MS) return false;
      const phases: AboutPhase[] = ['hero', 'about', 'contact'];
      const current = aboutPhaseRef.current;
      const idx = phases.indexOf(current);
      const nextIdx = Math.max(0, Math.min(phases.length - 1, idx + direction));
      if (nextIdx === idx) return false;
      lastPhaseChange = now;
      setAboutPhase(phases[nextIdx]);
      return true;
    };

    const onWheel = (e: WheelEvent) => {
      // Only progress while the hero is in idle nav state and the
      // viewer isn't engaged with a side takeover. (Side takeover
      // hides the about-me content anyway, so we let it handle its
      // own scroll; here we just gate the phase change to avoid
      // queuing a transition that would fight the takeover.)
      if (nav !== 'idle') return;
      if (Math.abs(e.deltaY) < 6) return;
      advance(e.deltaY > 0 ? 1 : -1);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      touchStartY = e.touches[0].clientY;
      touchAccum = 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (nav !== 'idle' || e.touches.length !== 1) return;
      const dy = touchStartY - e.touches[0].clientY;
      touchAccum = dy;
      if (Math.abs(touchAccum) >= TOUCH_THRESHOLD_PX) {
        const consumed = advance(touchAccum > 0 ? 1 : -1);
        if (consumed) {
          // Reset baseline so the next swipe needs to cross the
          // threshold again rather than immediately re-firing on
          // continued finger movement.
          touchStartY = e.touches[0].clientY;
          touchAccum = 0;
        }
      }
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [nav]);

  // If the viewer engages a side takeover (creative / tech hover),
  // back the about-phase out to hero — those features can't share a
  // viewport with the side-takeover-widths. Once the takeover ends
  // (cursor leaves the side panel), the user can re-scroll to about.
  useEffect(() => {
    if (takeover !== 'neutral' && aboutPhase !== 'hero') {
      setAboutPhase('hero');
    }
  }, [takeover, aboutPhase]);

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
      data-about-phase={aboutPhase}
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

      {/* About-me content lives inside the .hero-center column,
          rendered as a sibling of the CenterAnchor so they share
          the same column flow. The CenterAnchor translates upward
          when about-phase activates, freeing the lower portion of
          the column for this block to fade in. */}
      <AboutMeSection phase={aboutPhase} />

      {/* Contact drawer — bottom-anchored, slides up when phase
          reaches `contact`. Lives at hero-app level so it overlays
          everything else in the viewport. */}
      <HeroContactDrawer phase={aboutPhase} />

      {/* Phase hint pinned to the bottom of the hero. Reads as a
          continuation cue: at hero phase it whispers "about me" so
          the viewer knows there's more below; at about phase it
          changes to "contact me"; at contact it disappears. Same
          Playfair italic + fainter cream as the description so it
          reads as part of the same typographic family. */}
      {aboutPhase !== 'contact' && (
        <p className="hero-phase-hint" aria-hidden="true">
          {aboutPhase === 'hero' ? 'about me' : 'contact me'}
          <span className="hero-phase-hint-arrow">↓</span>
        </p>
      )}

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
