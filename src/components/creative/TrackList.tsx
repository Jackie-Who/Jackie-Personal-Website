import { useEffect, useRef } from 'react';
import type { Track } from '@/content/tracks';
import { formatDuration } from '@/content/tracks';

interface Props {
  tracks: Track[];
  activeId: string | null;
  isPlaying: boolean;
  expanded: boolean;
  onSelect: (id: string) => void;
}

/**
 * Vertical track list. Free-scrolling (the scroll doesn't change
 * playback). Clicking a track selects it and scrolls it toward
 * center. The active track shows a left border accent and pulsing
 * dot when playing.
 *
 * Compact (panel not expanded): only the cover-art thumbnail
 * renders — the title and composer are hidden. Expanded: thumbnail +
 * title + composer + duration lay out on one row.
 */
export default function TrackList({ tracks, activeId, isPlaying, expanded, onSelect }: Props) {
  const rootRef = useRef<HTMLUListElement | null>(null);

  // Scroll the active track roughly to center whenever it changes.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !activeId) return;
    const el = root.querySelector<HTMLLIElement>(`[data-track-id='${CSS.escape(activeId)}']`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeId]);

  const fallbackThumb = 'linear-gradient(135deg, #3a2838 0%, #1a1420 100%)';

  return (
    <ul ref={rootRef} className="creative-tracklist no-scrollbar" aria-label="Track list">
      {tracks.map((t) => {
        const isActive = t.id === activeId;
        return (
          <li
            key={t.id}
            data-track-id={t.id}
            className={`creative-track${isActive ? ' creative-track-active' : ''}`}
          >
            <button
              type="button"
              className="creative-track-button"
              onClick={() => onSelect(t.id)}
              aria-current={isActive ? 'true' : undefined}
              aria-label={`${t.title} by ${t.composer}`}
            >
              <span
                className="creative-track-thumb"
                style={{ background: t.thumbnail ?? fallbackThumb }}
                aria-hidden="true"
              >
                {isActive && isPlaying && (
                  <span className="creative-track-thumb-playing" aria-hidden="true" />
                )}
              </span>
              {expanded && (
                <span className="creative-track-labels">
                  <span className="creative-track-title">{t.title}</span>
                  <span className="creative-track-composer">{t.composer}</span>
                </span>
              )}
              {expanded && (
                <span className="creative-track-duration">{formatDuration(t.duration)}</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
