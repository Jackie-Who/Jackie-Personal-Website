import { useEffect, useRef, useState } from 'react';

interface Props {
  /** Whether audio is currently playing — bars animate only when true. */
  playing: boolean;
  count?: number;
}

/**
 * Decorative spectrum visualizer. Each bar's height wobbles on a
 * jittered sine curve; when `playing` is false the bars settle to
 * their minimum height. Colors inherit from the creative palette.
 */
export default function SpectrumBars({ playing, count = 24 }: Props) {
  const [heights, setHeights] = useState<number[]>(() =>
    Array.from({ length: count }, () => 0.15),
  );
  const rafRef = useRef<number | null>(null);
  const phasesRef = useRef<number[]>([]);

  useEffect(() => {
    if (phasesRef.current.length !== count) {
      phasesRef.current = Array.from({ length: count }, () => Math.random() * Math.PI * 2);
    }
  }, [count]);

  useEffect(() => {
    if (!playing) {
      setHeights((prev) => prev.map(() => 0.12));
      return;
    }

    let t = 0;
    const tick = () => {
      t += 0.08;
      setHeights(
        phasesRef.current.map((phase, i) => {
          const wave = Math.sin(t + phase) * 0.5 + 0.5;
          const jitter = Math.sin(t * 3 + phase * 1.7 + i) * 0.2;
          return Math.max(0.12, Math.min(1, wave * 0.8 + jitter * 0.3 + 0.15));
        }),
      );
      rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    };
  }, [playing, count]);

  return (
    <div className="creative-spectrum" aria-hidden="true">
      {heights.map((h, i) => (
        <span
          key={i}
          className="creative-spectrum-bar"
          style={{ transform: `scaleY(${h.toFixed(3)})` }}
        />
      ))}
    </div>
  );
}
