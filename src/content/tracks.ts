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
  },
  {
    id: 'badinerie',
    title: 'Badinerie',
    composer: 'Bach · BWV 1067',
    duration: min(1, 48),
    type: 'solo',
  },
  {
    id: 'syrinx',
    title: 'Syrinx',
    composer: 'Debussy',
    duration: min(3, 15),
    type: 'solo',
  },
  {
    id: 'suite-bmin',
    title: 'Suite no. 2 in B minor',
    composer: 'Bach',
    duration: min(6, 22),
    type: 'ensemble',
    note: 'Live ensemble',
  },
  {
    id: 'pavane',
    title: 'Pavane',
    composer: 'Fauré',
    duration: min(5, 40),
    type: 'solo',
  },
  {
    id: 'danse-chevre',
    title: 'Danse de la chèvre',
    composer: 'Honegger',
    duration: min(4, 5),
    type: 'solo',
  },
  {
    id: 'sicilienne',
    title: 'Sicilienne',
    composer: 'Fauré',
    duration: min(3, 50),
    type: 'solo',
  },
  {
    id: 'fantaisie-op79',
    title: 'Fantaisie · Op. 79',
    composer: 'Fauré',
    duration: min(5, 12),
    type: 'solo',
  },
];

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
