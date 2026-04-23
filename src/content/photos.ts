// Placeholder photo data — Phase 5 (CMS + R2) will replace this
// with real uploads. Each entry carries the EXIF tags that show
// up as pills below the image in the expanded view.
//
// Placeholder gradients span a range of photographic moods
// (foliage green, golden hour, cool fog, crimson, teal, etc.) so
// the gallery reads as a mixed-content feed while the site is
// running on stand-in data — not a monochrome purple wall.

export type PhotoLayout = 'standard' | 'wide';

export interface Photo {
  id: string;
  title: string;
  /** CSS gradient stand-in until real image URLs are populated. */
  placeholder: string;
  layout: PhotoLayout;
  /** EXIF tags shown as pills below the image in the expanded view.
   *  We only keep the three most universally meaningful tags —
   *  focal length, camera body, lens, and category were removed in
   *  favor of a cleaner, less-is-more caption row. */
  aperture: string;
  shutter: string;
  iso: string;
  /** Year the photo was taken — used to group tiles by year in
   *  the gallery. Populated from EXIF DateTimeOriginal by the
   *  CMS upload path; manually set on static placeholder data. */
  year?: number;
}

export const photos: Photo[] = [
  {
    id: 'p01',
    title: 'Light through vines',
    placeholder: 'linear-gradient(160deg, #3a4a28 0%, #1f2a18 55%, #0e1408 100%)',
    layout: 'standard',
    aperture: 'ƒ/1.8',
    shutter: '1/125s',
    iso: 'ISO 200',
    year: 2026,
  },
  {
    id: 'p02',
    title: 'Rehearsal hall',
    placeholder: 'linear-gradient(200deg, #3a2e18 0%, #241d12 55%, #0e0a06 100%)',
    layout: 'wide',
    aperture: 'ƒ/2.2',
    shutter: '1/60s',
    iso: 'ISO 800',
    year: 2026,
  },
  {
    id: 'p03',
    title: 'Still life with pears',
    placeholder: 'linear-gradient(180deg, #3a2818 0%, #281c12 65%, #120e08 100%)',
    layout: 'standard',
    aperture: 'ƒ/2.8',
    shutter: '1/200s',
    iso: 'ISO 400',
    year: 2025,
  },
  {
    id: 'p04',
    title: 'After the rain',
    placeholder: 'linear-gradient(140deg, #1a2028 0%, #2a323c 50%, #0e1218 100%)',
    layout: 'standard',
    aperture: 'ƒ/4',
    shutter: '1/500s',
    iso: 'ISO 100',
    year: 2025,
  },
  {
    id: 'p05',
    title: 'Concert hall (long exposure)',
    placeholder: 'linear-gradient(220deg, #3a1418 0%, #140a0c 50%, #2a1a24 100%)',
    layout: 'wide',
    aperture: 'ƒ/5.6',
    shutter: '4s',
    iso: 'ISO 200',
    year: 2025,
  },
  {
    id: 'p06',
    title: 'Moth on the window',
    placeholder: 'linear-gradient(170deg, #1a2a28 0%, #0e1a1a 55%, #0a1010 100%)',
    layout: 'standard',
    aperture: 'ƒ/2.8',
    shutter: '1/250s',
    iso: 'ISO 320',
    year: 2024,
  },
  {
    id: 'p07',
    title: 'Afternoon practice',
    placeholder: 'linear-gradient(190deg, #2f2228 0%, #1e1418 60%, #120a0e 100%)',
    layout: 'standard',
    aperture: 'ƒ/1.8',
    shutter: '1/100s',
    iso: 'ISO 1600',
    year: 2024,
  },
  {
    id: 'p08',
    title: 'Coastal fog',
    placeholder: 'linear-gradient(210deg, #2a3842 0%, #18242e 50%, #0a1018 100%)',
    layout: 'wide',
    aperture: 'ƒ/8',
    shutter: '1/60s',
    iso: 'ISO 200',
    year: 2023,
  },
  {
    id: 'p09',
    title: 'Night street',
    placeholder: 'linear-gradient(160deg, #0a0e1a 0%, #14182a 55%, #1a2040 100%)',
    layout: 'standard',
    aperture: 'ƒ/2',
    shutter: '1/80s',
    iso: 'ISO 3200',
    year: 2023,
  },
];
