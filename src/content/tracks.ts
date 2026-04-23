// Placeholder track data for the /creative music panel.
// Audio URLs are null until Phase 5 (CMS + R2) wires in real files —
// the player UI still runs, it just won't play audio yet.

export interface Track {
  id: string;
  title: string;
  composer: string;
  duration: number; // seconds
  type: 'solo' | 'ensemble' | 'cover';
  audioUrl?: string | null;
  /**
   * Cover art — either a URL (real image, once Phase 5 uploads are
   * wired) or a CSS gradient placeholder. Rendered as the sole thing
   * in the compact list view, with title + composer + duration
   * added alongside it when the panel is expanded.
   */
  thumbnail?: string;
  note?: string;
}

const min = (m: number, s: number) => m * 60 + s;

export const tracks: Track[] = [
  {
    id: 'nocturne-eb',
    title: 'Nocturne in E-flat',
    composer: 'Chopin (arr. flute)',
    duration: min(4, 32),
    type: 'solo',
    thumbnail: 'linear-gradient(135deg, #3a2050 0%, #1e1428 100%)',
  },
  {
    id: 'badinerie',
    title: 'Badinerie',
    composer: 'Bach · BWV 1067',
    duration: min(1, 48),
    type: 'solo',
    thumbnail: 'linear-gradient(135deg, #5a3060 0%, #2a1830 100%)',
  },
  {
    id: 'syrinx',
    title: 'Syrinx',
    composer: 'Debussy',
    duration: min(3, 15),
    type: 'solo',
    thumbnail: 'linear-gradient(135deg, #1e3040 0%, #0e1a24 100%)',
  },
  {
    id: 'suite-bmin',
    title: 'Suite no. 2 in B minor',
    composer: 'Bach',
    duration: min(6, 22),
    type: 'ensemble',
    note: 'Live ensemble',
    thumbnail: 'linear-gradient(135deg, #2a1e3a 0%, #14102a 100%)',
  },
  {
    id: 'pavane',
    title: 'Pavane',
    composer: 'Fauré',
    duration: min(5, 40),
    type: 'solo',
    thumbnail: 'linear-gradient(135deg, #3a2838 0%, #1a1420 100%)',
  },
  {
    id: 'danse-chevre',
    title: 'Danse de la chèvre',
    composer: 'Honegger',
    duration: min(4, 5),
    type: 'solo',
    thumbnail: 'linear-gradient(135deg, #402838 0%, #1e1020 100%)',
  },
  {
    id: 'sicilienne',
    title: 'Sicilienne',
    composer: 'Fauré',
    duration: min(3, 50),
    type: 'solo',
    thumbnail: 'linear-gradient(135deg, #2e1e48 0%, #140e28 100%)',
  },
  {
    id: 'fantaisie-op79',
    title: 'Fantaisie · Op. 79',
    composer: 'Fauré',
    duration: min(5, 12),
    type: 'solo',
    thumbnail: 'linear-gradient(135deg, #38284a 0%, #181028 100%)',
  },
];

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
