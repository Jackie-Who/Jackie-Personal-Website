import { useMemo } from 'react';
import type { Photo } from '@/content/photos';

interface Props {
  photos: Photo[];
  onOpen: (id: string) => void;
}

/**
 * Photo grid — justified-rows layout. Every tile in a row shares
 * the same height; each tile's width is derived from its photo's
 * aspect ratio (wider for landscapes, narrower for portraits).
 * Grouped by year.
 *
 * Every tile must carry an explicit `aspect-ratio` so the row can
 * reserve width before the image decodes — real photos use their
 * stored aspectRatio, static placeholders fall back to 1:1 or 3:2.
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

function aspectStyle(p: Photo): React.CSSProperties {
  // Justified-rows layout needs an aspect-ratio on every tile so
  // the row can compute width from the shared fixed height before
  // the image decodes. Real images use their stored ratio; static
  // placeholders fall back to 1:1 (no url) or 3:2 (has url but no
  // stored ratio — pre-aspect-ratio-column rows).
  const ratio = p.aspectRatio && Number.isFinite(p.aspectRatio) && p.aspectRatio > 0
    ? p.aspectRatio
    : !p.url ? 1 : 1.5;
  return { aspectRatio: String(ratio) };
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
