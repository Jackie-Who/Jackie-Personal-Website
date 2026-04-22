// Placeholder photo data — Phase 5 (CMS + R2) will replace this
// with real uploads. Each entry carries the EXIF tags that show
// up as pills below the image in the expanded view.

export type PhotoLayout = 'standard' | 'wide';

export interface Photo {
  id: string;
  title: string;
  /** CSS gradient stand-in until real image URLs are populated. */
  placeholder: string;
  layout: PhotoLayout;
  focal: string;
  aperture: string;
  shutter: string;
  iso: string;
  camera?: string;
  lens?: string;
  category?: string;
}

export const photos: Photo[] = [
  {
    id: 'p01',
    title: 'Light through vines',
    placeholder: 'linear-gradient(160deg, #2a1830 0%, #3a2040 45%, #1a1020 100%)',
    layout: 'standard',
    focal: '35mm',
    aperture: 'ƒ/1.8',
    shutter: '1/125s',
    iso: 'ISO 200',
    camera: 'Sony A7 III',
    lens: 'Sony 35mm ƒ/1.8',
    category: 'Portrait',
  },
  {
    id: 'p02',
    title: 'Rehearsal hall',
    placeholder: 'linear-gradient(200deg, #1e1428 0%, #2a1830 60%, #0e0a12 100%)',
    layout: 'wide',
    focal: '50mm',
    aperture: 'ƒ/2.2',
    shutter: '1/60s',
    iso: 'ISO 800',
    camera: 'Sony A7 III',
    lens: 'Sony 50mm ƒ/1.4',
    category: 'Music',
  },
  {
    id: 'p03',
    title: 'Still life with pears',
    placeholder: 'linear-gradient(180deg, #2a1830 0%, #1e1428 70%, #0e0a12 100%)',
    layout: 'standard',
    focal: '85mm',
    aperture: 'ƒ/2.8',
    shutter: '1/200s',
    iso: 'ISO 400',
    camera: 'Sony A7 III',
    lens: 'Sony 85mm ƒ/1.8',
    category: 'Still life',
  },
  {
    id: 'p04',
    title: 'After the rain',
    placeholder: 'linear-gradient(140deg, #1a1020 0%, #2a1830 50%, #3a2040 100%)',
    layout: 'standard',
    focal: '24mm',
    aperture: 'ƒ/4',
    shutter: '1/500s',
    iso: 'ISO 100',
    camera: 'Sony A7 III',
    lens: 'Sony 24-70mm',
    category: 'Street',
  },
  {
    id: 'p05',
    title: 'Concert hall (long exposure)',
    placeholder: 'linear-gradient(220deg, #1e1428 0%, #0e0a12 50%, #2a1830 100%)',
    layout: 'wide',
    focal: '24mm',
    aperture: 'ƒ/5.6',
    shutter: '4s',
    iso: 'ISO 200',
    camera: 'Sony A7 III',
    lens: 'Sony 24-70mm',
    category: 'Long exposure',
  },
  {
    id: 'p06',
    title: 'Moth on the window',
    placeholder: 'linear-gradient(170deg, #2a1830 0%, #3a2040 40%, #1a1020 100%)',
    layout: 'standard',
    focal: '90mm',
    aperture: 'ƒ/2.8',
    shutter: '1/250s',
    iso: 'ISO 320',
    camera: 'Sony A7 III',
    lens: 'Sony 90mm Macro',
    category: 'Macro',
  },
  {
    id: 'p07',
    title: 'Afternoon practice',
    placeholder: 'linear-gradient(190deg, #1a1020 0%, #1e1428 60%, #2a1830 100%)',
    layout: 'standard',
    focal: '50mm',
    aperture: 'ƒ/1.8',
    shutter: '1/100s',
    iso: 'ISO 1600',
    camera: 'Sony A7 III',
    lens: 'Sony 50mm ƒ/1.4',
    category: 'Music',
  },
  {
    id: 'p08',
    title: 'Coastal fog',
    placeholder: 'linear-gradient(210deg, #2a1830 0%, #1e1428 40%, #0e0a12 100%)',
    layout: 'wide',
    focal: '24mm',
    aperture: 'ƒ/8',
    shutter: '1/60s',
    iso: 'ISO 200',
    camera: 'Sony A7 III',
    lens: 'Sony 24-70mm',
    category: 'Landscape',
  },
  {
    id: 'p09',
    title: 'Night street',
    placeholder: 'linear-gradient(160deg, #0e0a12 0%, #1a1020 50%, #2a1830 100%)',
    layout: 'standard',
    focal: '35mm',
    aperture: 'ƒ/2',
    shutter: '1/80s',
    iso: 'ISO 3200',
    camera: 'Sony A7 III',
    lens: 'Sony 35mm ƒ/1.8',
    category: 'Street',
  },
];
