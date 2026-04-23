import { useCallback, useEffect, useRef, useState } from 'react';
import { navigate } from 'astro:transitions/client';
import VisualPanels from './VisualPanels';
import CenterAnchor from './CenterAnchor';
import HitZones from './HitZones';
import CodeBackground from './CodeBackground';
import CreativeBackground from './CreativeBackground';
import NeuralBrain from './NeuralBrain';
import './hero.css';

export type Takeover = 'neutral' | 'creative' | 'tech';
type NavState = 'idle' | 'expanding-tech' | 'expanding-creative';

const EXPANSION_DURATION_MS = 780;
const FONT_SWAP_DELAY_MS = 200;

export default function HeroSection() {
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

  const handleEnter = useCallback(
    (zone: Takeover) => {
      if (nav !== 'idle') return;
      setTakeover(zone);
    },
    [nav],
  );

  const handleTech = useCallback(() => {
    if (nav !== 'idle') return;
    setTakeover('tech');
    setNav('expanding-tech');
    timersRef.current.push(
      window.setTimeout(() => {
        navigate('/tech');
      }, EXPANSION_DURATION_MS),
    );
  }, [nav]);

  const handleCreative = useCallback(() => {
    if (nav !== 'idle') return;
    setTakeover('creative');
    setNav('expanding-creative');
    timersRef.current.push(
      window.setTimeout(() => {
        navigate('/creative');
      }, EXPANSION_DURATION_MS),
    );
  }, [nav]);

  const disabled = nav !== 'idle';
  const expandingTo: Takeover | null =
    nav === 'expanding-tech' ? 'tech' : nav === 'expanding-creative' ? 'creative' : null;
  const fading = takeover !== visualTakeover;

  return (
    <div
      className="hero-app"
      data-takeover={takeover}
      data-visual={visualTakeover}
      data-fading={fading || undefined}
      data-expanding={expandingTo || undefined}
    >
      <VisualPanels
        creativeBackground={<CreativeBackground active={takeover === 'creative'} />}
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
    </div>
  );
}
