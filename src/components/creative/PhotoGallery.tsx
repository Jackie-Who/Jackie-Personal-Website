import { useMemo } from 'react';
import type { Photo } from '@/content/photos';

interface Props {
  photos: Photo[];
  onOpen: (id: string) => void;
}

/**
 * Masonry-style photo grid, grouped by year. Three columns with
 * mixed tile sizes — 'wide' photos span two columns. Clicking any
 * tile transitions to the expanded view scrolled to that photo.
 *
 * The group order is newest-year-first. Photos without a year fall
 * into an "Undated" section at the bottom.
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
                className={`creative-photo-tile${p.layout === 'wide' ? ' creative-photo-tile-wide' : ''}`}
                onClick={() => onOpen(p.id)}
                aria-label={`Open ${p.title}`}
                style={{ background: p.placeholder }}
              >
                <span className="creative-photo-tile-caption">{p.title}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
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
  // Sort: real years descending, 'undated' always last.
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
