import { useCallback, useEffect, useState } from 'react';
import { navigate } from 'astro:transitions/client';
import CreativeLeftPill, { type CreativeTheme } from './CreativeLeftPill';
import MusicPanel, { type PanelSize } from './MusicPanel';
import PhotoGallery from './PhotoGallery';
import PhotoExpanded from './PhotoExpanded';
import CreativeReturnOverlay from './CreativeReturnOverlay';
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

  // Hide the SSR-rendered loading screen now that React has mounted.
  // The loader element lives in creative.astro's HTML (a sibling of
  // <main>), painted from the moment the page lands — covering the
  // entire JS-download / parse / hydrate window. Once we're here,
  // React's tree is mounted and the gallery is ready to be revealed,
  // so we add data-hide=true to start the 420 ms fade-out, then
  // remove the element from the DOM after the transition completes
  // so it can't intercept clicks or accumulate across navigations.
  useEffect(() => {
    const id1 = window.requestAnimationFrame(() => {
      const id2 = window.requestAnimationFrame(() => {
        const loader = document.getElementById('creative-loading-screen');
        if (loader) {
          loader.setAttribute('data-hide', 'true');
          window.setTimeout(() => loader.remove(), 800);
        }
      });
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
      {/* The loading screen overlay used to live here as a React
          component. It now lives as static HTML in creative.astro
          so it covers the JS-download / hydrate window — see the
          mount effect above for the hide / remove logic. */}
    </div>
  );
}
