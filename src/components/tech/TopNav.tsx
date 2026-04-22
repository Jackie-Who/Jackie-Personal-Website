interface Props {
  onBack?: () => void;
}

/**
 * Top bar: back button (left), "Jackie_" signature (right).
 * onBack can orchestrate a fade-out before the real navigation lands.
 * When omitted, the anchor falls back to a plain link.
 */
export default function TopNav({ onBack }: Props) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onBack) {
      e.preventDefault();
      onBack();
    }
  };

  return (
    <nav className="tech-nav" aria-label="Portfolio navigation">
      <a href="/" className="tech-back" onClick={handleClick}>
        <span className="tech-back-arrow" aria-hidden="true">←</span>
        <span>back</span>
      </a>
      <span className="tech-sig">Jackie_</span>
    </nav>
  );
}
