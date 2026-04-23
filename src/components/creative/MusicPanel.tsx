import { useCallback, useEffect, useRef, useState } from 'react';
import type { Track } from '@/content/tracks';
import TrackList from './TrackList';
import SpectrumBars from './SpectrumBars';
import { useAudioPlayer } from './AudioPlayer';

export type PanelSize = 'compact' | 'expanded';

interface Props {
  /** Track list to render. Server-provided by creative.astro. */
  tracks: Track[];
  initialTrackId?: string;
  /** Current size — lifted to CreativePortfolio so the header-bar
   *  toggle can control it in sync with the drag handle on the
   *  panel's inner edge. */
  size: PanelSize;
  onSizeChange: (s: PanelSize) => void;
}

const COMPACT_WIDTH = 76;
const EXPANDED_WIDTH = 380; // ~2x the previous expanded width
const DRAG_THRESHOLD = 120; // midpoint between 76 and 380

/**
 * Resizable music panel on the creative page — lives on the RIGHT.
 *
 * Two size states: compact (76px, play/pause only) and expanded
 * (380px, prev/play/next + spectrum + track list + composer). A
 * thin drag handle on the LEFT (inner) edge lets the viewer resize
 * between them. Default state is `'expanded'` so the full player is
 * present on first load. The panel hosts the audio player state —
 * the photo gallery beside it only concerns itself with its own
 * scroll/expand interactions.
 */
export default function MusicPanel({ tracks, initialTrackId, size, onSizeChange }: Props) {
  const [activeId, setActiveId] = useState<string | null>(
    () => initialTrackId ?? tracks[0]?.id ?? null,
  );
  const activeTrack: Track | null =
    tracks.find((t) => t.id === activeId) ?? null;

  const onEnded = useCallback(() => {
    const idx = tracks.findIndex((t) => t.id === activeId);
    const next = tracks[(idx + 1) % tracks.length];
    if (next) setActiveId(next.id);
  }, [activeId]);

  const player = useAudioPlayer({ track: activeTrack, onEnded });

  const handleSelect = useCallback(
    (id: string) => {
      if (id !== activeId) {
        setActiveId(id);
        // Play on next microtask so useEffect in the hook resets state first
        window.setTimeout(() => player.play(), 0);
      } else {
        player.toggle();
      }
    },
    [activeId, player],
  );

  const handleNext = useCallback(() => {
    const idx = tracks.findIndex((t) => t.id === activeId);
    const next = tracks[(idx + 1) % tracks.length];
    if (next) handleSelect(next.id);
  }, [activeId, handleSelect]);

  const handlePrev = useCallback(() => {
    const idx = tracks.findIndex((t) => t.id === activeId);
    const prev = tracks[(idx - 1 + tracks.length) % tracks.length];
    if (prev) handleSelect(prev.id);
  }, [activeId, handleSelect]);

  // ------------------------------
  // Drag-to-resize between compact and expanded
  // ------------------------------
  const panelRef = useRef<HTMLElement | null>(null);
  const dragStartRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const [dragWidth, setDragWidth] = useState<number | null>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const s = dragStartRef.current;
      if (!s) return;
      // Panel is on the RIGHT side and its drag handle is on the
      // LEFT (inner) edge. Dragging the handle leftward should grow
      // the panel; rightward should shrink it. So delta is inverted
      // relative to the previous left-sidebar layout.
      const dx = s.startX - e.clientX;
      const w = Math.max(COMPACT_WIDTH, Math.min(EXPANDED_WIDTH, s.startWidth + dx));
      setDragWidth(w);
    };
    const onUp = () => {
      if (!dragStartRef.current) return;
      // Snap to whichever edge we're closer to
      const final = dragWidth ?? COMPACT_WIDTH;
      const snapped: PanelSize =
        final > COMPACT_WIDTH + DRAG_THRESHOLD ? 'expanded' : 'compact';
      onSizeChange(snapped);
      setDragWidth(null);
      dragStartRef.current = null;
      document.body.style.removeProperty('cursor');
      document.body.style.removeProperty('user-select');
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragWidth, onSizeChange]);

  const handleHandleDown = useCallback((e: React.PointerEvent) => {
    dragStartRef.current = {
      startX: e.clientX,
      startWidth: size === 'expanded' ? EXPANDED_WIDTH : COMPACT_WIDTH,
    };
    setDragWidth(size === 'expanded' ? EXPANDED_WIDTH : COMPACT_WIDTH);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }, [size]);

  const effectiveWidth = dragWidth ?? (size === 'expanded' ? EXPANDED_WIDTH : COMPACT_WIDTH);
  const expanded = effectiveWidth > (COMPACT_WIDTH + EXPANDED_WIDTH) / 2;

  const handleToggleSize = () => onSizeChange(size === 'expanded' ? 'compact' : 'expanded');

  return (
    <aside
      ref={panelRef}
      className="creative-music"
      data-size={size}
      data-expanded={expanded || undefined}
      style={{ width: `${effectiveWidth}px` }}
      aria-label="Music player"
    >
      {/* In-flow header over the music column only. Replaces the
          previous full-width top bar — the gallery now has a floating
          pill (CreativeLeftPill) while the music panel owns its own
          header with the expand/collapse toggle and the signature. */}
      <header className="creative-music-header">
        <button
          type="button"
          className="creative-icon-btn creative-music-header-toggle"
          onClick={handleToggleSize}
          aria-label={expanded ? 'Collapse music panel' : 'Expand music panel'}
          title={expanded ? 'Collapse music panel' : 'Expand music panel'}
        >
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
            {expanded ? (
              /* Panel is currently expanded → clicking collapses it
                 toward the right edge. Arrow points RIGHT to signal
                 the direction the panel will shrink. */
              <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
                <rect x="2.5" y="3.5" width="15" height="13" rx="2" />
                <line x1="13" y1="3.5" x2="13" y2="16.5" />
                <path d="M6 10h5" />
                <path d="M8.5 12l2.5-2-2.5-2" />
              </g>
            ) : (
              /* Panel is currently compact → clicking expands it
                 toward the gallery. Arrow points LEFT to signal
                 the direction the panel will grow. */
              <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
                <rect x="2.5" y="3.5" width="15" height="13" rx="2" />
                <line x1="13" y1="3.5" x2="13" y2="16.5" />
                <path d="M11 10H6" />
                <path d="M8.5 8l-2.5 2 2.5 2" />
              </g>
            )}
          </svg>
        </button>
        {expanded && <span className="creative-music-header-sig">Jackie</span>}
      </header>

      <TrackList
        tracks={tracks}
        activeId={activeId}
        isPlaying={player.isPlaying}
        expanded={expanded}
        onSelect={handleSelect}
      />

      <div className="creative-music-footer">
        {expanded && (
          <SpectrumBars playing={player.isPlaying} />
        )}

        <div className="creative-music-now" aria-live="polite">
          <span className="creative-music-now-label">now playing</span>
          <span className="creative-music-now-title">
            {activeTrack ? activeTrack.title : '—'}
          </span>
          {expanded && activeTrack && (
            <span className="creative-music-now-composer">{activeTrack.composer}</span>
          )}
        </div>

        <div className="creative-music-controls">
          {expanded && (
            <button
              type="button"
              className="creative-music-btn"
              onClick={handlePrev}
              aria-label="Previous track"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M12 3L5 8l7 5V3z" fill="currentColor" />
                <rect x="3" y="3" width="1.2" height="10" fill="currentColor" />
              </svg>
            </button>
          )}
          <button
            type="button"
            className="creative-music-btn creative-music-btn-play"
            onClick={player.toggle}
            aria-label={player.isPlaying ? 'Pause' : 'Play'}
          >
            {player.isPlaying ? (
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <rect x="4" y="3" width="2.5" height="10" fill="currentColor" />
                <rect x="9.5" y="3" width="2.5" height="10" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M5 3v10l8-5z" fill="currentColor" />
              </svg>
            )}
          </button>
          {expanded && (
            <button
              type="button"
              className="creative-music-btn"
              onClick={handleNext}
              aria-label="Next track"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4 3l7 5-7 5V3z" fill="currentColor" />
                <rect x="11.8" y="3" width="1.2" height="10" fill="currentColor" />
              </svg>
            </button>
          )}
          {/* Collapse/expand moved out to the header bar (see
              CreativeTopNav). The drag handle on the inner edge is
              still here for resize-by-drag. */}
        </div>
      </div>

      {/* Drag handle on the left (inner) edge — pulls open toward the gallery */}
      <div
        className="creative-music-handle"
        onPointerDown={handleHandleDown}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize music panel"
      >
        <span aria-hidden="true" />
      </div>

      {player.audioElement}
    </aside>
  );
}
