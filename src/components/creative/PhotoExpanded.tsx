import { useEffect, useRef, useState } from 'react';
import type { Photo } from '@/content/photos';

interface Props {
  photos: Photo[];
  startId: string | null;
  onClose: () => void;
}

/** Background treatment for the expanded view.
 *  Mirrors Adobe Lightroom's Develop-module background presets
 *  (white → light gray → gray → dark gray → black) plus a "blur"
 *  option that uses a Gaussian blur of the current image as the
 *  backdrop so the wall color is derived from the photo itself. */
type BgMode = 'white' | 'light-gray' | 'gray' | 'dark-gray' | 'black' | 'blur';

const BG_PRESETS: {
  id: BgMode;
  label: string;
  swatch: string;
}[] = [
  { id: 'white', label: 'White', swatch: '#ffffff' },
  { id: 'light-gray', label: 'Light gray', swatch: '#bfbfbf' },
  { id: 'gray', label: 'Gray', swatch: '#808080' },
  { id: 'dark-gray', label: 'Dark gray', swatch: '#3f3f3f' },
  { id: 'black', label: 'Black', swatch: '#101010' },
  { id: 'blur', label: 'From image (blur)', swatch: 'blur' },
];

const DEFAULT_BG: BgMode = 'dark-gray';
const STORAGE_KEY = 'creative-expanded-bg';

/**
 * Scroll-snap photo viewer. Each photo occupies its own snap
 * section with EXIF tags below. Returns to the gallery via the
 * subtle X that lives in the top-right of each image (always
 * faintly visible, brightens on hover).
 *
 * The wall color surrounding the image is controllable — viewers
 * can swap between five Lightroom-style neutrals or "From image",
 * which paints a heavily-blurred copy of the photo as the wall.
 * Choice persists to localStorage so it carries between sessions.
 */
export default function PhotoExpanded({ photos, startId, onClose }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [bgMode, setBgMode] = useState<BgMode>(DEFAULT_BG);
  const [activeId, setActiveId] = useState<string | null>(startId);

  // Hydrate bg choice from localStorage on mount.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved && BG_PRESETS.some((p) => p.id === saved)) {
        setBgMode(saved as BgMode);
      }
    } catch {
      /* storage may be unavailable in some embedding contexts */
    }
  }, []);

  // Persist bg choice whenever it changes.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, bgMode);
    } catch {
      /* ignore */
    }
  }, [bgMode]);

  // Scroll to the photo that was clicked in the gallery
  useEffect(() => {
    if (!startId) return;
    const root = rootRef.current;
    if (!root) return;
    const target = root.querySelector<HTMLElement>(`[data-photo-id='${CSS.escape(startId)}']`);
    target?.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, [startId]);

  // Track which photo is currently in view so the "blur" bg can
  // mirror the photo the viewer is looking at. Uses
  // IntersectionObserver on each section — the most-visible one
  // wins. Falls back gracefully if no observer (older browsers).
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        let topEntry: IntersectionObserverEntry | null = null;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          if (!topEntry || e.intersectionRatio > topEntry.intersectionRatio) {
            topEntry = e;
          }
        }
        if (topEntry) {
          const el = topEntry.target as HTMLElement;
          const id = el.getAttribute('data-photo-id');
          if (id) setActiveId(id);
        }
      },
      { root, threshold: [0.2, 0.55, 0.8] },
    );
    const sections = root.querySelectorAll<HTMLElement>('[data-photo-id]');
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  // Esc to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const activePhoto = photos.find((p) => p.id === activeId) ?? photos[0];
  const wallStyle = resolveWallStyle(bgMode, activePhoto);

  return (
    <div className="creative-expanded-frame">
    <div
      ref={rootRef}
      className="creative-expanded no-scrollbar"
      data-bg-mode={bgMode}
      style={wallStyle}
    >
      {photos.map((p) => (
        <section
          key={p.id}
          data-photo-id={p.id}
          className="creative-expanded-section"
        >
          <figure className="creative-expanded-frame-figure">
            <div
              className="creative-expanded-image"
              style={!p.url ? { background: p.placeholder } : undefined}
            >
              {p.url ? (
                <img
                  src={p.url}
                  alt={p.title}
                  className="creative-expanded-img"
                  decoding="async"
                />
              ) : null}
              <button
                type="button"
                className="creative-expanded-close"
                onClick={onClose}
                aria-label="Return to gallery"
              >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path
                    d="M4 4l8 8M12 4l-8 8"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              {/* Museum-style label — overlaid as a glass pill in the
                  bottom-left of the image. Title sits on top in serif
                  italic; a single monospaced line beneath lists the
                  technical details. Lives inside the image box so the
                  whole section fits a single viewport (no scroll to
                  reveal the caption). */}
              <figcaption className="creative-expanded-caption">
                <span className="creative-expanded-caption-title">{p.title}</span>
                <span className="creative-expanded-caption-meta">
                  <span>{p.aperture}</span>
                  <span aria-hidden="true" className="creative-expanded-caption-dot">·</span>
                  <span>{p.shutter}</span>
                  <span aria-hidden="true" className="creative-expanded-caption-dot">·</span>
                  <span>{p.iso}</span>
                  {p.year ? (
                    <>
                      <span aria-hidden="true" className="creative-expanded-caption-dot">·</span>
                      <span>{p.year}</span>
                    </>
                  ) : null}
                </span>
              </figcaption>
            </div>
          </figure>
        </section>
      ))}
    </div>

      <div
        className="creative-expanded-bg-ctrl"
        role="radiogroup"
        aria-label="Wall color"
      >
        {BG_PRESETS.map((preset) => {
          const isActive = preset.id === bgMode;
          const isBlur = preset.id === 'blur';
          return (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={preset.label}
              title={preset.label}
              className={
                'creative-expanded-bg-swatch' +
                (isActive ? ' is-active' : '') +
                (isBlur ? ' is-blur' : '')
              }
              onClick={() => setBgMode(preset.id)}
              style={isBlur ? undefined : { background: preset.swatch }}
            >
              {isBlur ? (
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <defs>
                    <radialGradient id="blur-swatch" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#f0e0ff" />
                      <stop offset="55%" stopColor="#9a7aa0" />
                      <stop offset="100%" stopColor="#2a1830" />
                    </radialGradient>
                  </defs>
                  <circle cx="10" cy="10" r="9" fill="url(#blur-swatch)" />
                </svg>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}


function resolveWallStyle(mode: BgMode, photo: Photo | undefined): React.CSSProperties {
  if (mode === 'blur') {
    if (!photo) return {};
    // Real photos (with a `url`) get their own bytes painted as the
    // backdrop via `url(…)`; the CSS ::before in creative.css blurs
    // that image to produce the Lightroom-style "from image" wall.
    // Placeholder entries (pre-CMS static data, `url` = null) fall
    // back to their CSS gradient — still produces a coherent tint.
    const wall = photo.url ? `url("${photo.url}")` : photo.placeholder;
    return { ['--creative-wall-image' as unknown as string]: wall } as React.CSSProperties;
  }
  const preset = BG_PRESETS.find((p) => p.id === mode);
  if (!preset) return {};
  return { background: preset.swatch };
}
