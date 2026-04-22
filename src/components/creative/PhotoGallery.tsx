import type { Photo } from '@/content/photos';

interface Props {
  photos: Photo[];
  onOpen: (id: string) => void;
}

/**
 * Masonry-style photo grid. Three columns with mixed tile sizes —
 * 'wide' photos span two columns. Clicking any tile transitions to
 * the expanded view scrolled to that photo.
 */
export default function PhotoGallery({ photos, onOpen }: Props) {
  return (
    <div className="creative-gallery" role="list" aria-label="Photography gallery">
      {photos.map((p) => (
        <button
          key={p.id}
          type="button"
          role="listitem"
          className={`creative-photo-tile${p.layout === 'wide' ? ' creative-photo-tile-wide' : ''}`}
          onClick={() => onOpen(p.id)}
          aria-label={`Open ${p.title}`}
          style={{ background: p.placeholder }}
        >
          <span className="creative-photo-tile-caption">{p.title}</span>
        </button>
      ))}
    </div>
  );
}
