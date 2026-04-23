import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Floating classical-music notes that spawn from the cursor while
 * the viewer hovers over the music panel. Each note fades in at the
 * cursor, rises ~100 px while drifting slightly sideways, and fades
 * out — lifetime ~1.8 s.
 *
 * Rate-limited to roughly one note per second: between spawns a
 * random cooldown of 850–1900 ms must elapse, so the effect reads as
 * incidental whimsy rather than a particle trail.
 *
 * Characters are a mix of the seven BMP music-symbol codepoints
 * (note durations + accidentals) — picked over SMP chars like
 * 𝄞/𝄢 because BMP renders reliably in any system font without
 * needing a dedicated music typeface.
 *
 * Respects prefers-reduced-motion (entire effect becomes a no-op).
 * Pointer position lives in a ref so mousemove doesn't trigger React
 * re-renders — the only renders are on spawn (add) and cleanup
 * (remove), so at most ~2 renders per note.
 */

const NOTE_CHARS = ['♩', '♪', '♫', '♬', '♭', '♮', '♯'] as const;
const MIN_INTERVAL_MS = 850;
const MAX_INTERVAL_MS = 1900;
const NOTE_LIFETIME_MS = 1800;

interface FloatingNote {
  id: number;
  x: number;
  y: number;
  char: string;
  drift: number;
}

interface Props {
  /** Ref to the music panel element. Pointer events are attached to
   *  this element, and spawned notes are positioned relative to its
   *  bounding rect. */
  containerRef: RefObject<HTMLElement | null>;
}

export default function MusicNoteBurst({ containerRef }: Props) {
  const [notes, setNotes] = useState<FloatingNote[]>([]);
  const counterRef = useRef(0);
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);
  const lastSpawnRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Honor system motion preference — an animated cursor-trail is
    // squarely in the "decorative motion" bucket, so a viewer who's
    // opted out of motion gets nothing at all here.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const panel = containerRef.current;
    if (!panel) return;

    const spawnNote = (x: number, y: number) => {
      const note: FloatingNote = {
        id: counterRef.current++,
        x,
        y,
        char: NOTE_CHARS[Math.floor(Math.random() * NOTE_CHARS.length)],
        // Horizontal drift in px — ±25. Keeps notes lively without
        // letting them wander far enough to cross the panel edge
        // before the fade finishes them off.
        drift: (Math.random() - 0.5) * 50,
      };
      setNotes((prev) => [...prev, note]);
      window.setTimeout(() => {
        setNotes((prev) => prev.filter((n) => n.id !== note.id));
      }, NOTE_LIFETIME_MS);
    };

    const onMove = (e: PointerEvent) => {
      const rect = panel.getBoundingClientRect();
      mousePosRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };
    const onEnter = () => {
      // Reset the random-spawn countdown on every fresh entry so the
      // first note respects the full nextInterval (850–1900 ms)
      // delay, rather than firing the instant the cursor crosses in
      // because lastSpawnRef happens to be stale from a previous
      // hover session or mount.
      lastSpawnRef.current = performance.now();
    };
    const onLeave = () => {
      mousePosRef.current = null;
    };
    const onClick = (e: MouseEvent) => {
      // Every click inside the panel spawns a note at the click
      // position, regardless of cooldown. We also reset the random
      // spawner's lastSpawnRef so it doesn't immediately queue a
      // second note right on top of the click's — back-to-back
      // spawns would read as spam rather than whimsy.
      const rect = panel.getBoundingClientRect();
      spawnNote(e.clientX - rect.left, e.clientY - rect.top);
      lastSpawnRef.current = performance.now();
    };

    panel.addEventListener('pointerenter', onEnter);
    panel.addEventListener('pointermove', onMove);
    panel.addEventListener('pointerleave', onLeave);
    panel.addEventListener('click', onClick);

    let nextInterval =
      MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS);
    let rafId = 0;

    const tick = () => {
      const now = performance.now();
      const pos = mousePosRef.current;
      if (pos && now - lastSpawnRef.current >= nextInterval) {
        spawnNote(pos.x, pos.y);
        lastSpawnRef.current = now;
        nextInterval =
          MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS);
      }
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);

    return () => {
      panel.removeEventListener('pointerenter', onEnter);
      panel.removeEventListener('pointermove', onMove);
      panel.removeEventListener('pointerleave', onLeave);
      panel.removeEventListener('click', onClick);
      window.cancelAnimationFrame(rafId);
    };
  }, [containerRef]);

  return (
    <div className="creative-music-notes" aria-hidden="true">
      {notes.map((n) => (
        <span
          key={n.id}
          className="creative-music-note"
          style={{
            left: `${n.x}px`,
            top: `${n.y}px`,
            ['--drift' as unknown as string]: `${n.drift}px`,
          }}
        >
          {n.char}
        </span>
      ))}
    </div>
  );
}
