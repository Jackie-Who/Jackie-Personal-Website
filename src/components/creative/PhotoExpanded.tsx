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
 * Scroll-snap photo viewer. Each photo occupies its own snap section
 * with an overlaid museum-style caption pill (bottom-left) and a
 * wall-color control (bottom-right). Returns to the gallery via the
 * subtle X on the image OR the 3×3-grid button up in the left pill
 * cluster (handled by CreativePortfolio → CreativeLeftPill).
 *
 * The wall color surrounding each image is controllable — viewers
 * can swap between five Lightroom-style neutrals or "From image",
 * which paints a pre-baked, pre-blurred copy of the current photo
 * as the wall. Choice persists to localStorage.
 *
 * The scroll container wraps around: scrolling past the last image
 * lands on the first, and scrolling above the first lands on the
 * last. Implemented by bookending the section list with cloned
 * copies of the first and last photos and swapping scrollTop to the
 * real counterpart the instant the browser snaps to a clone. Since
 * clones are identical bitmaps to their targets, the user sees a
 * single continuous scroll with no visual seam.
 */
export default function PhotoExpanded({ photos, startId, onClose }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [bgMode, setBgMode] = useState<BgMode>(DEFAULT_BG);
  const [activeId, setActiveId] = useState<string | null>(startId);
  // `captionVisible` drives the museum-label glass pill's opacity.
  // Starts false so the initial mount can animate it in via rAF
  // below (CSS transition doesn't play if initial == final state).
  // Toggles false whenever scroll starts and true again on settle,
  // producing the "fade in when the viewer arrives at an image"
  // behavior — caption is out of the way during scroll-between,
  // then re-announces when the image is framed.
  const [captionVisible, setCaptionVisible] = useState(false);
  // `displayedPhoto` is the photo the caption is currently SHOWING,
  // which lags behind `activePhoto` on purpose. `activePhoto` flips
  // mid-scroll (when the next image crosses the IntersectionObserver
  // threshold) to keep the blur wall in sync with the scroll, but if
  // we also flipped caption content at that moment the viewer would
  // see the NEXT image's text briefly flash before fading out. So we
  // hold the caption's content steady during fade-out and only swap
  // it atomically with the fade-back-in on scroll-settle (same
  // render frame → no flash).
  const activePhotoInitial = photos.find((p) => p.id === startId) ?? photos[0];
  const [displayedPhoto, setDisplayedPhoto] = useState<Photo | undefined>(activePhotoInitial);

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

  // Fade the caption in on mount — one-shot, after the next paint
  // so the CSS transition sees a 0 → 1 opacity change.
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setCaptionVisible(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  // Ref mirroring the latest activePhoto so the scroll-settle handler
  // (captured inside the scroll useEffect's closure below) can read
  // the current value without the effect re-binding every time
  // activeId changes. Updated every render.
  const activePhotoRef = useRef<Photo | undefined>(activePhotoInitial);

  // Initial scroll + wrap-around scroll handler, combined in one
  // effect so the order is deterministic (set initial position
  // BEFORE the wrap listener arms — otherwise mount fires a scroll
  // event at scrollTop = 0 which would trigger an unwanted wrap to
  // the real last section).
  useEffect(() => {
    const root = rootRef.current;
    if (!root || photos.length === 0) return;

    // Land on the photo the viewer clicked (or the first real section
    // if no startId). data-clone='none' disambiguates real sections
    // from the clone-last / clone-first bookends.
    const target = startId
      ? root.querySelector<HTMLElement>(
          `[data-clone='none'][data-photo-id='${CSS.escape(startId)}']`,
        )
      : root.querySelector<HTMLElement>(`[data-clone='none']`);
    if (target) target.scrollIntoView({ behavior: 'auto', block: 'start' });

    // Wrap-around only meaningful with more than one photo.
    if (photos.length <= 1) return;

    let wrapping = false;
    // A short grace window after mount so the initial scrollTo doesn't
    // immediately trip the wrap detector.
    let armed = false;
    const armTimer = window.setTimeout(() => { armed = true; }, 200);
    let settleTimer: number | null = null;

    // Only fire a wrap after the scroll has SETTLED at a snap point.
    // Firing mid-scroll (e.g. at scrollTop = 0.4 * h while the viewer
    // is on their way from clone-last to real-first) produces a
    // mid-gesture teleport that visibly shows both images at once.
    // Strict alignment (within 2 px of an integer multiple of h)
    // plus scrollend — or a 120 ms debounce fallback for browsers
    // without scrollend — guarantees we only wrap once the snap
    // animation has completed.
    const onSettle = () => {
      // Always re-announce the caption when the scroll comes to rest,
      // even if the wrap-detection logic below decides to bail early.
      // `wrapping` flags an in-flight instant jump — during that jump
      // we don't want the caption to reshow yet (it'll settle again
      // once the real section lands) but otherwise scroll-settled =
      // caption-visible. We also swap the displayed-photo content in
      // the same tick so the content update and the opacity transition
      // happen atomically (no flash of the new text fading out).
      if (!wrapping) {
        const latest = activePhotoRef.current;
        if (latest) setDisplayedPhoto(latest);
        setCaptionVisible(true);
      }
      if (!armed || wrapping) return;
      const h = root.clientHeight;
      if (h === 0) return;
      const scrollTop = root.scrollTop;
      const index = Math.round(scrollTop / h);
      if (Math.abs(scrollTop - index * h) > 2) return;

      if (index === 0) {
        // Settled on clone-last (before the real first). Jump to
        // the real last (position photos.length). Identical bytes
        // to the clone → user sees no seam.
        wrapping = true;
        root.scrollTo({ top: photos.length * h, behavior: 'auto' });
        window.setTimeout(() => { wrapping = false; }, 80);
      } else if (index === photos.length + 1) {
        // Settled on clone-first (after the real last). Jump to
        // the real first at position 1.
        wrapping = true;
        root.scrollTo({ top: h, behavior: 'auto' });
        window.setTimeout(() => { wrapping = false; }, 80);
      }
    };

    const onScroll = () => {
      // Hide the caption as soon as the viewer starts scrolling;
      // onSettle brings it back once the scroll comes to rest. The
      // wrap jumps fire synthetic scroll events too but `wrapping`
      // suppresses the hide in that case (it'd just flicker since
      // the jump is instant).
      if (!wrapping) setCaptionVisible(false);
      if (settleTimer !== null) window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(onSettle, 120);
    };
    root.addEventListener('scroll', onScroll, { passive: true });
    // Where supported (Chrome 114+, Safari 17.1+, FF 109+), the
    // browser fires a dedicated scrollend once snap settles — more
    // responsive than the debounce fallback. Both can fire in the
    // same session; onSettle is idempotent against duplicate calls.
    const hasScrollend = 'onscrollend' in root;
    if (hasScrollend) {
      root.addEventListener('scrollend', onSettle, { passive: true });
    }

    return () => {
      window.clearTimeout(armTimer);
      if (settleTimer !== null) window.clearTimeout(settleTimer);
      root.removeEventListener('scroll', onScroll);
      if (hasScrollend) root.removeEventListener('scrollend', onSettle);
    };
  }, [photos.length, startId]);

  // Track which photo is currently in view so the "blur" bg can
  // mirror whichever photo the viewer is looking at. Uses
  // IntersectionObserver on each section — the most-visible one
  // wins. Clones carry the same data-photo-id as their target so
  // intersecting with a clone correctly updates the active photo
  // (and the blur wall) to match.
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
  }, [photos.length]);

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
  // Keep the ref pointing at the latest active photo so the scroll-
  // settle handler (captured in a long-lived closure) can read the
  // current value when it swaps in the caption content.
  activePhotoRef.current = activePhoto;

  // Bookend the list with cloned copies of the last and first photos
  // so the wrap-around scroll handler has somewhere to "arrive" at
  // each boundary. Each bookend renders the SAME image/caption as its
  // target — the handler then swaps scrollTop to the real section in
  // the same paint frame, so the user never sees a duplicate.
  interface RenderEntry { photo: Photo; clone: 'none' | 'first' | 'last'; key: string; }
  const renderList: RenderEntry[] =
    photos.length === 0
      ? []
      : photos.length === 1
        ? [{ photo: photos[0], clone: 'none', key: photos[0].id }]
        : [
            { photo: photos[photos.length - 1], clone: 'last', key: `clone-last-${photos[photos.length - 1].id}` },
            ...photos.map<RenderEntry>((p) => ({ photo: p, clone: 'none', key: p.id })),
            { photo: photos[0], clone: 'first', key: `clone-first-${photos[0].id}` },
          ];

  return (
    <div
      className="creative-expanded-frame"
      data-bg-mode={bgMode}
      style={wallStyle}
    >
      <div
        ref={rootRef}
        className="creative-expanded no-scrollbar"
      >
        {renderList.map((item) => {
          const wallSrc = item.photo.blurDataUrl ?? item.photo.url ?? null;
          return (
          <section
            key={item.key}
            data-photo-id={item.photo.id}
            data-clone={item.clone}
            className="creative-expanded-section"
          >
            <figure className="creative-expanded-frame-figure">
              {/* Blur wall — positioned absolutely at the figure's
                  center, sized with the same aspect-ratio + max-dim
                  constraints as the actual image, so the blur and the
                  image occupy the same footprint. The heavy CSS blur
                  filter then bleeds the image's edge colors outward
                  into the surrounding padding area — so the photo
                  visibly "extends" into the background rather than
                  sitting as a separate element on top of an unrelated
                  blur of the whole frame. Only rendered in blur mode;
                  solid-color walls use the frame bg instead. */}
              {bgMode === 'blur' && wallSrc ? (
                <div
                  className="creative-expanded-section-blur"
                  aria-hidden="true"
                  style={{
                    ['--wall-image' as unknown as string]: `url("${wallSrc}")`,
                    ['--wall-aspect' as unknown as string]: String(item.photo.aspectRatio ?? 1.5),
                  } as React.CSSProperties}
                />
              ) : null}
              <div
                className="creative-expanded-image"
                style={!item.photo.url ? { background: item.photo.placeholder } : undefined}
              >
                {item.photo.url ? (
                  <img
                    src={item.photo.url}
                    alt={item.photo.title}
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
              </div>
            </figure>
          </section>
          );
        })}
      </div>

      {/* Museum-style wall label — glass pill anchored bottom-LEFT
          of the FRAME (not per-section, so it doesn't scroll with
          the image sections). Content updates to match the active
          photo as the viewer scrolls; visibility fades out during
          scroll and fades back in once the scroll has settled on a
          new image, via the `captionVisible` state driven by the
          scroll/scrollend handler. Text + glass colors adapt to the
          wall-color preset via [data-bg-mode] selectors in
          creative.css, so it stays readable on any chosen wall. */}
      {displayedPhoto && (
        <div
          className="creative-expanded-caption"
          data-visible={captionVisible ? 'true' : undefined}
          aria-live="polite"
        >
          <span className="creative-expanded-caption-title">{displayedPhoto.title}</span>
          <span className="creative-expanded-caption-meta">
            <span>{displayedPhoto.aperture}</span>
            <span aria-hidden="true" className="creative-expanded-caption-dot">·</span>
            <span>{displayedPhoto.shutter}</span>
            <span aria-hidden="true" className="creative-expanded-caption-dot">·</span>
            <span>{displayedPhoto.iso}</span>
            {displayedPhoto.year ? (
              <>
                <span aria-hidden="true" className="creative-expanded-caption-dot">·</span>
                <span>{displayedPhoto.year}</span>
              </>
            ) : null}
          </span>
        </div>
      )}

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
    // Blur mode renders TWO stacked layers, both driven by the
    // currently-active photo's pre-baked blur:
    //   1. Frame-level ::before (cover-sized, heavy blur) — fills the
    //      full frame so there are no transparent edges at the
    //      corners / wide viewports where the per-section halo blur
    //      doesn't reach. Reads as a color-mood wash.
    //   2. Per-section halo (image-footprint-sized, moderate blur) —
    //      the existing layer inside each section, gives the "image
    //      extending outward" sensation near the image.
    // Both consume the same blurDataUrl so colors stay coherent.
    // --creative-wall-image cascades down from here into the frame
    // ::before (same element, direct read). The per-section div uses
    // its own --wall-image set inline per-section.
    if (!photo) return {};
    const wall = photo.blurDataUrl
      ? `url("${photo.blurDataUrl}")`
      : photo.url
        ? `url("${photo.url}")`
        : photo.placeholder;
    return {
      ['--creative-wall-image' as unknown as string]: wall,
    } as React.CSSProperties;
  }
  const preset = BG_PRESETS.find((p) => p.id === mode);
  if (!preset) return {};
  return { background: preset.swatch };
}
