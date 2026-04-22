/**
 * Short, URL-safe IDs for photos + tracks. 10-char base36.
 * ~36^10 ≈ 3.6e15 possible IDs — collision risk is negligible at
 * the scale of a personal portfolio.
 */
export function newId(prefix: 'p' | 't'): string {
  const rand = Array.from(
    typeof crypto !== 'undefined' && crypto.getRandomValues
      ? crypto.getRandomValues(new Uint8Array(6))
      : randomBytes(6),
  )
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 10);
  return `${prefix}_${rand}`;
}

function randomBytes(n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i += 1) out.push(Math.floor(Math.random() * 256));
  return out;
}
