import { useEffect, useRef, useState } from 'react';

interface Props {
  /** Whether audio is currently playing — bars animate only when true. */
  playing: boolean;
  count?: number;
  /** Analyser node from the music panel's Web Audio graph. When
   *  present, bars reflect real-time frequency magnitudes. When
   *  null (placeholder tracks that don't have a real audio URL, or
   *  browsers that refused to hand out an AudioContext), the
   *  component falls back to a decorative sine wave. */
  analyser?: AnalyserNode | null;
}

/**
 * Spectrum visualizer. Two modes:
 *
 * 1. Real FFT: read analyser.getByteFrequencyData() on every RAF and
 *    bucket the 64 bins across the N bars with a mild log bias, so
 *    bass doesn't steal all the visible width. Signal is boosted +
 *    normalized — most music rarely hits 255 on any single bin.
 * 2. Decorative fallback: jittered sine curve. Keeps the UI alive
 *    on placeholder data and as a graceful degradation path.
 *
 * When `playing` flips to false, bars settle to minimum height in
 * either mode.
 */
export default function SpectrumBars({ playing, count = 24, analyser }: Props) {
  const [heights, setHeights] = useState<number[]>(() =>
    Array.from({ length: count }, () => 0.15),
  );
  const rafRef = useRef<number | null>(null);
  const phasesRef = useRef<number[]>([]);
  const dataRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (phasesRef.current.length !== count) {
      phasesRef.current = Array.from({ length: count }, () => Math.random() * Math.PI * 2);
    }
  }, [count]);

  useEffect(() => {
    const cancel = () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    if (!playing) {
      cancel();
      setHeights((prev) => prev.map(() => 0.12));
      return;
    }

    // Real-FFT path — read the analyser each frame and map bins to
    // bars. Preferred whenever an analyser is connected; gracefully
    // falls back to decorative if the context failed to initialize
    // (e.g. CORS, old Safari without Web Audio).
    if (analyser) {
      const bins = analyser.frequencyBinCount;
      if (!dataRef.current || dataRef.current.length !== bins) {
        dataRef.current = new Uint8Array(bins);
      }

      const tick = () => {
        analyser.getByteFrequencyData(dataRef.current!);
        const data = dataRef.current!;
        // Skip bin 0 (DC / sub-audible) — it adds nothing musical
        // and can spike whenever the track starts or stops.
        const BIN_OFFSET = 1;
        const usableBins = bins - BIN_OFFSET;
        // Log-ish bucketing (power 1.5) + a linear TILT across bars
        // to counter bass dominance. Real music concentrates energy
        // in the low end; an unweighted spectrum reads left-hugged
        // and lopsided. Tilt attenuates bass bars (~0.65×) and
        // boosts treble (~1.75×) so the visual center of mass sits
        // around the middle and the whole spectrum feels alive.
        const newHeights = Array.from({ length: count }, (_, i) => {
          const tStart = i / count;
          const tEnd = (i + 1) / count;
          const startBin = BIN_OFFSET + Math.floor(Math.pow(tStart, 1.5) * usableBins);
          const endBin = Math.max(
            startBin + 1,
            BIN_OFFSET + Math.ceil(Math.pow(tEnd, 1.5) * usableBins),
          );
          let sum = 0;
          let cnt = 0;
          for (let j = startBin; j < endBin && j < bins; j++) {
            sum += data[j];
            cnt++;
          }
          const avg = cnt > 0 ? sum / cnt : 0;
          const tilt = 0.65 + 1.1 * (i / Math.max(1, count - 1));
          // Normalize against ~200 (music rarely pegs 255), apply
          // tilt, then a gentle curve so quiet passages don't
          // collapse into the floor.
          const magnitude = (avg / 200) * tilt;
          return Math.max(0.12, Math.min(1, Math.pow(magnitude, 1.05)));
        });
        setHeights(newHeights);
        rafRef.current = window.requestAnimationFrame(tick);
      };
      rafRef.current = window.requestAnimationFrame(tick);
      return cancel;
    }

    // Decorative fallback — placeholder tracks or browsers without
    // Web Audio still show motion so the panel doesn't look dead.
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
    return cancel;
  }, [playing, count, analyser]);

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
