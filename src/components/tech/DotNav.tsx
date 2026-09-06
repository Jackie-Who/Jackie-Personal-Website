import { useEffect, useRef, useState } from 'react';

interface Section {
  id: string;
  label: string;
}

interface Props {
  sections: Section[];
  containerRef: React.RefObject<HTMLElement | null>;
  /** Fired whenever a different section takes the viewport. TechPortfolio
   *  uses this to keep the address bar in sync with what's on screen. */
  onActiveChange?: (id: string) => void;
}

/**
 * Right-edge dot nav. Tracks which scroll-snap section owns the
 * viewport via IntersectionObserver and reflects it as the active dot.
 * Clicking a dot scrolls its section into view.
 *
 * It's also the single source of truth for "which section is active" —
 * the URL sync subscribes here rather than running a second observer,
 * so the dots and the address bar can never disagree.
 */
export default function DotNav({ sections, containerRef, onActiveChange }: Props) {
  const [active, setActive] = useState(0);

  // Held in a ref so a caller passing an inline function can't tear
  // down and re-create the observer on every render.
  const onActiveChangeRef = useRef(onActiveChange);
  onActiveChangeRef.current = onActiveChange;

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const observed = sections
      .map((s) => root.querySelector<HTMLElement>(`#${CSS.escape(s.id)}`))
      .filter((el): el is HTMLElement => el !== null);

    if (observed.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry with the highest intersection ratio.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const idx = sections.findIndex((s) => s.id === visible.target.id);
        if (idx >= 0) {
          setActive(idx);
          onActiveChangeRef.current?.(sections[idx].id);
        }
      },
      {
        root,
        threshold: [0.4, 0.6, 0.8],
      },
    );

    observed.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections, containerRef]);

  const jumpTo = (i: number) => {
    const root = containerRef.current;
    if (!root) return;
    const target = root.querySelector<HTMLElement>(`#${CSS.escape(sections[i].id)}`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav className="tech-dots" aria-label="Section navigation">
      {sections.map((s, i) => (
        <button
          key={s.id}
          type="button"
          className={`tech-dot${i === active ? ' tech-dot-active' : ''}`}
          onClick={() => jumpTo(i)}
          aria-label={`Jump to ${s.label}`}
          aria-current={i === active ? 'true' : undefined}
        />
      ))}
    </nav>
  );
}
