import { photos as staticPhotos, type Photo } from './photos';
import { tracks as staticTracks, type Track } from './tracks';
import { isDbReady, listPhotos, listTracks, type PhotoRow, type TrackRow } from '@/lib/db';
import { r2PublicUrl, isR2Configured } from '@/lib/r2';

/**
 * Content loaders — return live DB rows when Turso + R2 are
 * configured, fall back to the static placeholder arrays otherwise.
 * Called from the server-rendered `creative.astro` page on each
 * request (in hybrid mode) so newly-published items appear without
 * a rebuild.
 */

export async function loadPhotos(): Promise<Photo[]> {
  try {
    if (!isR2Configured()) return staticPhotos;
    if (!(await isDbReady())) return staticPhotos;
    const rows = await listPhotos({ publishedOnly: true });
    if (rows.length === 0) return staticPhotos;
    return rows.map(rowToPhoto);
  } catch {
    return staticPhotos;
  }
}

export async function loadTracks(): Promise<Track[]> {
  try {
    if (!isR2Configured()) return staticTracks;
    if (!(await isDbReady())) return staticTracks;
    const rows = await listTracks({ publishedOnly: true });
    if (rows.length === 0) return staticTracks;
    return rows.map(rowToTrack);
  } catch {
    return staticTracks;
  }
}

function rowToPhoto(r: PhotoRow): Photo {
  // Derive the calendar year from date_taken for year-group
  // headers. Null-safe — photos without EXIF capture date land in
  // the "Undated" bucket at the bottom of the gallery.
  let year: number | undefined;
  if (r.date_taken) {
    const d = new Date(r.date_taken);
    if (!Number.isNaN(d.getTime())) year = d.getUTCFullYear();
  }
  return {
    id: r.id,
    title: r.title,
    // R2 URL replaces the CSS-gradient placeholder so the gallery
    // tiles + expanded view show the real image.
    placeholder: `url(${r2PublicUrl(r.r2_key)}) center/cover no-repeat, linear-gradient(160deg,#1e1428,#0e0a12)`,
    layout: (r.layout === 'wide' ? 'wide' : 'standard') as Photo['layout'],
    focal: r.focal_length ?? '—',
    aperture: r.aperture ?? '—',
    shutter: r.shutter_speed ?? '—',
    iso: r.iso ?? '—',
    camera: r.camera ?? undefined,
    lens: r.lens ?? undefined,
    category: r.category ?? undefined,
    year,
  };
}

function rowToTrack(r: TrackRow): Track {
  // If the admin uploaded a cover image, render it as a CSS
  // background so the TrackList thumbnail gets the real artwork.
  // Otherwise fall back to a palette-matched gradient.
  const thumbnail = r.cover_r2_key
    ? `url(${r2PublicUrl(r.cover_r2_key)}) center/cover no-repeat, linear-gradient(135deg,#3a2838,#1a1420)`
    : 'linear-gradient(135deg, #3a2838 0%, #1a1420 100%)';
  return {
    id: r.id,
    title: r.title,
    composer: r.composer ?? '',
    duration: r.duration_seconds ?? 0,
    type: (['solo', 'ensemble', 'cover'].includes(r.type ?? '')
      ? r.type
      : 'solo') as Track['type'],
    audioUrl: r2PublicUrl(r.audio_r2_key),
    thumbnail,
    note: r.notes ?? undefined,
  };
}
