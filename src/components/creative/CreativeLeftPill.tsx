export type CreativeTheme = 'dark' | 'light';

interface Props {
  onBack: () => void;
  theme: CreativeTheme;
  onToggleTheme: () => void;
}

/**
 * Two floating glass buttons in the top-left corner of the creative
 * page — back pill and theme-toggle pill, rendered side-by-side but
 * separate. Sized to match the /tech page's back button for
 * cross-portfolio consistency.
 *
 * The gallery column has no header above it — these pills float
 * over it. The music column has its own in-flow header
 * (.creative-music-header).
 */
export default function CreativeLeftPill({ onBack, theme, onToggleTheme }: Props) {
  return (
    <div className="creative-left-pill-cluster" role="group" aria-label="Portfolio navigation">
      <button
        type="button"
        className="creative-back"
        onClick={onBack}
        aria-label="Back to hero"
      >
        <span className="creative-back-arrow" aria-hidden="true">←</span>
        <span>back</span>
      </button>

      <button
        type="button"
        className="creative-theme-toggle"
        onClick={onToggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? (
          /* Sun — shown while in dark mode (click → light). */
          <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
            <circle cx="10" cy="10" r="3.4" fill="currentColor" />
            <g stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
              <line x1="10" y1="2" x2="10" y2="4" />
              <line x1="10" y1="16" x2="10" y2="18" />
              <line x1="2" y1="10" x2="4" y2="10" />
              <line x1="16" y1="10" x2="18" y2="10" />
              <line x1="4.2" y1="4.2" x2="5.7" y2="5.7" />
              <line x1="14.3" y1="14.3" x2="15.8" y2="15.8" />
              <line x1="4.2" y1="15.8" x2="5.7" y2="14.3" />
              <line x1="14.3" y1="5.7" x2="15.8" y2="4.2" />
            </g>
          </svg>
        ) : (
          /* Moon — shown while in light mode (click → dark). */
          <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
            <path
              fill="currentColor"
              d="M14.2 12.2A6.8 6.8 0 0 1 6.7 3.4a7 7 0 1 0 8.8 9.5 6.7 6.7 0 0 1-1.3-.7Z"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
