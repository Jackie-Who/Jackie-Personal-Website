interface Props {
  onBack: () => void;
}

export default function CreativeTopNav({ onBack }: Props) {
  return (
    <nav className="creative-nav" aria-label="Portfolio navigation">
      <button
        type="button"
        className="creative-back"
        onClick={onBack}
        aria-label="Back to hero"
      >
        <span className="creative-back-arrow" aria-hidden="true">←</span>
        <span>back</span>
      </button>
      <span className="creative-sig">Jackie</span>
    </nav>
  );
}
