import { useEffect, useRef, useState } from 'react';

/**
 * "More projects coming soon" — placeholder section after the
 * shipped projects, signalling that more is on the way.
 *
 * Treatment:
 * - Plain text on the section's transparent bg (so the global
 *   .tech-app blob cursor stays visible). No terminal wrapper.
 * - Centered "more projects coming soon" types out one character
 *   at a time when the section enters the viewport, with a blinking
 *   block caret following the last character.
 * - Re-fires every time the section is scrolled into view (not
 *   one-shot) so revisiting from the dot nav replays the animation.
 *
 * prefers-reduced-motion: text appears fully written instantly,
 * caret is solid (no blink).
 */

const PHRASE = 'more projects coming soon.';
const CHAR_MS = 36;
const RESET_GUARD_MS = 380;

export default function MoreProjectsComingSoon() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const timersRef = useRef<number[]>([]);
  const inViewRef = useRef(false);
  const [typed, setTyped] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const node = rootRef.current;
    if (!node) return;

    const clearTimers = () => {
      for (const t of timersRef.current) window.clearTimeout(t);
      timersRef.current = [];
    };

    const beginTyping = () => {
      clearTimers();
      setDone(false);
      setTyped('');
      if (reduced) {
        setTyped(PHRASE);
        setDone(true);
        return;
      }
      for (let i = 1; i <= PHRASE.length; i += 1) {
        const id = window.setTimeout(() => {
          setTyped(PHRASE.slice(0, i));
          if (i === PHRASE.length) setDone(true);
        }, i * CHAR_MS);
        timersRef.current.push(id);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const visible = entry.isIntersecting && entry.intersectionRatio >= 0.45;
          if (visible && !inViewRef.current) {
            inViewRef.current = true;
            beginTyping();
          } else if (!visible && inViewRef.current && entry.intersectionRatio < 0.05) {
            inViewRef.current = false;
            const id = window.setTimeout(() => {
              if (!inViewRef.current) {
                setTyped('');
                setDone(false);
              }
            }, RESET_GUARD_MS);
            timersRef.current.push(id);
          }
        }
      },
      { threshold: [0, 0.05, 0.45, 0.7] },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      clearTimers();
    };
  }, []);

  return (
    <div ref={rootRef} className="tech-coming">
      <p className="tech-coming-line" aria-live="polite">
        <span className="tech-coming-text">{typed}</span>
        <span
          className={`tech-coming-caret${done ? ' is-blinking' : ''}`}
          aria-hidden="true"
        />
      </p>
    </div>
  );
}
