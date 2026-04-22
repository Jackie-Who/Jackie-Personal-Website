import { useEffect, useState } from 'react';

interface Section {
  id: string;
  label: string;
}

interface Props {
  sections: Section[];
  containerRef: React.RefObject<HTMLElement | null>;
}

/**
 * Right-edge dot nav. Tracks which scroll-snap section owns the
 * viewport via IntersectionObserver and reflects it as the active dot.
 * Clicking a dot scrolls its section into view.
 */
export default function DotNav({ sections, containerRef }: Props) {
  const [active, setActive] = useState(0);

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
        if (idx >= 0) setActive(idx);
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
