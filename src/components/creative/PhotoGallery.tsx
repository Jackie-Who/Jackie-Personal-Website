import { useMemo } from 'react';
import type { Photo } from '@/content/photos';

interface Props {
  photos: Photo[];
  onOpen: (id: string) => void;
}

/**
 * Photo grid — column-masonry so every tile renders at its true
 * aspect ratio (no 1:1 crop). Grouped by year.
 *
 * - Photos with a real `url` render as `<img>` inside the tile;
 *   the browser uses the image's natural dimensions. If we have a
 *   stored aspectRatio, the tile pre-reserves that aspect via CSS
 *   `aspect-ratio` so there's no layout shift when the image
 *   decodes.
 * - Photos without a `url` (static placeholders) render as a
 *   square gradient tile — the gradient fills the slot.
 */
export default function PhotoGallery({ photos, onOpen }: Props) {
  const groups = useMemo(() => buildYearGroups(photos), [photos]);

  return (
    <div className="creative-gallery-groups" aria-label="Photography gallery">
      {groups.map((g) => (
        <section key={g.key} className="creative-gallery-group" aria-label={`Photos from ${g.label}`}>
          <header className="creative-gallery-group-header">
            <h2 className="creative-gallery-group-label">{g.label}</h2>
            <span className="creative-gallery-group-count">
              {g.photos.length} {g.photos.length === 1 ? 'photo' : 'photos'}
            </span>
          </header>
          <div className="creative-gallery" role="list">
            {g.photos.map((p) => (
              <button
                key={p.id}
                type="button"
                role="listitem"
                className="creative-photo-tile"
                onClick={() => onOpen(p.id)}
                aria-label={`Open ${p.title}`}
                style={aspectStyle(p)}
              >
                {p.url ? (
                  <img
                    src={p.url}
                    alt={p.title}
                    className="creative-photo-tile-img"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span
                    className="creative-photo-tile-fill"
                    style={{ background: p.placeholder }}
                    aria-hidden="true"
                  />
                )}
                <span className="creative-photo-tile-caption">{p.title}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function aspectStyle(p: Photo): React.CSSProperties | undefined {
  // Reserve layout space so column-masonry has a height before the
  // image decodes. Real images with a known ratio → use it exactly.
  // Gradient placeholders default to a 1:1 square so they fill a
  // recognizable slot.
  if (p.aspectRatio && Number.isFinite(p.aspectRatio) && p.aspectRatio > 0) {
    return { aspectRatio: String(p.aspectRatio) };
  }
  if (!p.url) return { aspectRatio: '1 / 1' };
  return undefined;
}

interface YearGroup {
  key: string;
  label: string;
  photos: Photo[];
}

function buildYearGroups(photos: Photo[]): YearGroup[] {
  const buckets = new Map<string, Photo[]>();
  for (const p of photos) {
    const key = p.year ? String(p.year) : 'undated';
    const arr = buckets.get(key) ?? [];
    arr.push(p);
    buckets.set(key, arr);
  }
  const entries = Array.from(buckets.entries());
  // Real years descending, 'undated' always last.
  entries.sort((a, b) => {
    if (a[0] === 'undated') return 1;
    if (b[0] === 'undated') return -1;
    return Number(b[0]) - Number(a[0]);
  });
  return entries.map(([key, photos]) => ({
    key,
    label: key === 'undated' ? 'Undated' : key,
    photos,
  }));
}
