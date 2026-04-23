import { useEffect, useRef, useState } from 'react';

interface Props {
  active: boolean;
}

interface BarSpec {
  h: number;
  delay: number;
}

/**
 * Creative side background — YouTube-style thumbnail → video crossfade.
 *
 * Neutral state  : cover image visible, "video" placeholder hidden.
 * Active state   : image fades out, video fades in with running timer
 *                  and animated spectrum bars.
 *
 * The real <video> element lands in Phase 4 once assets are on R2.
 * This placeholder keeps the choreography honest so the transition
 * timing is tuned against something that actually animates.
 */
export default function CreativeBackground({ active }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [bars, setBars] = useState<BarSpec[]>([]);
  const timerRef = useRef<number | null>(null);

  // Bar randomness is generated post-mount so the server-rendered HTML
  // and the client-hydrated output match (SSR has no access to window
  // Math state but random values diverge regardless).
  useEffect(() => {
    setBars(
      Array.from({ length: 28 }, () => ({
        h: 6 + Math.random() * 28,
        delay: Math.random() * 0.8,
      })),
    );
  }, []);

  useEffect(() => {
    if (!active) {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setElapsed(0);
      return;
    }

    timerRef.current = window.setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [active]);

  const mm = Math.floor(elapsed / 60);
  const ss = (elapsed % 60).toString().padStart(2, '0');

  return (
    <div className="hero-creative-bg" aria-hidden="true">
      <div className="hero-creative-img">
        <div className="hero-creative-img-inner">
          <span className="hero-creative-img-label">cover · live ensemble</span>
        </div>
      </div>
      <div className="hero-creative-vid">
        <div className="hero-creative-vid-frame">
          <span className="hero-creative-vid-scanline" />
          <span className="hero-creative-vid-label">playing</span>
          <span className="hero-creative-vid-time">{`${mm}:${ss}`}</span>
          <div className="hero-creative-vid-bars">
            {bars.map((b, i) => (
              <span
                key={i}
                className="hero-creative-vid-bar"
                style={{
                  ['--h' as string]: `${b.h}px`,
                  animationDelay: `${b.delay}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
