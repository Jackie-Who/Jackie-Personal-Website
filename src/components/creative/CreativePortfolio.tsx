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
  // Default to light on first visit. Last chosen theme is still
  // restored from localStorage after mount (see useEffect below).
  const [theme, setTheme] = useState<CreativeTheme>('light');
  // Music-panel size is lifted up so the header-bar toggle and the
  // drag handle both drive the same source of truth.
  const [musicSize, setMusicSize] = useState<PanelSize>('expanded');

  // Hydrate from localStorage on mount. We default to dark to avoid
  // flashing a light panel if the viewer last chose dark — the
  // server HTML is dark-first too.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') setTheme(saved);
    } catch {
      /* storage may be unavailable in some embedding contexts */
    }
  }, []);

  // Keep the body bg in sync with theme — otherwise the Astro
  // pre-hydration style on body.creative-body is whatever the
  // SSR rendered, which won't flip when the visitor toggles.
  useEffect(() => {
    document.body.classList.toggle('creative-body-light', theme === 'light');
  }, [theme]);


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
      <CreativeLeftPill onBack={handleBack} theme={theme} onToggleTheme={handleToggleTheme} />

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
  );
}
