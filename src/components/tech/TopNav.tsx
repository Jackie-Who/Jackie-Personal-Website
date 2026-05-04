interface Props {
  onBack?: () => void;
  /** Optional return-to-top handler. When provided, an up-arrow
   *  button renders next to the back pill. Mirrors the placement
   *  of the creative side's theme-toggle so the two pages feel
   *  symmetric. */
  onTop?: () => void;
}

/**
 * Top bar: back button + return-to-top arrow (left), "Jackie_"
 * signature (right). The return-to-top button mirrors the creative
 * side's icon-only square button next to the back pill — same chrome,
 * tech-tinted glass.
 */
export default function TopNav({ onBack, onTop }: Props) {
  const handleBack = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onBack) {
      e.preventDefault();
      onBack();
    }
  };

  return (
    <nav className="tech-nav" aria-label="Portfolio navigation">
      <div className="tech-nav-cluster" role="group" aria-label="Page navigation">
        <a href="/" className="tech-back" onClick={handleBack}>
          <span className="tech-back-arrow" aria-hidden="true">←</span>
          <span>back</span>
        </a>
        {onTop ? (
          <button
            type="button"
            className="tech-top-toggle"
            onClick={onTop}
            aria-label="Return to top"
            title="Return to top"
          >
            <svg viewBox="0 0 20 20" width="13" height="13" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 16V4 M5 9l5-5 5 5"
              />
            </svg>
          </button>
        ) : null}
      </div>
      <span className="tech-sig">Jackie_</span>
    </nav>
  );
}
