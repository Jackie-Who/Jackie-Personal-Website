import { useCallback, useEffect, useState } from 'react';
import { navigate } from 'astro:transitions/client';
import CreativeLeftPill, { type CreativeTheme } from './CreativeLeftPill';
import MusicPanel, { type PanelSize } from './MusicPanel';
import PhotoGallery from './PhotoGallery';
import PhotoExpanded from './PhotoExpanded';
import CreativeReturnOverlay from './CreativeReturnOverlay';
import LoadingScreen from './LoadingScreen';
import type { Photo } from '@/content/photos';
import type { Track } from '@/content/tracks';
import './creative.css';

const BACK_SWIPE_MS = 600;
const THEME_STORAGE_KEY = 'creative-theme';

type View = 'gallery' | 'expanded';

interface Props {
  /** Photos to render in the gallery. Passed from creative.astro so
   *  the server can hydrate from Turso (falling back to the static
   *  placeholder array during Phases 1–4 / before DB is configured). */
  photos: Photo[];
  /** Tracks for the music panel. Same loader contract as photos. */
  tracks: Track[];
}

export default function CreativePortfolio({ photos, tracks }: Props) {
  const [view, setView] = useState<View>('gallery');
  const [expandedStart, setExpandedStart] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  // Resolve the visitor's preferred theme synchronously from
  // localStorage so the very first React render already uses the
  // right theme. Without this, returning dark-mode users saw a
  // single-frame flash of the light palette before a second render
  // flipped it. Safe to touch localStorage — this component is
  // client:only, never runs during SSR.
  const [theme, setTheme] = useState<CreativeTheme>(() => {
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      /* storage may be unavailable in some embedding contexts */
    }
    return 'light';
  });
  // Music-panel size is lifted up so the header-bar toggle and the
  // drag handle both drive the same source of truth.
  const [musicSize, setMusicSize] = useState<PanelSize>('expanded');
  // Loading-screen visibility. Starts true so a returning visitor
  // sees the branded overlay covering React's hydration window
  // (instead of a flash of empty gallery placeholders). rAF after
  // mount flips it false, triggering a 420 ms fade-out via CSS.
  const [loaderVisible, setLoaderVisible] = useState(true);

  // Keep the body bg in sync with theme. Both classes are mutually
  // exclusive — the Astro pre-hydration script on creative.astro
  // adds one of them before React boots, and we flip between them
  // as the viewer toggles. Without this, mobile overscroll / any
  // area outside .creative-app (which has its own bg) reveals the
  // wrong color behind the app.
  useEffect(() => {
    document.body.classList.toggle('creative-body-light', theme === 'light');
    document.body.classList.toggle('creative-body-dark', theme === 'dark');
  }, [theme]);

  // Hide the loading screen on the next paint after first render.
  // Two rAFs guarantees the initial paint happens with the overlay
  // at opacity 1, then the CSS transition actually fires on the
  // flip to data-visible=undefined. One rAF can still paint with
  // the "hidden" state applied, skipping the fade.
  useEffect(() => {
    const id1 = window.requestAnimationFrame(() => {
      const id2 = window.requestAnimationFrame(() => setLoaderVisible(false));
      return () => window.cancelAnimationFrame(id2);
    });
    return () => window.cancelAnimationFrame(id1);
  }, []);


  const handleOpenPhoto = useCallback((id: string) => {
    setExpandedStart(id);
    setView('expanded');
  }, []);

  const handleClosePhoto = useCallback(() => {
    setView('gallery');
  }, []);

  const handleBack = useCallback(() => {
    // Swipe overlay plays its outgoing animation, then ClientRouter
    // handles the navigation in-place — no white flash at the swap.
    setLeaving(true);
    window.setTimeout(() => {
      navigate('/');
    }, BACK_SWIPE_MS);
  }, []);

  const handleToggleTheme = useCallback(() => {
    setTheme((t) => {
      const next: CreativeTheme = t === 'dark' ? 'light' : 'dark';
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return (
    <>
      <div
        className="creative-app"
        data-view={view}
        data-leaving={leaving || undefined}
        data-theme={theme}
      >
        {leaving && <CreativeReturnOverlay />}
        <CreativeLeftPill
          onBack={handleBack}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          showGallery={view === 'expanded'}
          onGallery={handleClosePhoto}
        />

        <main className="creative-main">
          <div className="creative-stage">
            {view === 'gallery' ? (
              <PhotoGallery photos={photos} onOpen={handleOpenPhoto} />
            ) : (
              <PhotoExpanded
                photos={photos}
                startId={expandedStart}
                onClose={handleClosePhoto}
              />
            )}
          </div>

          <MusicPanel tracks={tracks} size={musicSize} onSizeChange={setMusicSize} />
        </main>
      </div>

      {/* Loading screen — rendered OUTSIDE .creative-app so its
          theme can inherit the body-level class (which the
          pre-hydration script in creative.astro set before React
          even booted). Sibling order + fixed positioning means the
          overlay always paints above the rest of the app during
          the brief hydration window; fades out once loaderVisible
          flips false (rAF after mount). */}
      <LoadingScreen visible={loaderVisible} />
    </>
  );
}
