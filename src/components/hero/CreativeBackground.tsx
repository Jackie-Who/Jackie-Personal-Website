import { useEffect, useRef, useState } from 'react';

interface Props {
  active: boolean;
  /** Resting-state image URL (from the hero_assets singleton row).
   *  When set, replaces the built-in placeholder; otherwise the
   *  CSS placeholder div is shown. */
  imageUrl?: string | null;
  /** On-hover video URL. When set, replaces the spectrum-bars
   *  placeholder and plays in a loop while active. */
  videoUrl?: string | null;
}

interface BarSpec {
  h: number;
  delay: number;
}

/**
 * Creative side background — image (resting) → video (on hover) crossfade.
 *
 * Real assets come from the hero_assets singleton in Turso (uploaded
 * via /admin/hero). Until they're set, the component falls back to:
 *   - A solid-color "cover · live ensemble" placeholder card
 *   - A "playing" video frame with a scanline + spectrum bars + timer
 * The placeholders aren't shipping copy — they're scaffolding so the
 * choreography stays honest before the real bytes arrive.
 *
 * The <video> element only loads its src when the creative side is
 * active (preload="none" + lazy src assignment) so visitors who never
 * hover don't pay the bandwidth.
 */
export default function CreativeBackground({ active, imageUrl, videoUrl }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [bars, setBars] = useState<BarSpec[]>([]);
  const timerRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

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

  // Play / pause the real video alongside the active state. We pause
  // (and rewind) when leaving the creative side so the next hover
  // restarts cleanly rather than picking up mid-clip.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;
    if (active) {
      video.play().catch(() => {
        /* autoplay can fail; not critical for a muted decorative loop */
      });
    } else {
      video.pause();
      try { video.currentTime = 0; } catch { /* ignore on iOS */ }
    }
  }, [active, videoUrl]);

  const mm = Math.floor(elapsed / 60);
  const ss = (elapsed % 60).toString().padStart(2, '0');

  return (
    <div className="hero-creative-bg" aria-hidden="true">
      <div className="hero-creative-img">
        {imageUrl ? (
          <>
            <img src={imageUrl} alt="" className="hero-creative-img-real" />
            {/* Legibility scrim — radial vignette darkens the center
                where the panel labels sit, fades to nothing at the
                edges so the photo's composition still reads. Only
                rendered on top of a real uploaded image; the
                placeholder gradient already has uniform contrast. */}
            <span className="hero-creative-img-scrim" />
          </>
        ) : (
          <div className="hero-creative-img-inner">
            <span className="hero-creative-img-label">cover · live ensemble</span>
          </div>
        )}
      </div>
      <div className="hero-creative-vid">
        {videoUrl ? (
          <>
            <video
              ref={videoRef}
              className="hero-creative-vid-real"
              src={videoUrl}
              muted
              loop
              playsInline
              preload="none"
            />
            {/* Three overlay layers: an exposure dampener pulls the
                bright cuts (sunny harbor, stage lights) down to a
                consistent midtone via mix-blend-mode: multiply, a
                film-grain SVG turbulence texture adds tactile
                emulsion-like grain in the midtones, and a soft
                vignette mirrors the image side's center-darkening
                so the labels area stays consistent across hover. */}
            <span className="hero-creative-vid-dampener" />
            <span className="hero-creative-vid-grain" />
            <span className="hero-creative-vid-scrim" />
          </>
        ) : (
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
        )}
      </div>
    </div>
  );
}
