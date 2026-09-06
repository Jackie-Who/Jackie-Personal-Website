import { useEffect, useRef, useState } from 'react';
import './cardio-placeholder.css';

const REPO = 'https://github.com/Jackie-Who/cardio-surfers';

/**
 * Aside scribbled above the arrow. One is picked at random each time the
 * section comes into view, so the page has a different voice on a
 * revisit. The note is right-anchored in CSS — every phrase ends at the
 * arrow's tail and grows leftward — so length never moves the arrow.
 */
const NOTE_PHRASES = [
  'yes, you actually have to run',
  'no couch mode',
  'go on, try it',
  'see if you can last',
  'try it yourself',
  'warning: real cardio',
] as const;

/** Pick a phrase that isn't the one already showing. */
function pickPhrase(current: string | null): string {
  if (NOTE_PHRASES.length < 2) return NOTE_PHRASES[0];
  let next = current;
  while (next === current) {
    next = NOTE_PHRASES[Math.floor(Math.random() * NOTE_PHRASES.length)];
  }
  return next as string;
}

/**
 * Cardio Surfers — placeholder section.
 *
 * Sits between the DiVA project and the "more projects coming soon"
 * card, and owns the /surfer URL while it's the section in view.
 *
 * Deliberately light: wordmark, one line saying it's in progress, and a
 * hand-drawn arrow curving into the CTA. The full interactive showcase
 * (live webcam pose detection, gate demo, 9:16 video) is parked on the
 * `cardio-surfers-showcase` branch until it's ready to ship.
 *
 * Arrow alignment: the SVG's head vertex sits at 87.727% of its width
 * and its tail at 4.545%. The lead block is exactly the arrow's width
 * and shifted by (50% - 87.727%), which lands the head on the button's
 * centre line. The note is then hung off the left of that block with
 * its right edge meeting the tail. Both constants live in the CSS next
 * to the rules that use them.
 */
interface Props {
  /** Bumped by TechPortfolio each time this section takes the viewport.
   *  Every change re-rolls the note. Also rolls once on mount, so a
   *  direct /surfer load never paints an empty line. */
  rollToken?: number;
}

export default function CardioSurfersPlaceholder({ rollToken = 0 }: Props = {}) {
  const phraseRef = useRef<string | null>(null);
  // Starts null so the server-rendered HTML is deterministic — picking
  // during render would desync hydration. The note fades in once a
  // phrase lands, which also masks the swap on a re-roll.
  const [phrase, setPhrase] = useState<string | null>(null);

  useEffect(() => {
    const next = pickPhrase(phraseRef.current);
    phraseRef.current = next;
    setPhrase(next);
  }, [rollToken]);

  return (
    <>
      <div className="surfer-sec">
        <p className="surfer-sec-wordmark">
          Cardio<span>Surfers</span>
        </p>
        <p className="surfer-sec-tagline">Play Subway Surfers by actually running.</p>

        <p className="surfer-sec-wip">
          <svg className="surfer-sec-warn" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 3.2 L22.4 20.6 L1.6 20.6 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M12 10.2 v3.9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="12" cy="17.4" r="1.15" fill="currentColor" />
          </svg>
          <span>This page is a work in progress.</span>
        </p>

        <div className="surfer-sec-cta">
          <div className="surfer-sec-lead">
            <p className="surfer-sec-note" data-ready={phrase ? '' : undefined}>
              {phrase ?? ' '}
            </p>
            <svg className="surfer-sec-arrow" viewBox="0 0 220 110" fill="none" aria-hidden="true">
              <path
                d="M10 14 C 66 4, 132 16, 168 52 C 182 66, 190 82, 193 98"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M177 84 L193 100 L202 78"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <a
            className="surfer-sec-btn"
            href={REPO}
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path
                fill="currentColor"
                d="M8 0C3.58 0 0 3.58 0 8a8 8 0 005.47 7.59c.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.93-.89-1.17-.89-1.17-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.67.07-.52.28-.88.51-1.08-1.78-.2-3.64-.89-3.64-3.96 0-.88.31-1.59.83-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.64 7.64 0 014 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.52.56.82 1.27.82 2.15 0 3.08-1.87 3.76-3.65 3.96.29.25.54.74.54 1.48v2.2c0 .22.15.46.55.38A8 8 0 0016 8c0-4.42-3.58-8-8-8z"
              />
            </svg>
            <span>Play the game</span>
          </a>

          {/* Platform requirement sits with the CTA, not in the footer —
              it's something you need to know before you click, not after. */}
          <p className="surfer-sec-platform">
            Windows 10/11 · not code-signed, so SmartScreen warns on first run
          </p>
        </div>
      </div>

      {/* Trademark notice pinned to the bottom of the section. */}
      <p className="surfer-sec-legal">
        Subway Surfers is a trademark of SYBO Games. Cardio Surfers is an independent
        project, not affiliated with or endorsed by SYBO — it contains no game code,
        art or assets. It reads a webcam and presses keyboard keys, and works with any
        game that takes keyboard input. © 2026 Yi Fei (Jackie) Hu · MIT licensed.
      </p>
    </>
  );
}
