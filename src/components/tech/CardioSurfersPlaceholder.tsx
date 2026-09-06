import './cardio-placeholder.css';

const REPO = 'https://github.com/Jackie-Who/cardio-surfers';

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
 */
export default function CardioSurfersPlaceholder() {
  return (
    <div className="surfer-sec">
      <p className="surfer-sec-wordmark">
        Cardio<span>Surfers</span>
      </p>
      <p className="surfer-sec-tagline">Play Subway Surfers by actually running.</p>

      <p className="surfer-sec-wip">This page is a work in progress.</p>

      <div className="surfer-sec-cta">
        <p className="surfer-sec-note">grab it and try it yourself</p>

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
      </div>
    </div>
  );
}
