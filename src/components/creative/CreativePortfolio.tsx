import { useCallback, useState } from 'react';
import { navigate } from 'astro:transitions/client';
import CreativeTopNav from './CreativeTopNav';
import MusicPanel from './MusicPanel';
import PhotoGallery from './PhotoGallery';
import PhotoExpanded from './PhotoExpanded';
import CreativeReturnOverlay from './CreativeReturnOverlay';
import type { Photo } from '@/content/photos';
import type { Track } from '@/content/tracks';
import './creative.css';

const BACK_SWIPE_MS = 600;

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

  return (
    <div className="creative-app" data-view={view} data-leaving={leaving || undefined}>
      {leaving && <CreativeReturnOverlay />}
      <CreativeTopNav onBack={handleBack} />

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

        <MusicPanel tracks={tracks} />
      </main>
    </div>
  );
}
