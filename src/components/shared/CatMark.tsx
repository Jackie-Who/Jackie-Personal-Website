import { useEffect, useRef, useState } from 'react';
import './cat-mark.css';

interface Props {
  /**
   * Cursor-proximity radius in pixels. When the pointer is within
   * this distance of an eye center, that eye flips into a "wink"
   * glyph (`>` for the left eye, `<` for the right).
   */
  winkRadius?: number;
  className?: string;
}

type EyeState = 'open' | 'wink' | 'blink';

/**
 * Jackie's cat mark — ears, two eyes, and a ㅅ nose.
 *
 * - Eyes blink on a random cadence (2-7s between blinks) so motion
 *   never feels mechanical.
 * - When the pointer enters a per-eye radius the corresponding eye
 *   snaps into a wink glyph (points toward the cursor side).
 * - Fully theme-neutral: colors come from the parent via CSS
 *   custom properties (--cat-accent, --cat-eye).
 */
export default function CatMark({ winkRadius = 65, className = '' }: Props) {
  const leftEyeRef = useRef<HTMLSpanElement | null>(null);
  const rightEyeRef = useRef<HTMLSpanElement | null>(null);
  const [leftState, setLeftState] = useState<EyeState>('open');
  const [rightState, setRightState] = useState<EyeState>('open');

  // -----------------------------
  // Varied blink cadence (shared)
  // -----------------------------
  useEffect(() => {
    let cancelled = false;
    let blinkTimer: number | null = null;

    const scheduleNext = () => {
      if (cancelled) return;
      // 2.0–7.5s between blinks — feels alive, not mechanical.
      const delay = 2000 + Math.random() * 5500;
      blinkTimer = window.setTimeout(() => {
        if (cancelled) return;
        // Occasionally blink only one eye (a real wink) 15% of the time.
        const soloWink = Math.random() < 0.15;
        const side: 'left' | 'right' | 'both' = soloWink
          ? Math.random() < 0.5
            ? 'left'
            : 'right'
          : 'both';
        if (side === 'left' || side === 'both') setLeftState((s) => (s === 'wink' ? s : 'blink'));
        if (side === 'right' || side === 'both') setRightState((s) => (s === 'wink' ? s : 'blink'));
        window.setTimeout(() => {
          if (cancelled) return;
          setLeftState((s) => (s === 'blink' ? 'open' : s));
          setRightState((s) => (s === 'blink' ? 'open' : s));
          scheduleNext();
        }, 110 + Math.random() * 60);
      }, delay);
    };
    scheduleNext();

    return () => {
      cancelled = true;
      if (blinkTimer !== null) window.clearTimeout(blinkTimer);
    };
  }, []);

  // -----------------------------
  // Cursor proximity → wink
  //
  // Each pointer move checks distance² to each eye and flips state
  // into 'wink' when inside winkRadius. No gaze-follow translation —
  // the eyes stay put; only the glyph changes to > or <.
  // -----------------------------
  useEffect(() => {
    const r2 = winkRadius * winkRadius;

    const distSq = (eye: HTMLSpanElement | null, clientX: number, clientY: number) => {
      if (!eye) return undefined;
      const r = eye.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      return (clientX - cx) ** 2 + (clientY - cy) ** 2;
    };

    const onMove = (e: PointerEvent) => {
      const dL2 = distSq(leftEyeRef.current, e.clientX, e.clientY);
      const dR2 = distSq(rightEyeRef.current, e.clientX, e.clientY);

      if (dL2 !== undefined) {
        setLeftState((s) => {
          if (dL2 < r2) return 'wink';
          if (s === 'wink') return 'open';
          return s;
        });
      }
      if (dR2 !== undefined) {
        setRightState((s) => {
          if (dR2 < r2) return 'wink';
          if (s === 'wink') return 'open';
          return s;
        });
      }
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [winkRadius]);

  const leftGlyph = leftState === 'wink' ? '>' : '•';
  const rightGlyph = rightState === 'wink' ? '<' : '•';

  return (
    <div
      className={`cat-mark${className ? ' ' + className : ''}`}
      role="img"
      aria-label="Cat signature — Jackie's mark"
    >
      <div className="cat-mark-ears" aria-hidden="true">
        <span>^</span>
        <span>^</span>
      </div>
      <div className="cat-mark-face" aria-hidden="true">
        <span
          ref={leftEyeRef}
          className={`cat-mark-eye cat-mark-eye-left${leftState === 'blink' ? ' cat-mark-eye-blinking' : ''}${leftState === 'wink' ? ' cat-mark-eye-winking' : ''}`}
        >
          {leftGlyph}
        </span>
        <span className="cat-mark-nose">ㅅ</span>
        <span
          ref={rightEyeRef}
          className={`cat-mark-eye cat-mark-eye-right${rightState === 'blink' ? ' cat-mark-eye-blinking' : ''}${rightState === 'wink' ? ' cat-mark-eye-winking' : ''}`}
        >
          {rightGlyph}
        </span>
      </div>
    </div>
  );
}
